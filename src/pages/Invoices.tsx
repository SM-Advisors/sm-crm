import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { useInvoices } from "@/hooks/useInvoices";
import type { Invoice } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "MM/dd/yyyy"); } catch { return "—"; }
}

function formatCurrency(n?: number | null) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-700 border-slate-200",
  sent:      "bg-blue-100 text-blue-700 border-blue-200",
  partial:   "bg-amber-100 text-amber-700 border-amber-200",
  paid:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  overdue:   "bg-rose-100 text-rose-700 border-rose-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Voided", value: "voided" },
];

// ─── Columns ──────────────────────────────────────────────────────────────────

function buildColumns(navigate: ReturnType<typeof useNavigate>): DataTableColumn<Invoice>[] {
  return [
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <button
          className="font-medium text-primary hover:underline text-left"
          onClick={() => navigate(`/invoices/${row.original.id}`)}
        >
          {row.original.invoice_number ?? `INV-${row.original.id.slice(0, 8)}`}
        </button>
      ),
    },
    {
      id: "company",
      header: "Company",
      accessorFn: (row) => (row as any).company?.name ?? "",
      filterMeta: { type: "text" },
      cell: ({ row }) => {
        const c = (row.original as any).company;
        if (!c) return <span className="text-muted-foreground">—</span>;
        return (
          <button
            className="hover:underline text-left"
            onClick={() => navigate(`/companies/${c.id}`)}
          >
            {c.name}
          </button>
        );
      },
    },
    {
      id: "engagement",
      header: "Engagement",
      accessorFn: (row) => (row as any).engagement?.title ?? "",
      filterMeta: { type: "text" },
      cell: ({ row }) => {
        const e = (row.original as any).engagement;
        return e?.title ?? <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "invoice_date",
      header: "Invoice Date",
      filterMeta: { type: "date" },
      cell: ({ getValue }) => formatDate(getValue() as string),
      sortingFn: "datetime",
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      filterMeta: { type: "date" },
      cell: ({ getValue }) => formatDate(getValue() as string),
      sortingFn: "datetime",
    },
    {
      accessorKey: "total",
      header: "Total",
      filterMeta: { type: "number" },
      cell: ({ getValue }) => (
        <span className="tabular-nums font-medium">
          {formatCurrency(getValue() as number)}
        </span>
      ),
    },
    {
      accessorKey: "amount_paid",
      header: "Paid",
      filterMeta: { type: "number" },
      cell: ({ getValue }) => (
        <span className="tabular-nums">{formatCurrency(getValue() as number)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      filterMeta: { type: "select", options: statusOptions },
      cell: ({ getValue }) => {
        const s = getValue() as string;
        const cls = STATUS_COLORS[s] ?? "";
        return (
          <Badge variant="outline" className={`text-xs capitalize ${cls}`}>
            {s}
          </Badge>
        );
      },
    },
    {
      id: "balance",
      header: "Balance",
      accessorFn: (row) => (row.total ?? 0) - (row.amount_paid ?? 0),
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return (
          <span className={`tabular-nums ${v > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {formatCurrency(v)}
          </span>
        );
      },
    },
  ];
}

// ─── Export mapper ────────────────────────────────────────────────────────────

function toExportRow(inv: Invoice): Record<string, unknown> {
  return {
    "Invoice #": inv.invoice_number ?? "",
    Company: (inv as any).company?.name ?? "",
    Engagement: (inv as any).engagement?.title ?? "",
    Date: formatDate(inv.invoice_date),
    Due: formatDate(inv.due_date),
    Total: inv.total ?? 0,
    Paid: inv.amount_paid ?? 0,
    Balance: (inv.total ?? 0) - (inv.amount_paid ?? 0),
    Status: inv.status ?? "",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading } = useInvoices();
  const columns = useMemo(() => buildColumns(navigate), [navigate]);

  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "voided")
    .reduce((sum, i) => sum + ((i.total ?? 0) - (i.amount_paid ?? 0)), 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading…"
              : `${invoices.length} invoices · $${totalOutstanding.toLocaleString()} outstanding`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading invoices…
        </div>
      ) : (
        <DataTable
          data={invoices}
          columns={columns}
          exportName="invoices"
          toExportRow={toExportRow}
          searchPlaceholder="Search invoices…"
        />
      )}
    </div>
  );
}
