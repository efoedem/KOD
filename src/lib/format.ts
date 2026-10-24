export const LEVELS = ["100", "200", "300", "400", "500", "600"] as const;

export function cedis(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `GH₵ ${value.toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const SUPPORT_EMAIL = "support@shellbooks.app";
export const SUPPORT_PHONE = "+233 55 835 9314";
