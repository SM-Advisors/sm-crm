import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  ArrowLeft,
  Building2,
  User,
  DollarSign,
  Calendar,
  AlertTriangle,
  FileText,
  Briefcase,
  CheckCircle2,
  Send,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSalesDeal, useUpdateSalesDeal } from "@/hooks/useDeals";
import { SALES_STAGE_LABELS, INTERACTION_TYPE_LABELS } from "@/types";
import type { SalesStage, SalesDeal } from "@/types";
import { toast } from "sonner";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "MMM d, yyyy"); } catch { return "—"; }
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "MMM d, yyyy h:mm a"); } catch { return "—"; }
}

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  none: "No Contract",
  sent: "Contract Sent",
  countersigned: "Countersigned",
  fulfilled: "Fulfilled",
};

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading, isError } = useSalesDeal(id!);
  const updateDeal = useUpdateSalesDeal();

  const [editingContract, setEditingContract] = useState(false);
  const [contractForm, setContractForm] = useState({
    contract_sent_date: "",
    countersigned_date: "",
    contract_status: "none" as string,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading deal…
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Deal not found.</p>
        <Button variant="outline" onClick={() => navigate("/sales-pipeline")}>
          Back to Pipeline
        </Button>
      </div>
    );
  }

  const interactions = deal.interactions ?? [];
  const invoices = deal.invoices ?? [];
  const meetings = interactions.filter((i) => i.type === "meeting");
  const contactName = deal.contact
    ? [deal.contact.first_name, deal.contact.last_name].filter(Boolean).join(" ")
    : null;

  const isOverdue =
    deal.expected_close_date &&
    new Date(deal.expected_close_date) < new Date() &&
    !["closed_won", "closed_lost", "service_complete"].includes(deal.stage);

  const contractStatus = deal.contract_status ?? "none";

  // Notification logic
  const contractWarning =
    contractStatus === "sent" &&
    deal.contract_sent_date &&
    differenceInDays(new Date(), new Date(deal.contract_sent_date)) > 7;

  const lastInteractionDate = interactions.length > 0
    ? new Date(interactions[0].occurred_at)
    : null;
  const staleContract =
    contractStatus === "countersigned" &&
    lastInteractionDate &&
    differenceInDays(new Date(), lastInteractionDate) > 45;

  // Invoice totals
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + ((i.total_amount ?? 0) - (i.balance_due ?? 0)), 0);
  const totalBalance = invoices.reduce((s, i) => s + (i.balance_due ?? 0), 0);

  function openContractEdit() {
    setContractForm({
      contract_sent_date: deal.contract_sent_date ?? "",
      countersigned_date: deal.countersigned_date ?? "",
      contract_status: deal.contract_status ?? "none",
    });
    setEditingContract(true);
  }

  function saveContract() {
    updateDeal.mutate(
      {
        id: deal.id,
        contract_sent_date: contractForm.contract_sent_date || null,
        countersigned_date: contractForm.countersigned_date || null,
        contract_status: contractForm.contract_status as SalesDeal["contract_status"],
      } as Parameters<typeof updateDeal.mutate>[0],
      {
        onSuccess: () => {
          toast.success("Contract tracking updated");
          setEditingContract(false);
        },
        onError: () => toast.error("Failed to update"),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          onClick={() => navigate("/sales-pipeline")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sales Pipeline
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{deal.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge
                variant="secondary"
                className="capitalize"
              >
                {SALES_STAGE_LABELS[deal.stage as keyof typeof SALES_STAGE_LABELS] ?? deal.stage}
              </Badge>
              {deal.probability != null && (
                <span className="text-sm text-muted-foreground">
                  {deal.probability}% likely
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {(isOverdue || contractWarning || staleContract) && (
        <div className="flex flex-col gap-2">
          {isOverdue && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Follow-up date ({fmtDate(deal.expected_close_date)}) has passed — this deal needs follow-up.
            </div>
          )}
          {contractWarning && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Contract sent {differenceInDays(new Date(), new Date(deal.contract_sent_date!))} days ago with no countersigned copy received.
            </div>
          )}
          {staleContract && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
              <Clock className="h-4 w-4 shrink-0" />
              Signed contract has had no activity in {differenceInDays(new Date(), lastInteractionDate!)} days and terms are not yet fulfilled.
            </div>
          )}
        </div>
      )}

      {/* Info cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deal Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deal Info</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {deal.value != null && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-semibold">${deal.value.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Follow Up Date</p>
                <p className={`text-sm ${isOverdue ? "text-orange-600 font-medium" : ""}`}>
                  {fmtDate(deal.expected_close_date)}
                </p>
              </div>
            </div>
            {deal.description && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap">{deal.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company & Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">People</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {deal.company && (
              <button
                className="flex items-center gap-2 text-sm hover:underline text-left"
                onClick={() => navigate(`/companies/${deal.company!.id}`)}
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {deal.company.name}
              </button>
            )}
            {contactName && (
              <button
                className="flex items-center gap-2 text-sm hover:underline text-left"
                onClick={() => navigate(`/contacts/${deal.contact!.id}`)}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                {contactName}
              </button>
            )}
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-1">Meetings</p>
              <p className="text-sm font-medium">{meetings.length} meeting{meetings.length !== 1 ? "s" : ""}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contract Tracking */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contract Tracking</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={openContractEdit}>
              Edit
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {contractStatus === "fulfilled" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : contractStatus === "countersigned" ? (
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              ) : contractStatus === "sent" ? (
                <Send className="h-4 w-4 text-violet-500" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge variant="outline" className="capitalize">
                {CONTRACT_STATUS_LABELS[contractStatus] ?? contractStatus}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contract Sent</p>
              <p className="text-sm">{fmtDate(deal.contract_sent_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Countersigned</p>
              <p className="text-sm">{fmtDate(deal.countersigned_date)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Edit Dialog (inline) */}
      {editingContract && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Edit Contract Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={contractForm.contract_status} onValueChange={(v) => setContractForm((f) => ({ ...f, contract_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Contract</SelectItem>
                    <SelectItem value="sent">Contract Sent</SelectItem>
                    <SelectItem value="countersigned">Countersigned</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date Sent</Label>
                <Input
                  type="date"
                  value={contractForm.contract_sent_date}
                  onChange={(e) => setContractForm((f) => ({ ...f, contract_sent_date: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date Countersigned</Label>
                <Input
                  type="date"
                  value={contractForm.countersigned_date}
                  onChange={(e) => setContractForm((f) => ({ ...f, countersigned_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={saveContract} disabled={updateDeal.isPending}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingContract(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Linked Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices linked to this deal.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total Invoiced</p>
                  <p className="text-lg font-semibold">${totalInvoiced.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-semibold text-emerald-600">${totalPaid.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="text-lg font-semibold text-orange-600">${totalBalance.toLocaleString()}</p>
                </div>
              </div>
              {deal.value != null && deal.value > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Billing Progress</span>
                    <span>{Math.round((totalInvoiced / deal.value) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded bg-muted overflow-hidden">
                    <div
                      className="h-2 rounded bg-primary"
                      style={{ width: `${Math.min(100, (totalInvoiced / deal.value) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 font-medium">Invoice #</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-right p-2 font-medium">Total</th>
                      <th className="text-right p-2 font-medium">Paid</th>
                      <th className="text-right p-2 font-medium">Balance</th>
                      <th className="text-left p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        <td className="p-2 text-primary">{inv.invoice_number ?? "—"}</td>
                        <td className="p-2">{fmtDate(inv.invoice_date)}</td>
                        <td className="p-2 text-right">${(inv.total_amount ?? 0).toLocaleString()}</td>
                        <td className="p-2 text-right">${((inv.total_amount ?? 0) - (inv.balance_due ?? 0)).toLocaleString()}</td>
                        <td className="p-2 text-right">${(inv.balance_due ?? 0).toLocaleString()}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs capitalize">{inv.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Recent Activity ({interactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interactions recorded.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {interactions.slice(0, 15).map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {INTERACTION_TYPE_LABELS[item.type as keyof typeof INTERACTION_TYPE_LABELS] ?? item.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    {item.subject && <p className="text-sm font-medium truncate">{item.subject}</p>}
                    {item.summary && <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {fmtDateTime(item.occurred_at)}
                  </span>
                </div>
              ))}
              {interactions.length > 15 && (
                <p className="text-xs text-muted-foreground text-center">
                  …and {interactions.length - 15} more interactions
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
