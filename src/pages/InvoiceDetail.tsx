import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvoice } from "@/hooks/useInvoices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "MMMM d, yyyy"); } catch { return "—"; }
}

function formatCurrency(n?: number | null) {
  if (n == null) return "$0.00";
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading, isError } = useInvoice(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading invoice…
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="outline" onClick={() => navigate("/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const lineItems = (invoice as any).line_items ?? [];
  const payments = (invoice as any).payments ?? [];
  const amountPaid = (invoice.total_amount ?? 0) - (invoice.balance_due ?? 0);
  const balance = invoice.balance_due ?? 0;
  const statusCls = STATUS_COLORS[invoice.status ?? ""] ?? "";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
            onClick={() => navigate("/invoices")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Invoices
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {invoice.invoice_number ?? `INV-${invoice.id.slice(0, 8)}`}
          </h1>
        </div>
        <Badge variant="outline" className={`text-sm capitalize ${statusCls}`}>
          {invoice.status}
        </Badge>
      </div>

      {/* Top metadata cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Company</p>
            <button
              className="text-sm font-medium mt-1 hover:underline text-primary text-left"
              onClick={() => navigate(`/companies/${(invoice as any).company?.id}`)}
            >
              {(invoice as any).company?.name ?? "—"}
            </button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Engagement</p>
            <p className="text-sm font-medium mt-1">
              {(invoice as any).engagement?.title ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice Date</p>
            <p className="text-sm font-medium mt-1">{formatDate(invoice.invoice_date)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</p>
            <p className="text-sm font-medium mt-1">{formatDate(invoice.due_date)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.length > 0 ? (
                lineItems.map((li: any) => (
                  <TableRow key={li.id}>
                    <TableCell>{li.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{li.quantity ?? 1}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.unit_price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(li.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-16">
                    No line items.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals + payments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{formatDate(p.payment_date)}</p>
                      {p.method && (
                        <p className="text-xs text-muted-foreground capitalize">{p.method}</p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-emerald-600">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-emerald-600">{formatCurrency(amountPaid)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Balance Due</span>
                <span className={balance > 0 ? "text-rose-600" : "text-emerald-600"}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QB link if present */}
      {invoice.qb_invoice_url && (
        <a
          href={invoice.qb_invoice_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View in QuickBooks
        </a>
      )}
    </div>
  );
}
