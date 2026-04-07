import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Globe,
  Phone,
  MapPin,
  Pencil,
  Plus,
  ExternalLink,
  FileText,
  Activity,
  Briefcase,
  Users,
  Folder,
  Mail,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompany, useUpdateCompany, useDeleteCompany } from "@/hooks/useCompanies";
import { useLogInteraction } from "@/hooks/useInteractions";
import { toast } from "sonner";
import type { Company, InteractionType } from "@/types";
import {
  INTERACTION_TYPE_LABELS,
  SALES_STAGE_LABELS,
  DELIVERY_STAGE_LABELS,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "MMM d, yyyy"); } catch { return "—"; }
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "MMM d, yyyy h:mm a"); } catch { return "—"; }
}

function gmailComposeUrl(to: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}`;
}

function SidebarField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{value || "—"}</p>
    </div>
  );
}

// ─── Contacts tab ─────────────────────────────────────────────────────────────

function ContactsTab({ company }: { company: any }) {
  const navigate = useNavigate();
  const contacts = company.contacts ?? [];

  return (
    <div className="flex flex-col gap-3">
      {contacts.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No contacts linked to this company.
        </div>
      ) : (
        contacts.map((c: any) => (
          <Card key={c.id} className="cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => navigate(`/contacts/${c.id}`)}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                </p>
                {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                {c.email && (
                  <a
                    href={gmailComposeUrl(c.email)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="h-3 w-3" />
                    {c.email}
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                {(c.categories ?? []).map((cat: string) => (
                  <Badge key={cat} variant="outline" className="text-xs capitalize">{cat}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Timeline tab ─────────────────────────────────────────────────────────────

function TimelineTab({ company }: { company: any }) {
  const interactions = company.interactions ?? [];

  if (!interactions.length) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No interactions recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-5">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
      <div className="flex flex-col gap-5">
        {interactions.map((item: any) => (
          <div key={item.id} className="relative">
            <div className="absolute -left-5 mt-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background translate-x-[-3px]" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {INTERACTION_TYPE_LABELS[item.type as keyof typeof INTERACTION_TYPE_LABELS] ?? item.type}
                </Badge>
                {item.contact && (
                  <span className="text-xs text-muted-foreground">
                    {[item.contact.first_name, item.contact.last_name].filter(Boolean).join(" ")}
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDateTime(item.occurred_at)}
                </span>
              </div>
              {item.subject && <p className="text-sm font-medium">{item.subject}</p>}
              {item.summary && <p className="text-sm text-muted-foreground">{item.summary}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Log interaction dialog ───────────────────────────────────────────────────

function LogInteractionDialog({
  companyId,
  open,
  onOpenChange,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [type, setType] = useState<InteractionType>("note");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    const central = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
    return central.getFullYear() + "-" +
      String(central.getMonth() + 1).padStart(2, "0") + "-" +
      String(central.getDate()).padStart(2, "0") + "T" +
      String(central.getHours()).padStart(2, "0") + ":" +
      String(central.getMinutes()).padStart(2, "0");
  });
  const logInteraction = useLogInteraction();

  const allTypes: InteractionType[] = ["email_sent", "call", "meeting", "text", "linkedin_message", "note"];

  function handleSave() {
    logInteraction.mutate(
      {
        company_id: companyId,
        type,
        subject: subject.trim() || undefined,
        summary: summary.trim() || undefined,
        occurred_at: new Date(occurredAt).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Interaction logged");
          setSubject(""); setSummary(""); onOpenChange(false);
        },
        onError: () => toast.error("Failed to log interaction"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log Interaction</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as InteractionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allTypes.map((t) => (
                  <SelectItem key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Subject</Label>
            <Input placeholder="Optional" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Summary</Label>
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date &amp; Time</Label>
            <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={logInteraction.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pipelines tab ────────────────────────────────────────────────────────────

function PipelinesTab({ company }: { company: any }) {
  const navigate = useNavigate();
  const salesDeals = company.sales_deals ?? [];
  const engagements = company.delivery_engagements ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Briefcase className="h-4 w-4" /> Sales Pipeline
        </h3>
        {salesDeals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales deals.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {salesDeals.map((deal: any) => (
              <Card key={deal.id} className="cursor-pointer hover:bg-muted/40"
                onClick={() => navigate("/sales-pipeline")}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {SALES_STAGE_LABELS[deal.stage as keyof typeof SALES_STAGE_LABELS] ?? deal.stage}
                    </p>
                  </div>
                  {deal.value && <span className="text-sm font-semibold">${deal.value.toLocaleString()}</span>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Delivery Pipeline
        </h3>
        {engagements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No delivery engagements.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {engagements.map((eng: any) => (
              <Card key={eng.id} className="cursor-pointer hover:bg-muted/40"
                onClick={() => navigate("/delivery-pipeline")}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{eng.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {DELIVERY_STAGE_LABELS[eng.stage as keyof typeof DELIVERY_STAGE_LABELS] ?? eng.stage}
                    </p>
                  </div>
                  {eng.contract_value && <span className="text-sm font-semibold">${eng.contract_value.toLocaleString()}</span>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Invoices tab ─────────────────────────────────────────────────────────────

function InvoicesTab({ company }: { company: any }) {
  const navigate = useNavigate();
  const invoices = company.invoices ?? [];

  return (
    <div className="flex flex-col gap-3">
      {invoices.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No invoices linked.
        </div>
      ) : (
        invoices.map((inv: any) => (
          <Card key={inv.id} className="cursor-pointer hover:bg-muted/40"
            onClick={() => navigate(`/invoices/${inv.id}`)}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{inv.invoice_number ?? `Invoice ${inv.id.slice(0, 8)}`}</p>
                <p className="text-xs text-muted-foreground">{formatDate(inv.invoice_date)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">${(inv.total ?? 0).toLocaleString()}</p>
                <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-xs capitalize">
                  {inv.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Files tab ────────────────────────────────────────────────────────────────

function FilesTab({ company }: { company: any }) {
  const docs = company.document_links ?? [];

  return (
    <div className="flex flex-col gap-2">
      {docs.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No files linked yet.
        </div>
      ) : (
        docs.map((doc: any) => (
          <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/40 transition-colors">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1">{doc.title}</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        ))
      )}
    </div>
  );
}

// ─── Edit company dialog ──────────────────────────────────────────────────────

function EditCompanyDialog({
  company,
  open,
  onOpenChange,
}: {
  company: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateCompany = useUpdateCompany();
  const [form, setForm] = useState({
    name: company.name ?? "",
    industry: company.industry ?? "",
    website: company.website ?? "",
    phone: company.phone ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    description: company.description ?? "",
  });

  function handleSave() {
    updateCompany.mutate(
      { id: company.id, ...form },
      {
        onSuccess: () => { toast.success("Company updated"); onOpenChange(false); },
        onError: () => toast.error("Failed to update company"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Company</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Company Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Industry</Label>
            <Input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>State</Label>
            <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateCompany.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: company, isLoading, isError } = useCompany(id!);
  const deleteCompany = useDeleteCompany();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading company…
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Company not found.</p>
        <Button variant="outline" onClick={() => navigate("/companies")}>
          Back to Companies
        </Button>
      </div>
    );
  }

  const tags: any[] = (company as any).tags ?? [];

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      {/* ── Left sidebar ── */}
      <aside className="w-72 shrink-0 border-r border-border bg-muted/20 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
            onClick={() => navigate("/companies")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Companies
          </button>

          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-semibold leading-tight">{company.name}</h1>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8"
                onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  deleteCompany.mutate(id!, {
                    onSuccess: () => {
                      toast.success("Company deleted");
                      navigate("/companies");
                    },
                    onError: () => toast.error("Failed to delete company"),
                  });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {confirmDelete && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              Click the trash icon again to confirm deletion. <button className="underline ml-1" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          )}

          {company.industry && (
            <p className="text-sm text-muted-foreground mt-0.5">{company.industry}</p>
          )}
        </div>

        {/* Contact info */}
        <div className="p-4 flex flex-col gap-3">
          {company.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate"
              >
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${company.phone}`} className="text-sm hover:underline">{company.phone}</a>
            </div>
          )}
          {(company.city || company.state) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">
                {[company.city, company.state].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="p-4 flex flex-col gap-4">
          <SidebarField label="Contacts" value={String((company as any).contacts?.length ?? 0)} />
          <SidebarField label="Added" value={formatDate((company as any).created_at)} />
        </div>

        {tags.length > 0 && (
          <>
            <Separator />
            <div className="p-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</p>
              <div className="flex flex-wrap gap-1">
                {tags.map((t: any) => (
                  <Badge key={t.id}
                    style={{ backgroundColor: t.color ?? "#6366f1", color: "#fff" }}
                    className="text-xs">
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {company.description && (
          <>
            <Separator />
            <div className="p-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">About</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.description}</p>
            </div>
          </>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <Tabs defaultValue="contacts" className="h-full flex flex-col">
          <div className="border-b border-border px-6 pt-4 flex items-center justify-between">
            <TabsList className="h-9">
              <TabsTrigger value="contacts" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Contacts
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Timeline
              </TabsTrigger>
              <TabsTrigger value="pipelines" className="gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Pipelines
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Invoices
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1.5">
                <Folder className="h-3.5 w-3.5" /> Files
              </TabsTrigger>
            </TabsList>
            <Button size="sm" variant="outline" onClick={() => setLogOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Log Interaction
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="contacts" className="p-6 m-0">
              <ContactsTab company={company} />
            </TabsContent>
            <TabsContent value="timeline" className="p-6 m-0">
              <TimelineTab company={company} />
            </TabsContent>
            <TabsContent value="pipelines" className="p-6 m-0">
              <PipelinesTab company={company} />
            </TabsContent>
            <TabsContent value="invoices" className="p-6 m-0">
              <InvoicesTab company={company} />
            </TabsContent>
            <TabsContent value="files" className="p-6 m-0">
              <FilesTab company={company} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <EditCompanyDialog company={company} open={editOpen} onOpenChange={setEditOpen} />
      <LogInteractionDialog companyId={company.id} open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
}
