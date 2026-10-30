import { csvCell } from "./admin-model";

type ExportOrder = {
  order_ref: string;
  buyer_name: string;
  email: string;
  phone: string;
  school_name: string | null;
  department_name: string | null;
  level?: string | number | null;
  total: number;
  paid_at: string | null;
  payment_method: string | null;
  items: { title: string; quantity: number }[];
};

export async function exportPaidOrders(orders: ExportOrder[], format: "csv" | "xlsx") {
  const headers = [
    "Order",
    "Buyer",
    "Email",
    "Phone",
    "School",
    "Department",
    "Level",
    "Books",
    "Amount paid (GHS)",
    "Payment method",
    "Paid at",
  ];

  const rows = orders.map((o) => [
    o.order_ref ?? "",
    o.buyer_name ?? "",
    o.email ?? "",
    o.phone ?? "",
    o.school_name ?? "",
    o.department_name ?? "",
    o.level ? `Level ${o.level}` : "", // Guarantee column G is always occupied
    o.items.map((i) => `${i.title} × ${i.quantity}`).join("; "),
    Number(o.total),
    o.payment_method ?? "",
    o.paid_at ?? "",
  ]);

  let blob: Blob;

  if (format === "csv") {
    blob = new Blob(
      ["\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
  } else {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    blob = await writeXlsxFile(
      [
        headers.map((value) => ({ value, type: String, fontWeight: "bold" as const })),
        ...rows.map((row) =>
          row.map((value) =>
            typeof value === "number"
              ? { value, type: Number }
              : { value: String(value), type: String },
          ),
        ),
      ],
      { columns: headers.map(() => ({ width: 24 })) },
    );
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BookMarket-paid-orders.${format}`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
