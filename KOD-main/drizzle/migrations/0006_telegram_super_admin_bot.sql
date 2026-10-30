CREATE TABLE public.telegram_admin_links (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 code_hash text, code_expires_at timestamptz,
 telegram_user_id bigint UNIQUE, chat_id bigint, confirmed boolean NOT NULL DEFAULT false,
 pending_action jsonb, pending_token text, pending_expires_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_admin_links TO authenticated;
GRANT ALL ON public.telegram_admin_links TO service_role;
ALTER TABLE public.telegram_admin_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY telegram_link_owner ON public.telegram_admin_links TO authenticated USING (user_id = auth.uid() AND public.has_role(auth.uid(),'super_admin')) WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(),'super_admin'));
CREATE TABLE public.telegram_bot_updates (update_id bigint PRIMARY KEY, reply text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.telegram_bot_updates TO service_role;
ALTER TABLE public.telegram_bot_updates ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.site_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), site_url text NOT NULL DEFAULT 'https://shellbooks.app', support_email text NOT NULL DEFAULT 'support@shellbooks.com', support_phone text NOT NULL DEFAULT '+233 55 835 9314');
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_public_read ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY settings_super_insert ON public.site_settings FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY settings_super_update ON public.site_settings FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE FUNCTION public.telegram_bot_action(_update bigint, _telegram bigint, _chat bigint, _action jsonb) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor uuid; result text; kind text := _action->>'kind'; payload jsonb := _action->'data'; rows jsonb; link public.telegram_admin_links; target uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(_update);
 SELECT reply INTO result FROM public.telegram_bot_updates WHERE update_id = _update;
 IF FOUND THEN RETURN result; END IF;
 IF kind = 'link' THEN
  UPDATE public.telegram_admin_links SET telegram_user_id=_telegram,chat_id=_chat,confirmed=false,code_hash=null,code_expires_at=null WHERE code_hash=_action->>'hash' AND code_expires_at>now() AND public.has_role(user_id,'super_admin') RETURNING user_id INTO actor;
  result := CASE WHEN actor IS NULL THEN 'Invalid or expired link code.' ELSE 'Link requested. Confirm your Telegram account on the BookMarket super-admin page.' END;
 ELSE
  SELECT * INTO link FROM public.telegram_admin_links WHERE telegram_user_id=_telegram AND chat_id=_chat AND confirmed;
  actor := link.user_id;
  IF actor IS NULL OR NOT public.has_role(actor,'super_admin') THEN result := 'Super-admin access required. Link and confirm your account in BookMarket.';
  ELSE
   PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
   IF kind='stage' THEN
    UPDATE public.telegram_admin_links SET pending_action=payload,pending_token=_action->>'token',pending_expires_at=now()+interval '5 minutes' WHERE user_id=actor;
    result := 'Confirm this change: '||(_action->>'description')||E'\n/confirm '||(_action->>'token');
   ELSE
    IF kind='confirm' THEN
     IF link.pending_token IS DISTINCT FROM _action->>'token' OR link.pending_expires_at IS NULL OR link.pending_expires_at<=now() THEN
      result := 'Invalid or expired confirmation.';
     ELSE
      kind := link.pending_action->>'kind'; payload := link.pending_action->'data';
      UPDATE public.telegram_admin_links SET pending_action=null,pending_token=null,pending_expires_at=null WHERE user_id=actor;
     END IF;
    ELSIF kind NOT IN ('help','summary','books','schools','departments','orders','admins','settings') THEN
     RAISE EXCEPTION 'Changes require confirmation';
    END IF;
    IF result IS NULL THEN
     CASE kind
     WHEN 'help' THEN result := E'BookMarket super admin\n/summary\n/books [search]\n/schools\n/departments [school UUID]\n/orders\n/admins\n/settings\n/book {"title":"...","author":"...","departmentId":"UUID","level":"300","price":50,"stock":25} (optional id to edit)\n/hide BOOK_UUID\n/fulfill ORDER_UUID\n/invite email@example.com\n/revoke USER_UUID\n/setting support_email value\n/setting support_phone value\n/setting site_url https://shellbooks.app\n/cancel';
     WHEN 'summary' THEN SELECT jsonb_build_object('books',(SELECT count(*) FROM books),'orders',count(*),'paid_orders',count(*) FILTER(WHERE payment_status='PAID'),'paid_GHS',coalesce(sum(total) FILTER(WHERE payment_status='PAID'),0))::text INTO result FROM orders;
     WHEN 'books' THEN SELECT coalesce(jsonb_agg(t),'[]')::text INTO result FROM (SELECT id,title,author,price,stock,is_active,department_id,level FROM books WHERE title ILIKE '%'||coalesce(payload->>'search','')||'%' ORDER BY title LIMIT 12)t;
     WHEN 'schools' THEN SELECT coalesce(jsonb_agg(t),'[]')::text INTO result FROM (SELECT id,name FROM schools ORDER BY name LIMIT 30)t;
     WHEN 'departments' THEN SELECT coalesce(jsonb_agg(t),'[]')::text INTO result FROM (SELECT id,name,school_id FROM departments WHERE payload->>'schoolId' IS NULL OR school_id=(payload->>'schoolId')::uuid ORDER BY name LIMIT 30)t;
     WHEN 'orders' THEN SELECT coalesce(jsonb_agg(t),'[]')::text INTO result FROM (SELECT id,order_ref,buyer_name,payment_status,status,total FROM orders ORDER BY created_at DESC LIMIT 12)t;
     WHEN 'admins' THEN SELECT coalesce(jsonb_agg(t),'[]')::text INTO result FROM (SELECT p.id,p.full_name,p.email,p.phone,r.role FROM profiles p JOIN user_roles r ON r.user_id=p.id WHERE r.role IN ('admin','super_admin') ORDER BY p.full_name LIMIT 20)t;
     WHEN 'settings' THEN SELECT row_to_json(t)::text INTO result FROM (SELECT site_url,support_email,support_phone FROM site_settings WHERE id)t; result:=coalesce(result,'{"site_url":"https://shellbooks.app","support_email":"support@shellbooks.com","support_phone":"+233 55 835 9314"}');
     WHEN 'book' THEN
      IF length(payload->>'title') NOT BETWEEN 2 AND 200 OR length(payload->>'author') NOT BETWEEN 2 AND 150 OR payload->>'level' NOT IN ('100','200','300','400','500','600') OR (payload->>'price')::numeric<0 OR (payload->>'stock')::int<0 THEN RAISE EXCEPTION 'Invalid book'; END IF;
      IF payload->>'id' IS NULL THEN INSERT INTO books(title,author,department_id,level,price,stock,uploaded_by) VALUES(payload->>'title',payload->>'author',(payload->>'departmentId')::uuid,payload->>'level',(payload->>'price')::numeric,(payload->>'stock')::int,actor) RETURNING id INTO target;
      ELSE UPDATE books SET title=payload->>'title',author=payload->>'author',department_id=(payload->>'departmentId')::uuid,level=payload->>'level',price=(payload->>'price')::numeric,stock=(payload->>'stock')::int WHERE id=(payload->>'id')::uuid RETURNING id INTO target; END IF;
      IF target IS NULL THEN RAISE EXCEPTION 'Book not found'; END IF; result:='Book saved: '||target;
     WHEN 'hide' THEN UPDATE books SET is_active=false WHERE id=(payload->>'id')::uuid RETURNING id INTO target; IF target IS NULL THEN RAISE EXCEPTION 'Book not found'; END IF; result:='Book hidden from students.';
     WHEN 'fulfill' THEN UPDATE orders SET status='FULFILLED' WHERE id=(payload->>'id')::uuid AND payment_status='PAID' RETURNING id INTO target; IF target IS NULL THEN RAISE EXCEPTION 'Only a paid order can be fulfilled'; END IF; result:='Paid order fulfilled. Payment status unchanged.';
     WHEN 'invite' THEN result := public.add_book_admin(payload->>'email');
     WHEN 'revoke' THEN target:=(payload->>'id')::uuid; IF public.has_role(target,'super_admin') THEN RAISE EXCEPTION 'Cannot revoke super admin'; END IF; DELETE FROM admin_invitations WHERE accepted_by=target; DELETE FROM user_roles WHERE user_id=target AND role='admin'; result:='Seller admin access revoked.';
     WHEN 'setting' THEN
      INSERT INTO site_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
      CASE payload->>'key'
       WHEN 'site_url' THEN IF payload->>'value' !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?/?$' THEN RAISE EXCEPTION 'Invalid HTTPS site address'; END IF; UPDATE site_settings SET site_url=payload->>'value' WHERE id;
       WHEN 'support_email' THEN IF payload->>'value' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF; UPDATE site_settings SET support_email=payload->>'value' WHERE id;
       WHEN 'support_phone' THEN IF length(payload->>'value') NOT BETWEEN 9 AND 30 THEN RAISE EXCEPTION 'Invalid phone'; END IF; UPDATE site_settings SET support_phone=payload->>'value' WHERE id;
       ELSE RAISE EXCEPTION 'Unknown setting';
      END CASE; result:='Site setting saved.';
     WHEN 'cancel' THEN UPDATE public.telegram_admin_links SET pending_action=null,pending_token=null,pending_expires_at=null WHERE user_id=actor; result:='Pending change cancelled.';
     ELSE result:='Invalid or expired confirmation.';
     END CASE;
    END IF;
   END IF;
  END IF;
 END IF;
 INSERT INTO public.telegram_bot_updates(update_id,reply) VALUES(_update,left(coalesce(result,'Done.'),3500));
 RETURN left(coalesce(result,'Done.'),3500);
END $$;
REVOKE ALL ON FUNCTION public.telegram_bot_action(bigint,bigint,bigint,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_bot_action(bigint,bigint,bigint,jsonb) TO service_role;