import { describe, it, expect } from "vitest";
import { parseBotCommand, privateSender } from "../lib/telegram-model";
describe("Telegram super-admin command rules", () => {
  it("rejects group chats even for the same sender", () => { expect(privateSender(10, 10, "group")).toBe(false); expect(privateSender(10, 10, "private")).toBe(true); expect(privateSender(11, 10, "private")).toBe(false); });
  it("stages admin invitations rather than granting directly", () => { expect(parseBotCommand("/invite seller@example.com")).toMatchObject({ kind: "stage", data: { kind: "invite", data: { email: "seller@example.com" } } }); });
  it("does not permit paid-status commands", () => { expect(parseBotCommand("/paid 123")).toEqual({ kind: "help" }); });
  it("requires a concrete confirmation token", () => { expect(() => parseBotCommand("/confirm yes")).toThrow(); expect(parseBotCommand("/confirm abcdef123456abcdef123456").token).toBe("abcdef123456abcdef123456"); });
  it("allows the supplied HTTPS site but not unsafe addresses", () => { expect(parseBotCommand("/setting site_url https://shellbooks.app")).toMatchObject({ kind: "stage" }); expect(() => parseBotCommand("/setting site_url javascript:alert(1)")).toThrow(); });
});