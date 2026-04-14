import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Pencil,
  Plus,
  ExternalLink,
  FileText,
  Calendar,
  MessageSquare,
  Activity,
  Briefcase,
  Folder,
  Trash2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useQueryClient } from "@tanstack/react-query";
import { useContact, useUpdateContact, useDeleteContact } from "@/hooks/useContacts";
import { useLogInteraction } from "@/hooks/useInteractions";
import { useCreateSalesDeal } from "@/hooks/useDeals";
import { useCompanies } from "@/hooks/useCompanies";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { ContactWithDetails, InteractionType } from "@/types";
import { INTERACTION_TYPE_LABELS, SALES_STAGE_LABELS, DELIVERY_STAGE_LABELS } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy h:mm a");
  } catch {
    return "—";
  }
}

function gmailComposeUrl(to: string, subject = "") {
  const base = "https://mail.google.com/mail/?view=cm&fs=1";
  return `${base}&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidebarField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{value || "—"}</p>
    </div>
  );
}

// Timeline tab ─────────────────────────────────────────────────────────────────

function TimelineTab({ contact }: { contact: ContactWithDetails }) {
  const interactions = contact.interactions ?? [];

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
        {interactions.map((item) => (
          <div key={item.id} className="relative">
            <div className="absolute -left-5 mt-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background translate-x-[-3px]" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {INTERACTION_TYPE_LABELS[item.type as keyof typeof INTERACTION_TYPE_LABELS] ?? item.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
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

// Notes tab ─────────────────────────────────────────────────────────────────────

function NotesTab({ contact }: { contact: ContactWithDetails }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const logInteraction = useLogInteraction();

  function handleSave() {
    if (!content.trim()) return;
    logInteraction.mutate(
      {
        contact_id: contact.id,
        company_id: contact.company_id ?? undefined,
        type: "note",
        summary: content.trim(),
        occurred_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Note saved");
          setContent("");
          setOpen(false);
        },
        onError: () => toast.error("Failed to save note"),
      }
    );
  }

  const notes = (contact.interactions ?? []).filter((i) => i.type === "note");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No notes yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((n) => (
            <Card key={n.id}>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{n.summary}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatDateTime(n.occurred_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Write your note…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={logInteraction.isPending}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Activities tab ──────────────────────────────────────────────────────────────

function ActivitiesTab({ contact }: { contact: ContactWithDetails }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InteractionType>("call");
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

  const activityTypes: InteractionType[] = ["call", "meeting", "conference", "linkedin_message", "text"];
  const activities = (contact.interactions ?? []).filter((i) =>
    activityTypes.includes(i.type as InteractionType)
  );

  function handleLog() {
    logInteraction.mutate(
      {
        contact_id: contact.id,
        company_id: contact.company_id ?? undefined,
        type,
        subject: subject.trim() || undefined,
        summary: summary.trim() || undefined,
        occurred_at: new Date(occurredAt).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Activity logged");
          setSubject("");
          setSummary("");
          setOpen(false);
        },
        onError: () => toast.error("Failed to log activity"),
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Log Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No activities logged yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-4 flex gap-3">
                <Badge variant="outline" className="capitalize shrink-0">
                  {INTERACTION_TYPE_LABELS[a.type as keyof typeof INTERACTION_TYPE_LABELS] ?? a.type}
                </Badge>
                <div className="flex flex-col gap-0.5 flex-1">
                  {a.subject && <p className="text-sm font-medium">{a.subject}</p>}
                  {a.summary && <p className="text-sm text-muted-foreground">{a.summary}</p>}
                  <p className="text-xs text-muted-foreground">{formatDateTime(a.occurred_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as InteractionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {INTERACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Subject</Label>
              <Input
                placeholder="Optional subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Summary</Label>
              <Textarea
                placeholder="Brief summary…"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date &amp; Time</Label>
              <Input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleLog} disabled={logInteraction.isPending}>
              Log Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Emails tab ──────────────────────────────────────────────────────────────────

function EmailsTab({ contact }: { contact: ContactWithDetails }) {
  const emails = (contact.interactions ?? []).filter((i) => i.type === "email_sent" || i.type === "email_received");

  return (
    <div className="flex flex-col gap-4">
      {contact.email && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            asChild
            className="gap-1.5"
          >
            <a
              href={gmailComposeUrl(contact.email)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Mail className="h-4 w-4" />
              Compose in Gmail
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
        </div>
      )}

      {emails.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No emails logged yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {emails.map((e) => (
            <Card key={e.id}>
              <CardContent className="pt-4">
                {e.subject && <p className="text-sm font-medium">{e.subject}</p>}
                {e.summary && <p className="text-sm text-muted-foreground mt-1">{e.summary}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDateTime(e.occurred_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Pipelines tab ───────────────────────────────────────────────────────────────

const SALES_STAGES_LIST: { id: string; label: string }[] = [
  { id: "qualification", label: "Qualification" },
  { id: "needs_analysis", label: "Needs Analysis" },
  { id: "proposal", label: "Proposal/Price Quote" },
  { id: "cold_deal", label: "Cold Deal" },
  { id: "closed_won", label: "Closed Won" },
  { id: "closed_lost", label: "Closed Lost" },
  { id: "service_complete", label: "Service Complete" },
];

function PipelinesTab({ contact }: { contact: ContactWithDetails }) {
  const navigate = useNavigate();
  const salesDeals = contact.sales_deals ?? [];
  const engagements = contact.delivery_engagements ?? [];

  const [createDealOpen, setCreateDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState({
    title: "",
    stage: "qualification",
    value: "",
    expected_close_date: "",
    description: "",
  });
  const createDeal = useCreateSalesDeal();
  const { data: companies = [] } = useCompanies();

  function handleCreateDeal() {
    if (!dealForm.title.trim()) {
      toast.error("Deal name is required");
      return;
    }
    createDeal.mutate(
      {
        title: dealForm.title.trim(),
        stage: dealForm.stage as import("@/types").SalesStage,
        stage_order: 0,
        contact_id: contact.id,
        company_id: contact.company_id ?? undefined,
        value: dealForm.value ? parseFloat(dealForm.value) : undefined,
        expected_close_date: dealForm.expected_close_date || undefined,
        description: dealForm.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Deal created");
          setDealForm({ title: "", stage: "qualification", value: "", expected_close_date: "", description: "" });
          setCreateDealOpen(false);
        },
        onError: () => toast.error("Failed to create deal"),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sales */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Sales Pipeline
          </h3>
          <Button size="sm" onClick={() => setCreateDealOpen(true)} className="gap-1.5 h-7 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Deal
          </Button>
        </div>
        {salesDeals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales deals linked.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {salesDeals.map((deal) => (
              <Card
                key={deal.id}
                className="cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => navigate(`/sales-deals/${deal.id}`)}
              >
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {SALES_STAGE_LABELS[deal.stage as keyof typeof SALES_STAGE_LABELS] ?? deal.stage}
                    </p>
                  </div>
                  {deal.value && (
                    <span className="text-sm font-semibold">
                      ${deal.value.toLocaleString()}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Delivery */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Delivery Pipeline
        </h3>
        {engagements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No delivery engagements linked.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {engagements.map((eng) => (
              <Card
                key={eng.id}
                className="cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => navigate("/delivery-pipeline")}
              >
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{eng.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {DELIVERY_STAGE_LABELS[eng.stage as keyof typeof DELIVERY_STAGE_LABELS] ?? eng.stage}
                    </p>
                  </div>
                  {eng.total_engagement_value != null && eng.total_engagement_value > 0 && (
                    <span className="text-sm font-semibold">
                      ${eng.total_engagement_value.toLocaleString()}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Deal Dialog */}
      <Dialog open={createDealOpen} onOpenChange={setCreateDealOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create Deal for {[contact.first_name, contact.last_name].filter(Boolean).join(" ")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Deal Name *</Label>
              <Input
                placeholder="e.g., Acme Bank - AI Enablement"
                value={dealForm.title}
                onChange={(e) => setDealForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Stage</Label>
              <Select value={dealForm.stage} onValueChange={(v) => setDealForm((f) => ({ ...f, stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SALES_STAGES_LIST.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={dealForm.value}
                  onChange={(e) => setDealForm((f) => ({ ...f, value: e.target.value }))}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Follow Up Date</Label>
              <Input
                type="date"
                value={dealForm.expected_close_date}
                onChange={(e) => setDealForm((f) => ({ ...f, expected_close_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="A few words about this deal"
                value={dealForm.description}
                onChange={(e) => setDealForm((f) => ({ ...f, description: e.target.value }))}
                className="min-h-[80px] resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDealOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDeal} disabled={createDeal.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Files tab ───────────────────────────────────────────────────────────────────

interface ContactFile {
  id: string;
  name: string;
  created_at: string;
  url: string;
}

function FilesTab({ contact }: { contact: ContactWithDetails }) {
  const docs = contact.document_links ?? [];
  const qc = useQueryClient();
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<ContactFile[]>([]);
  const [filesLoaded, setFilesLoaded] = useState(false);

  // Load uploaded files from Supabase Storage
  useState(() => {
    (async () => {
      const folder = `contacts/${contact.id}`;
      const { data: list } = await supabase.storage.from("contact-files").list(folder);
      if (list && list.length > 0) {
        const mapped = list.map((f) => {
          const { data: urlData } = supabase.storage
            .from("contact-files")
            .getPublicUrl(`${folder}/${f.name}`);
          return {
            id: f.id ?? f.name,
            name: f.name,
            created_at: f.created_at ?? "",
            url: urlData.publicUrl,
          };
        });
        setFiles(mapped);
      }
      setFilesLoaded(true);
    })();
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setUploading(true);
    const folder = `contacts/${contact.id}`;
    let uploadCount = 0;
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const filePath = `${folder}/${file.name}`;
      const { error } = await supabase.storage.from("contact-files").upload(filePath, file, {
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
      // Refresh file list
      const { data: list } = await supabase.storage.from("contact-files").list(folder);
      if (list) {
        setFiles(
          list.map((f) => {
            const { data: urlData } = supabase.storage
              .from("contact-files")
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
    }
    // Reset input
    e.target.value = "";
  }

  async function handleDeleteFile(fileName: string) {
    const filePath = `contacts/${contact.id}/${fileName}`;
    const { error } = await supabase.storage.from("contact-files").remove([filePath]);
    if (error) { toast.error("Failed to delete file"); return; }
    toast.success("File deleted");
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
  }

  async function handleDownloadFile(fileName: string) {
    const filePath = `contacts/${contact.id}/${fileName}`;
    const { data, error } = await supabase.storage.from("contact-files").download(filePath);
    if (error || !data) { toast.error("Failed to download file"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAddLink() {
    if (!linkTitle.trim() || !linkUrl.trim()) {
      toast.error("Title and URL are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("document_links")
      .insert({
        linkable_type: "contact",
        linkable_id: contact.id,
        title: linkTitle.trim(),
        url: linkUrl.trim(),
      });
    setSaving(false);
    if (error) { toast.error("Failed to add link"); return; }
    toast.success("Link added");
    setLinkTitle("");
    setLinkUrl("");
    setAddLinkOpen(false);
    qc.invalidateQueries({ queryKey: ["contact", contact.id] });
  }

  const hasContent = files.length > 0 || docs.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setAddLinkOpen(true)} className="gap-1.5">
          <ExternalLink className="h-4 w-4" />
          Add Link
        </Button>
        <label>
          <Button size="sm" className="gap-1.5 cursor-pointer" asChild disabled={uploading}>
            <span>
              <Plus className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload File"}
            </span>
          </Button>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png"
          />
        </label>
      </div>

      {!hasContent && filesLoaded ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No files yet. Upload a file or add a link.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Uploaded files */}
          {files.map((f) => (
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
                onClick={() => handleDownloadFile(f.name)}
              >
                Download
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => handleDeleteFile(f.name)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Document links */}
          {docs.map((doc) => (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/40 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">{doc.title}</span>
              <span className="text-xs text-muted-foreground">Link</span>
            </a>
          ))}
        </div>
      )}

      <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document Link</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Engagement Letter"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>URL *</Label>
              <Input
                placeholder="https://drive.google.com/..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLinkOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLink} disabled={saving}>Add Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Edit contact dialog ──────────────────────────────────────────────────────

function EditContactDialog({
  contact,
  open,
  onOpenChange,
}: {
  contact: ContactWithDetails;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateContact = useUpdateContact();
  const [form, setForm] = useState({
    first_name: contact.first_name ?? "",
    last_name: contact.last_name ?? "",
    title: contact.title ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    linkedin_url: contact.linkedin_url ?? "",
    description: contact.description ?? "",
    city: contact.city ?? "",
    state: contact.state ?? "",
  });

  function handleSave() {
    updateContact.mutate(
      { id: contact.id, ...form },
      {
        onSuccess: () => {
          toast.success("Contact updated");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to update contact"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>First Name</Label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Last Name</Label>
            <Input
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>LinkedIn URL</Label>
            <Input
              value={form.linkedin_url}
              onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>State</Label>
            <Input
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateContact.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: contact, isLoading, isError } = useContact(id!);
  const deleteContact = useDeleteContact();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading contact…
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Contact not found.</p>
        <Button variant="outline" onClick={() => navigate("/contacts")}>
          Back to Contacts
        </Button>
      </div>
    );
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const categories: string[] = (contact as any).categories ?? [];
  const tags: any[] = (contact as any).tags ?? [];

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      {/* ── Left sidebar ── */}
      <aside className="w-72 shrink-0 border-r border-border bg-muted/20 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
            onClick={() => navigate("/contacts")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Contacts
          </button>

          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold leading-tight">{fullName || "—"}</h1>
              {contact.title && (
                <p className="text-sm text-muted-foreground mt-0.5">{contact.title}</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditOpen(true)}
              >
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
                  deleteContact.mutate(id!, {
                    onSuccess: () => {
                      toast.success("Contact deleted");
                      navigate("/contacts");
                    },
                    onError: () => toast.error("Failed to delete contact"),
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

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {categories.map((c) => (
                <Badge key={c} variant="secondary" className="text-xs capitalize">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="p-4 flex flex-col gap-3">
          {contact.email && (
            <div className="flex items-center gap-2 group">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contact.email!);
                  toast.success("Email copied to clipboard");
                }}
                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                title="Copy email to clipboard"
              >
                <Mail className="h-4 w-4" />
              </button>
              <a
                href={gmailComposeUrl(contact.email)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm truncate text-primary hover:underline"
              >
                {contact.email}
              </a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${contact.phone}`} className="text-sm hover:underline">
                {contact.phone}
              </a>
            </div>
          )}
          {(contact as any).company && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <button
                className="text-sm hover:underline text-left"
                onClick={() => navigate(`/companies/${(contact as any).company.id}`)}
              >
                {(contact as any).company.name}
              </button>
            </div>
          )}
          {(contact.city || contact.state) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">
                {[contact.city, contact.state].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
          {contact.linkedin_url && (
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate"
              >
                LinkedIn Profile
              </a>
            </div>
          )}
        </div>

        <Separator />

        {/* Extra fields */}
        <div className="p-4 flex flex-col gap-4">
          <SidebarField label="Last Contact" value={formatDate(contact.last_contacted_at)} />
          <SidebarField
            label="Last Contact Type"
            value={
              contact.last_contact_type
                ? INTERACTION_TYPE_LABELS[
                    contact.last_contact_type as keyof typeof INTERACTION_TYPE_LABELS
                  ] ?? contact.last_contact_type
                : undefined
            }
          />
          <SidebarField label="Added" value={formatDate(contact.created_at)} />
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <Separator />
            <div className="p-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tags
              </p>
              <div className="flex flex-wrap gap-1">
                {tags.map((t: any) => (
                  <Badge
                    key={t.id}
                    style={{ backgroundColor: t.color ?? "#6366f1", color: "#fff" }}
                    className="text-xs"
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        {contact.description && (
          <>
            <Separator />
            <div className="p-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                About
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.description}</p>
            </div>
          </>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <Tabs defaultValue="timeline" className="h-full flex flex-col">
          <div className="border-b border-border px-6 pt-4">
            <TabsList className="h-9">
              <TabsTrigger value="timeline" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="activities" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Activities
              </TabsTrigger>
              <TabsTrigger value="emails" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Emails
              </TabsTrigger>
              <TabsTrigger value="pipelines" className="gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Pipelines
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1.5">
                <Folder className="h-3.5 w-3.5" />
                Files
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="timeline" className="p-6 m-0">
              <TimelineTab contact={contact} />
            </TabsContent>
            <TabsContent value="notes" className="p-6 m-0">
              <NotesTab contact={contact} />
            </TabsContent>
            <TabsContent value="activities" className="p-6 m-0">
              <ActivitiesTab contact={contact} />
            </TabsContent>
            <TabsContent value="emails" className="p-6 m-0">
              <EmailsTab contact={contact} />
            </TabsContent>
            <TabsContent value="pipelines" className="p-6 m-0">
              <PipelinesTab contact={contact} />
            </TabsContent>
            <TabsContent value="files" className="p-6 m-0">
              <FilesTab contact={contact} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <EditContactDialog
        contact={contact}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
