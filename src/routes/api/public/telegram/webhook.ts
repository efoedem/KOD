import { createFileRoute } from "@tanstack/react-router";
import { parseBotCommand, privateSender, updateSchema } from "@/lib/telegram-model";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/telegram/webhook")({ server: { handlers: { POST: async ({ request }) => {
  const key = process.env["TELEGRAM_API_KEY"];
  if (!key) return new Response("Not configured", { status: 503 });
  const bot = await import("@/lib/telegram.server");
  if (!bot.sameSecret(request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "", await bot.webhookSecret(key))) return new Response("Unauthorized", { status: 401 });
  const raw = await request.text();
  if (raw.length > 16384) return new Response("Too large", { status: 413 });
  let input: unknown; try { input = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return new Response("Invalid update", { status: 400 });
  const update = parsed.data; const message = update.message;
  if (!message?.text || message.from.is_bot || !privateSender(message.chat.id, message.from.id, message.chat.type)) return Response.json({ ok: true });
  try {
    let action;
    const link = /^\/link\s+([a-f0-9]{24})$/.exec(message.text.trim());
    try { action = link?.[1] ? { kind: "link", hash: await bot.hashText(link[1] ?? "") } : parseBotCommand(message.text); } catch { await bot.telegramCall("sendMessage", { chat_id: message.chat.id, text: "Invalid command details. Use /help for accepted formats." }); return Response.json({ ok: true }); }
    if (action.kind === "stage") action.token = bot.randomCode();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("telegram_bot_action", { _update: update.update_id, _telegram: message.from.id, _chat: message.chat.id, _action: action as Json });
    if (result.error) {
      console.error("Telegram action failed", result.error.code);
      await bot.telegramCall("sendMessage", { chat_id: message.chat.id, text: "The change could not be completed. Check the record and command details; payments cannot be changed here." });
    } else await bot.telegramCall("sendMessage", { chat_id: message.chat.id, text: result.data });
    return Response.json({ ok: true });
  } catch (error) { console.error("Telegram webhook delivery failed", error); return new Response("Delivery failed", { status: 500 }); }
} } } });