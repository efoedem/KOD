ALTER TABLE public.books ADD COLUMN uploaded_by uuid;
ALTER TABLE public.order_items ADD COLUMN seller_id uuid;
UPDATE public.books SET uploaded_by = (SELECT id FROM auth.users WHERE lower(email) = 'edemofficial@gmail.com' AND email_confirmed_at IS NOT NULL LIMIT 1);
UPDATE public.order_items i SET seller_id = b.uploaded_by FROM public.books b WHERE b.id = i.book_id;
CREATE INDEX books_uploaded_by_idx ON public.books(uploaded_by);
CREATE INDEX order_items_seller_idx ON public.order_items(seller_id);
CREATE TABLE public.admin_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, full_name text, phone text,
 school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
 department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
 created_by uuid NOT NULL, accepted_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_invitations TO authenticated;
GRANT ALL ON public.admin_invitations TO service_role;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin invitations" ON public.admin_invitations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE OR REPLACE FUNCTION public.grant_owner_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.email_confirmed_at IS NOT NULL THEN
  IF lower(NEW.email) = 'edemofficial@gmail.com' THEN
   INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'super_admin'), (NEW.id, 'admin') ON CONFLICT DO NOTHING;
   UPDATE public.books SET uploaded_by = NEW.id WHERE uploaded_by IS NULL;
   UPDATE public.order_items SET seller_id = NEW.id WHERE seller_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.admin_invitations WHERE email = lower(NEW.email)) THEN
   INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
   UPDATE public.admin_invitations SET accepted_by = NEW.id WHERE email = lower(NEW.email);
  END IF;
 END IF;
 RETURN NEW;
END; $$;
DROP POLICY "schools admin write" ON public.schools;
CREATE POLICY "schools super write" ON public.schools FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
DROP POLICY "departments admin write" ON public.departments;
CREATE POLICY "departments super write" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
DROP POLICY "books admin write" ON public.books;
DROP POLICY "books public read" ON public.books;
CREATE POLICY "books active read" ON public.books FOR SELECT USING (is_active);
CREATE POLICY "books seller manage" ON public.books FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR (uploaded_by = auth.uid() AND public.has_role(auth.uid(), 'admin'))) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR (uploaded_by = auth.uid() AND public.has_role(auth.uid(), 'admin')));
CREATE FUNCTION public.protect_book_owner() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
 IF TG_OP = 'UPDATE' AND NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Book ownership cannot be changed'; END IF;
 IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN NEW.uploaded_by := auth.uid(); END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER protect_book_owner BEFORE INSERT OR UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.protect_book_owner();
CREATE FUNCTION public.snapshot_item_seller() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
 SELECT uploaded_by INTO NEW.seller_id FROM public.books WHERE id = NEW.book_id;
 RETURN NEW; END; $$;
CREATE TRIGGER snapshot_item_seller BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.snapshot_item_seller();
DROP POLICY "profiles read own" ON public.profiles;
CREATE POLICY "profiles read own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY "orders read own" ON public.orders;
CREATE POLICY "orders read own" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY "orders update own" ON public.orders;
CREATE POLICY "orders update own" ON public.orders FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY "order items read own" ON public.order_items;
CREATE POLICY "order items read own" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))));
CREATE POLICY "super reads roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE FUNCTION public.admin_sales() RETURNS TABLE(id uuid, order_ref text, buyer_name text, email text, phone text, school_name text, department_name text, level text, status text, payment_status text, payment_method text, created_at timestamptz, paid_at timestamptz, total numeric, items jsonb) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT o.id,o.order_ref,o.buyer_name,o.email,o.phone,o.school_name,o.department_name,o.level,o.status,o.payment_status,o.payment_method,o.created_at,o.paid_at,
 CASE WHEN public.has_role(auth.uid(),'super_admin') THEN o.total ELSE sum(i.unit_price*i.quantity) END,
 jsonb_agg(jsonb_build_object('title',i.title,'quantity',i.quantity,'unit_price',i.unit_price,'seller_id',i.seller_id))
 FROM public.orders o JOIN public.order_items i ON i.order_id=o.id
 WHERE public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'admin') AND i.seller_id=auth.uid())
 GROUP BY o.id ORDER BY o.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_sales() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_sales() TO authenticated;
CREATE FUNCTION public.add_book_admin(_email text, _name text DEFAULT NULL, _phone text DEFAULT NULL, _school uuid DEFAULT NULL, _department uuid DEFAULT NULL) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Super admin access required'; END IF;
 IF _email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'Enter a valid email'; END IF;
 IF _department IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.departments WHERE id=_department AND school_id=_school) THEN RAISE EXCEPTION 'Choose a department in the selected school'; END IF;
 SELECT id INTO target FROM auth.users WHERE lower(email)=lower(trim(_email)) AND email_confirmed_at IS NOT NULL;
 INSERT INTO public.admin_invitations(email,full_name,phone,school_id,department_id,created_by,accepted_by) VALUES(lower(trim(_email)),nullif(trim(_name),''),nullif(trim(_phone),''),_school,_department,auth.uid(),target)
 ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name,phone=excluded.phone,school_id=excluded.school_id,department_id=excluded.department_id,accepted_by=excluded.accepted_by;
 IF target IS NOT NULL THEN INSERT INTO public.user_roles(user_id,role) VALUES(target,'admin') ON CONFLICT DO NOTHING; RETURN 'active'; END IF;
 RETURN 'pending';
END; $$;
REVOKE ALL ON FUNCTION public.add_book_admin(text,text,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_book_admin(text,text,text,uuid,uuid) TO authenticated;