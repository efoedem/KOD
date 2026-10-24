import { z } from "zod";

const uuid = z.string().uuid();
const book = z.object({ id: uuid.optional(), title: z.string().trim().min(2).max(200), author: z.string().trim().min(2).max(150), departmentId: uuid, level: z.enum(["100", "200", "300", "400", "500", "600"]), price: z.number().finite().min(0).max(1000000), stock: z.number().int().min(0).max(1000000) }).strict();
export const updateSchema = z.object({ update_id: z.number().int().nonnegative().safe(), message: z.object({ chat: z.object({ id: z.number().int().safe(), type: z.string() }), from: z.object({ id: z.number().int().positive().safe(), is_bot: z.boolean().optional() }), text: z.string().max(4096).optional() }).optional() });
export type BotAction = { kind: string; data?: Record<string, unknown>; token?: string; description?: string; hash?: string };
export function parseBotCommand(text: string): BotAction {
  const match = /^\/([a-z]+)(?:@[a-zA-Z0-9_]+)?(?:\s+([\s\S]*))?$/.exec(text.trim());
  if (!match) return { kind: "help" };
  const cmd = match[1] ?? "help"; const value = (match[2] ?? "").trim();
  if (["help", "start", "summary", "orders", "admins", "schools", "settings"].includes(cmd)) return { kind: cmd === "start" ? "help" : cmd };
  if (cmd === "books") return { kind: cmd, data: { search: z.string().max(200).parse(value) } };
  if (cmd === "departments") return { kind: cmd, data: value ? { schoolId: uuid.parse(value) } : {} };
  if (cmd === "confirm") return { kind: cmd, token: z.string().regex(/^[a-f0-9]{24}$/).parse(value) };
  let data: Record<string, unknown>;
  if (cmd === "book") data = book.parse(JSON.parse(value));
  else if (["hide", "fulfill", "revoke"].includes(cmd)) data = { id: uuid.parse(value) };
  else if (cmd === "invite") data = { email: z.string().email().max(255).parse(value.toLowerCase()) };
  else if (cmd === "setting") {
    const split = value.indexOf(" ");
    const key = z.enum(["site_url", "support_email", "support_phone"]).parse(value.slice(0, split));
    const v = z.string().trim().min(1).max(255).parse(value.slice(split + 1));
    if (key === "site_url") z.string().regex(/^https:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?\/?$/).parse(v);
    if (key === "support_email") z.string().email().parse(v);
    if (key === "support_phone") z.string().regex(/^[+0-9()\s-]{9,30}$/).parse(v);
    data = { key, value: v };
  } else if (cmd === "cancel") data = {};
  else return { kind: "help" };
  return { kind: "stage", data: { kind: cmd, data }, description: `${cmd}: ${JSON.stringify(data)}` };
}
export function privateSender(chatId: number, senderId: number, type: string) { return type === "private" && chatId === senderId; }