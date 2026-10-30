export type SaleItem = { title: string; quantity: number; unit_price: number; seller_id: string | null };
export function saleItems(value: unknown): SaleItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is SaleItem => Boolean(v && typeof v === 'object' && typeof v.title === 'string'));
}
export function salesSummary(orders: { id: string; total: number; payment_status: string }[]) {
  return { totalOrders: orders.length, paidOrders: orders.filter(o => o.payment_status === 'PAID').length,
    amountPaid: orders.filter(o => o.payment_status === 'PAID').reduce((n,o) => n + Number(o.total), 0) };
}
export function csvCell(value: unknown) {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}