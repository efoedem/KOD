import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const telegramAccount = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ action: z.enum(["status", "link", "confirm", "disconnect"]), telegramId: z.number().int().positive().safe().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: roles, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (error || !roles?.some(r => r.role === "super_admin")) throw new Error("Super-admin access required.");
    const db = context.supabase;
    if (data.action === "disconnect") { const r = await db.from("telegram_admin_links").delete().eq("user_id", context.userId); if (r.error) throw new Error("Could not disconnect Telegram."); }
    if (data.action === "confirm") {
      if (!data.telegramId) throw new Error("Check the Telegram account first.");
      const r = await db.from("telegram_admin_links").update({ confirmed: true }).eq("user_id", context.userId).eq("telegram_user_id", data.telegramId).select("user_id").single();
      if (r.error) throw new Error("Telegram account changed. Reload and try again.");
    }
    let code: string | undefined; let username: string | undefined;
    if (data.action === "link") {
      const bot = await import("@/lib/telegram.server");
      username = (await bot.telegramCall("getMe", {}))?.username;
      code = bot.randomCode();
      const r = await db.from("telegram_admin_links").upsert({ user_id: context.userId, code_hash: await bot.hashText(code), code_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), telegram_user_id: null, chat_id: null, confirmed: false, pending_action: null, pending_token: null, pending_expires_at: null });
      if (r.error) throw new Error("Could not create Telegram link.");
    }
    const r = await db.from("telegram_admin_links").select("telegram_user_id, confirmed").eq("user_id", context.userId).maybeSingle();
    if (r.error) throw new Error("Could not load Telegram account.");
    return { account: r.data, code, username };
  });