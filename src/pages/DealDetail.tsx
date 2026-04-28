import { useState, useMemo, useEffect } from "react";
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
  Pencil,
  Plus,
  ExternalLink,
  Folder,
  Trash2,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useSalesDeal, useUpdateSalesDeal } from "@/hooks/useDeals";
import { useCompanies } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { useInvoices } from "@/hooks/useInvoices";
import { supabase } from "@/lib/supabase";
import { SALES_STAGE_LABELS, INTERACTION_TYPE_LABELS } from "@/types";
import type { SalesStage, SalesDeal, Invoice } from "@/types";
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
  const qc = useQueryClient();
  const { data: deal, isLoading, isError } = useSalesDeal(id!);
  const updateDeal = useUpdateSalesDeal();
  const { data: companies = [] } = useCompanies();
  const { data: allContacts = [] } = useContacts();
  const { data: allInvoices = [] } = useInvoices();

  const [editOpen, setEditOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(false);
  const [contractForm, setContractForm] = useState({
    contract_sent_date: "",
    countersigned_date: "",
    contract_status: "none" as string,
  });

  // Files
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    { id: string; name: string; created_at: string; url: string }[]
  >([]);

  // Document links for this deal
  const [docLinks, setDocLinks] = useState<{ id: string; title: string; url: string }[]>([]);

  // Invoice linking
  const [linkInvoiceOpen, setLinkInvoiceOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [linkingInvoice, setLinkingInvoice] = useState(false);

  // Edit deal form
  const [editForm, setEditForm] = useState({
    title: "",
    stage: "qualification" as string,
    company_id: "",
    contact_id: "",
    value: "",
    probability: "",
    expected_close_date: "",
    description: "",
    meeting_count: "",
  });

  // Sync edit form when deal loads
  useEffect(() => {
    if (deal) {
      setEditForm({
        title: deal.title ?? "",
        stage: deal.stage ?? "qualification",
        company_id: deal.company_id ?? "",
        contact_id: deal.contact_id ?? "",
        value: deal.value?.toString() ?? "",
        probability: deal.probability?.toString() ?? "",
        expected_close_date: deal.expected_close_date ?? "",
        description: deal.description ?? "",
        meeting_count: (deal as any).meeting_count?.toString() ?? "0",
      });
    }
  }, [deal]);

  // Fetch document links when deal loads
  useEffect(() => {
    if (!deal?.id) return;
    supabase
      .from("document_links")
      .select("*")
      .eq("linkable_type", "sales_deal")
      .eq("linkable_id", deal.id)
      .then(({ data }) => {
        setDocLinks((data ?? []) as { id: string; title: string; url: string }[]);
      });
  }, [deal?.id]);

  // Fetch uploaded files from Supabase Storage when deal loads
  useEffect(() => {
    if (!deal?.id) return;
    const folder = `deals/${deal.id}`;
    supabase.storage
      .from("deal-files")
      .list(folder)
      .then(({ data: list }) => {
        if (!list) {
          setUploadedFiles([]);
          return;
        }
        const mapped = list.map((f) => {
          const { data: urlData } = supabase.storage
            .from("deal-files")
            .getPublicUrl(`${folder}/${f.name}`);
          return {
            id: f.id ?? f.name,
            name: f.name,
            created_at: f.created_at ?? "",
            url: urlData.publicUrl,
          };
        });
        setUploadedFiles(mapped);
      });
  }, [deal?.id]);

  // Contacts filtered by deal's company
  const companyContacts = useMemo(() => {
    if (!deal?.company_id) return allContacts;
    return allContacts.filter((c) => c.company_id === deal.company_id);
  }, [allContacts, deal?.company_id]);

  // Contacts for edit form — depends on selected company in form
  const editFormContacts = useMemo(() => {
    if (!editForm.company_id) return allContacts;
    return allContacts.filter((c) => c.company_id === editForm.company_id);
  }, [allContacts, editForm.company_id]);

  // Candidate invoices to link: same company as the deal, and not already linked here.
  const linkedInvoiceIds = useMemo(
    () => new Set((deal?.invoices ?? []).map((i) => i.id)),
    [deal?.invoices]
  );
  const linkableInvoices = useMemo<Invoice[]>(() => {
    if (!deal?.company_id) {
      return allInvoices.filter((inv) => !linkedInvoiceIds.has(inv.id));
    }
    return allInvoices.filter(
      (inv) => inv.company_id === deal.company_id && !linkedInvoiceIds.has(inv.id)
    );
  }, [allInvoices, deal?.company_id, linkedInvoiceIds]);

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
        <Button variant="outline" onClick={() => navigate("/pipeline")}>
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

  function openEdit() {
    setEditForm({
      title: deal.title ?? "",
      stage: deal.stage ?? "qualification",
      company_id: deal.company_id ?? "",
      contact_id: deal.contact_id ?? "",
      value: deal.value?.toString() ?? "",
      probability: deal.probability?.toString() ?? "",
      expected_close_date: deal.expected_close_date ?? "",
      description: deal.description ?? "",
      meeting_count: (deal as any).meeting_count?.toString() ?? "0",
    });
    setEditOpen(true);
  }

  function saveEdit() {
    updateDeal.mutate(
      {
        id: deal.id,
        title: editForm.title.trim(),
        stage: editForm.stage as SalesStage,
        company_id: editForm.company_id || null,
        contact_id: editForm.contact_id || null,
        value: editForm.value ? parseFloat(editForm.value) : null,
        probability: editForm.probability ? parseInt(editForm.probability) : null,
        expected_close_date: editForm.expected_close_date || null,
        description: editForm.description.trim() || null,
        meeting_count: editForm.meeting_count === "" ? 0 : Math.max(0, parseInt(editForm.meeting_count) || 0),
      } as Parameters<typeof updateDeal.mutate>[0],
      {
        onSuccess: () => {
          toast.success("Deal updated");
          setEditOpen(false);
          qc.invalidateQueries({ queryKey: ["sales_deal", id] });
        },
        onError: () => toast.error("Failed to update deal"),
      }
    );
  }

  async function handleAddLink() {
    if (!linkTitle.trim() || !linkUrl.trim()) {
      toast.error("Title and URL are required");
      return;
    }
    setSavingLink(true);
    const { error } = await supabase.from("document_links").insert({
      linkable_type: "sales_deal",
      linkable_id: deal.id,
      title: linkTitle.trim(),
      url: linkUrl.trim(),
    });
    setSavingLink(false);
    if (error) { toast.error("Failed to add link"); return; }
    toast.success("Link added");
    setLinkTitle("");
    setLinkUrl("");
    setAddLinkOpen(false);
    // Re-fetch links
    const { data } = await supabase.from("document_links").select("*").eq("linkable_type", "sales_deal").eq("linkable_id", deal.id);
    setDocLinks((data ?? []) as { id: string; title: string; url: string }[]);
  }

  async function refreshUploadedFiles() {
    const folder = `deals/${deal.id}`;
    const { data: list } = await supabase.storage.from("deal-files").list(folder);
    if (!list) {
      setUploadedFiles([]);
      return;
    }
    setUploadedFiles(
      list.map((f) => {
        const { data: urlData } = supabase.storage
          .from("deal-files")
          .getPublicUrl(`${folder}/${f.name}`);
        return {
          id: f.id ?? f.name,
          name: f.name,
          created_at: f.created_at ?? "",
          url: urlData.publicUrl,
        };
      })
    );
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setUploading(true);
    const folder = `deals/${deal.id}`;
    let uploadCount = 0;
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const filePath = `${folder}/${file.name}`;
      const { error } = await supabase.storage.from("deal-files").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) {
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      } else {
        uploadCount++;
      }
    }
    setUploading(false);
    if (uploadCount > 0) {
      toast.success(`${uploadCount} file(s) uploaded`);
      await refreshUploadedFiles();
    }
    e.target.value = "";
  }

  async function handleDeleteUploadedFile(fileName: string) {
    const filePath = `deals/${deal.id}/${fileName}`;
    const { error } = await supabase.storage.from("deal-files").remove([filePath]);
    if (error) { toast.error("Failed to delete file"); return; }
    toast.success("File deleted");
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  }

  async function handleDownloadUploadedFile(fileName: string) {
    const filePath = `deals/${deal.id}/${fileName}`;
    const { data, error } = await supabase.storage.from("deal-files").download(filePath);
    if (error || !data) { toast.error("Failed to download file"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteDocLink(linkId: string) {
    const { error } = await supabase.from("document_links").delete().eq("id", linkId);
    if (error) { toast.error("Failed to remove link"); return; }
    setDocLinks((prev) => prev.filter((d) => d.id !== linkId));
    toast.success("Link removed");
  }

  async function handleLinkInvoice() {
    if (!selectedInvoiceId) {
      toast.error("Pick an invoice to link");
      return;
    }
    setLinkingInvoice(true);
    const { error } = await supabase
      .from("invoices")
      .update({ deal_id: deal.id, updated_at: new Date().toISOString() })
      .eq("id", selectedInvoiceId);
    setLinkingInvoice(false);
    if (error) { toast.error("Failed to link invoice"); return; }
    toast.success("Invoice linked");
    setSelectedInvoiceId("");
    setLinkInvoiceOpen(false);
    qc.invalidateQueries({ queryKey: ["sales_deal", id] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  async function handleUnlinkInvoice(invoiceId: string) {
    const { error } = await supabase
      .from("invoices")
      .update({ deal_id: null, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);
    if (error) { toast.error("Failed to unlink invoice"); return; }
    toast.success("Invoice unlinked");
    qc.invalidateQueries({ queryKey: ["sales_deal", id] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }

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
          onClick={() => navigate("/pipeline")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Pipeline
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
          <Button size="sm" variant="outline" className="gap-1.5" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit Deal
          </Button>
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
              <p className="text-sm font-medium">{(deal as any).meeting_count ?? 0} meeting{((deal as any).meeting_count ?? 0) !== 1 ? "s" : ""}</p>
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
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Linked Invoices
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => { setSelectedInvoiceId(""); setLinkInvoiceOpen(true); }}
          >
            <Link2 className="h-3.5 w-3.5" />
            Link Invoice
          </Button>
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
                      <th className="p-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b last:border-0 hover:bg-muted/20"
                      >
                        <td
                          className="p-2 text-primary cursor-pointer"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                        >
                          {inv.invoice_number ?? "—"}
                        </td>
                        <td
                          className="p-2 cursor-pointer"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                        >
                          {fmtDate(inv.invoice_date)}
                        </td>
                        <td
                          className="p-2 text-right cursor-pointer"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                        >
                          ${(inv.total_amount ?? 0).toLocaleString()}
                        </td>
                        <td
                          className="p-2 text-right cursor-pointer"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                        >
                          ${((inv.total_amount ?? 0) - (inv.balance_due ?? 0)).toLocaleString()}
                        </td>
                        <td
                          className="p-2 text-right cursor-pointer"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                        >
                          ${(inv.balance_due ?? 0).toLocaleString()}
                        </td>
                        <td
                          className="p-2 cursor-pointer"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                        >
                          <Badge variant="outline" className="text-xs capitalize">{inv.status}</Badge>
                        </td>
                        <td className="p-2">
                          {inv.deal_id === deal.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Unlink invoice from this deal"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlinkInvoice(inv.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

      {/* Files */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Files
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => setAddLinkOpen(true)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Add Link
            </Button>
            <label>
              <Button size="sm" className="h-7 text-xs gap-1 cursor-pointer" asChild disabled={uploading}>
                <span>
                  <Plus className="h-3.5 w-3.5" />
                  {uploading ? "Uploading…" : "Upload File"}
                </span>
              </Button>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleUploadFile}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png"
              />
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {uploadedFiles.length === 0 && docLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files yet. Upload a file or add a link.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {uploadedFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/40 transition-colors"
                >
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm flex-1 truncate">{f.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => handleDownloadUploadedFile(f.name)}
                  >
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDeleteUploadedFile(f.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {docLinks.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/40 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm flex-1 hover:underline truncate"
                  >
                    {doc.title}
                  </a>
                  <span className="text-xs text-muted-foreground">Link</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDeleteDocLink(doc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
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

      {/* Edit Deal Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Deal</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Deal Name *</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Company</Label>
                <Select value={editForm.company_id || "__none__"} onValueChange={(v) => setEditForm((f) => ({ ...f, company_id: v === "__none__" ? "" : v, contact_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Contact</Label>
                <Select value={editForm.contact_id || "__none__"} onValueChange={(v) => setEditForm((f) => ({ ...f, contact_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select contact…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {editFormContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(" ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editForm.company_id && editFormContacts.length === 0 && (
                  <p className="text-xs text-muted-foreground">No contacts linked to this company.</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Stage</Label>
                <Select value={editForm.stage} onValueChange={(v) => setEditForm((f) => ({ ...f, stage: v as SalesStage }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SALES_STAGE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Probability (%)</Label>
                <Input type="number" min="0" max="100" value={editForm.probability} onChange={(e) => setEditForm((f) => ({ ...f, probability: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Amount</Label>
                <div className="relative">
                  <Input type="number" placeholder="0" value={editForm.value} onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))} className="pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                </div>
              </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Follow Up Date</Label>
                <Input type="date" value={editForm.expected_close_date} onChange={(e) => setEditForm((f) => ({ ...f, expected_close_date: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label># of Meetings</Label>
                <Input type="number" min="0" value={editForm.meeting_count} onChange={(e) => setEditForm((f) => ({ ...f, meeting_count: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="min-h-[80px] resize-y" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={updateDeal.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Link Dialog */}
      <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document Link</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g., Engagement Letter" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>URL *</Label>
              <Input placeholder="https://drive.google.com/..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLinkOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLink} disabled={savingLink}>Add Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Invoice Dialog */}
      <Dialog open={linkInvoiceOpen} onOpenChange={setLinkInvoiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link Invoice to Deal</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {deal.company
                ? `Showing invoices for ${deal.company.name} that aren't already linked to this deal.`
                : "Showing invoices that aren't already linked to this deal."}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>Invoice</Label>
              <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder={linkableInvoices.length === 0 ? "No available invoices" : "Select an invoice…"} />
                </SelectTrigger>
                <SelectContent>
                  {linkableInvoices.map((inv) => {
                    const label = inv.invoice_number ?? `INV-${inv.id.slice(0, 8)}`;
                    const date = inv.invoice_date ? fmtDate(inv.invoice_date) : "—";
                    const amt = inv.total_amount != null ? `$${inv.total_amount.toLocaleString()}` : "—";
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {label} · {date} · {amt}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {linkableInvoices.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No unlinked invoices found{deal.company ? ` for ${deal.company.name}` : ""}.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkInvoiceOpen(false)}>Cancel</Button>
            <Button onClick={handleLinkInvoice} disabled={linkingInvoice || !selectedInvoiceId}>
              Link Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
