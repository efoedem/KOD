import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { telegramAccount } from "@/lib/telegram.functions";
import { Button } from "@/components/ui/button";
import { Send, RefreshCw, Unplug, Check } from "lucide-react";
import { toast } from "sonner";

export function TelegramAdmin() {
  const call = useServerFn(telegramAccount); const qc = useQueryClient();
  const [link, setLink] = useState<{ code?: string | undefined; username?: string | undefined }>({});
  const status = useQuery({ queryKey: ["telegram-account"], queryFn: () => call({ data: { action: "status" } }) });
  const mutation = useMutation({ mutationFn: (action: "link" | "confirm" | "disconnect") => call({ data: { action, telegramId: status.data?.account?.telegram_user_id ?? undefined } }), onSuccess: (r) => { setLink({ code: r.code, username: r.username }); void qc.invalidateQueries({ queryKey: ["telegram-account"] }); }, onError: (e: Error) => toast.error(e.message) });
  const account = status.data?.account;
  return <section className="max-w-2xl space-y-5">
    <h2 className="font-display text-xl font-semibold">Telegram</h2>
    <p className="text-sm text-muted-foreground">{account?.confirmed ? `Connected · Telegram account ${account.telegram_user_id}` : account?.telegram_user_id ? `Awaiting confirmation · Telegram account ${account.telegram_user_id}` : "Not connected"}</p>
    {status.error && <p className="text-destructive">Could not load Telegram account.</p>}
    <div className="flex flex-wrap gap-3">
      <Button disabled={mutation.isPending} onClick={() => mutation.mutate("link")}><Send className="mr-2 size-4" />{account ? "Replace link" : "Link Telegram"}</Button>
      <Button variant="outline" onClick={() => status.refetch()}><RefreshCw className="mr-2 size-4" />Refresh</Button>
      {account?.telegram_user_id && !account.confirmed && <Button disabled={mutation.isPending} onClick={() => mutation.mutate("confirm")}><Check className="mr-2 size-4" />Confirm account {account.telegram_user_id}</Button>}
      {account && <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("disconnect")}><Unplug className="mr-2 size-4" />Disconnect</Button>}
    </div>
    {link.code && <div className="space-y-3 border-t border-border py-5"><a className="text-primary underline" href={`https://t.me/${link.username}`} target="_blank" rel="noreferrer">@{link.username}</a><pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">/link {link.code}</pre><p className="text-sm text-muted-foreground">Expires in 10 minutes.</p></div>}
  </section>;
}