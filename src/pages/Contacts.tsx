import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { UserPlus, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContacts, useCreateContact, useDeleteContact, useMarkContactReviewed, useBulkMarkContactsReviewed } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import type { Contact, ContactCategory } from "@/types";
import { INTERACTION_TYPE_LABELS, CATEGORY_LABELS } from "@/types";
import { toast } from "sonner";

const REVIEW_EXPIRY_DAYS = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MM/dd/yyyy");
  } catch {
    return "—";
  }
}

function fullName(c: Contact) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

function isReviewedActive(reviewedAt: string | null | undefined): boolean {
  if (!reviewedAt) return false;
  return differenceInDays(new Date(), new Date(reviewedAt)) < REVIEW_EXPIRY_DAYS;
}

type ReviewFilter = "all" | "not_reviewed" | "reviewed";

// ─── Column definitions ───────────────────────────────────────────────────────

const categoryOptions = [
  { label: "Client", value: "client" },
  { label: "Prospect", value: "prospect" },
  { label: "COI", value: "coi" },
  { label: "Vendor", value: "vendor" },
  { label: "Partner", value: "partner" },
  { label: "Other", value: "other" },
];

const interactionTypeOptions = [
  { label: "Email", value: "email" },
  { label: "Call", value: "call" },
  { label: "Meeting", value: "meeting" },
  { label: "SMS", value: "sms" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Note", value: "note" },
  { label: "Agent Outreach", value: "agent_outreach" },
];

function buildColumns(
  navigate: ReturnType<typeof useNavigate>,
  onMarkReviewed: (id: string) => void,
): DataTableColumn<Contact>[] {
  return [
    {
      id: "reviewed",
      header: "Reviewed",
      size: 80,
      enableSorting: false,
      accessorFn: (row) => isReviewedActive(row.reviewed_at) ? "yes" : "no",
      cell: ({ row }) => {
        const active = isReviewedActive(row.original.reviewed_at);
        if (active) {
          const daysAgo = differenceInDays(new Date(), new Date(row.original.reviewed_at!));
          const daysLeft = REVIEW_EXPIRY_DAYS - daysAgo;
          return (
            <span className="flex items-center gap-1 text-emerald-600" title={`Reviewed — expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}>
              <CheckCircle2 size={15} />
              <span className="text-xs">{daysLeft}d</span>
            </span>
          );
        }
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkReviewed(row.original.id); }}
            className="text-muted-foreground hover:text-emerald-600 transition-colors"
            title="Mark as reviewed"
          >
            <Circle size={15} />
          </button>
        );
      },
    },
    {
      id: "name",
      header: "Name",
      accessorFn: (row) => fullName(row),
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <button
          className="font-medium text-primary hover:underline text-left"
          onClick={() => navigate(`/contacts/${row.original.id}`)}
        >
          {fullName(row.original)}
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
      id: "categories",
      header: "Category",
      accessorFn: (row) => ((row as any).categories ?? []).join(", "),
      filterMeta: { type: "select", options: categoryOptions },
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true;
        const cats: string[] = (row.original as any).categories ?? [];
        return cats.includes(filterValue as string);
      },
      cell: ({ row }) => {
        const cats: string[] = (row.original as any).categories ?? [];
        if (!cats.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <Badge key={c} variant="outline" className="text-xs capitalize">
                {c}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      filterMeta: { type: "text" },
      cell: ({ getValue }) =>
        (getValue() as string) || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      filterMeta: { type: "text" },
      cell: ({ getValue }) => {
        const email = getValue() as string | undefined;
        if (!email) return <span className="text-muted-foreground">—</span>;
        return (
          <a href={`mailto:${email}`} className="hover:underline text-primary">
            {email}
          </a>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      filterMeta: { type: "text" },
      cell: ({ getValue }) =>
        (getValue() as string) || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "last_contacted_at",
      header: "Last Contact",
      filterMeta: { type: "date" },
      cell: ({ getValue }) => formatDate(getValue() as string),
      sortingFn: "datetime",
    },
    {
      accessorKey: "last_contact_type",
      header: "Last Contact Type",
      filterMeta: { type: "select", options: interactionTypeOptions },
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        if (!v) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge variant="secondary" className="text-xs">
            {INTERACTION_TYPE_LABELS[v as keyof typeof INTERACTION_TYPE_LABELS] ?? v}
          </Badge>
        );
      },
    },
    {
      id: "tags",
      header: "Tags",
      accessorFn: (row) => ((row as any).tags ?? []).map((t: any) => t.name).join(", "),
      filterMeta: { type: "text" },
      cell: ({ row }) => {
        const tags: any[] = (row.original as any).tags ?? [];
        if (!tags.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge
                key={t.id}
                style={{ backgroundColor: t.color ?? "#6366f1", color: "#fff" }}
                className="text-xs"
              >
                {t.name}
              </Badge>
            ))}
          </div>
        );
      },
    },
  ];
}

// ─── Export row mapper ────────────────────────────────────────────────────────

function toExportRow(c: Contact): Record<string, unknown> {
  return {
    First: c.first_name ?? "",
    Last: c.last_name ?? "",
    Company: (c as any).company?.name ?? "",
    Categories: ((c as any).categories ?? []).join("; "),
    Title: c.title ?? "",
    Email: c.email ?? "",
    Phone: c.phone ?? "",
    "Last Contact": formatDate(c.last_contacted_at),
    "Last Contact Type": c.last_contact_type ?? "",
    Tags: ((c as any).tags ?? []).map((t: any) => t.name).join("; "),
  };
}

// ─── Create Contact Dialog ───────────────────────────────────────────────────

const ALL_CATEGORIES: ContactCategory[] = [
  "prospect",
  "client",
  "center_of_influence",
  "former_client",
  "personal",
];

function CreateContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const createContact = useCreateContact();
  const { data: companies = [] } = useCompanies();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    title: "",
    email: "",
    phone: "",
    company_id: "",
    linkedin_url: "",
    description: "",
    city: "",
    state: "",
    category: "" as ContactCategory | "",
  });

  function handleCreate() {
    if (!form.first_name.trim() && !form.last_name.trim()) {
      toast.error("Name is required");
      return;
    }
    const { category, ...rest } = form;
    createContact.mutate(
      {
        ...rest,
        company_id: rest.company_id || null,
        categories: category ? [category] : [],
      },
      {
        onSuccess: (data) => {
          toast.success("Contact created");
          setForm({
            first_name: "",
            last_name: "",
            title: "",
            email: "",
            phone: "",
            company_id: "",
            linkedin_url: "",
            description: "",
            city: "",
            state: "",
            category: "",
          });
          onOpenChange(false);
          if (data?.id) navigate(`/contacts/${data.id}`);
        },
        onError: () => toast.error("Failed to create contact"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>First Name *</Label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Last Name *</Label>
            <Input
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Company</Label>
            <Select
              value={form.company_id || "__none__"}
              onValueChange={(v) => setForm((f) => ({ ...f, company_id: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select
              value={form.category || "__none__"}
              onValueChange={(v) => setForm((f) => ({ ...f, category: (v === "__none__" ? "" : v) as ContactCategory | "" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
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
          <Button onClick={handleCreate} disabled={createContact.isPending}>
            Create Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function AlphabetBar({ active, onChange }: { active: string | null; onChange: (l: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        size="sm"
        variant={active === null ? "default" : "ghost"}
        className="h-7 w-9 text-xs px-0"
        onClick={() => onChange(null)}
      >
        All
      </Button>
      {ALPHA.map((l) => (
        <Button
          key={l}
          size="sm"
          variant={active === l ? "default" : "ghost"}
          className="h-7 w-7 text-xs px-0"
          onClick={() => onChange(active === l ? null : l)}
        >
          {l}
        </Button>
      ))}
    </div>
  );
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts();
  const [createOpen, setCreateOpen] = useState(false);
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("not_reviewed");
  const deleteContact = useDeleteContact();
  const markReviewed = useMarkContactReviewed();
  const bulkMarkReviewed = useBulkMarkContactsReviewed();

  const handleMarkReviewed = useCallback((id: string) => {
    markReviewed.mutate(id, {
      onSuccess: () => toast.success("Contact marked as reviewed for 30 days"),
      onError: () => toast.error("Failed to mark as reviewed"),
    });
  }, [markReviewed]);

  const columns = useMemo(() => buildColumns(navigate, handleMarkReviewed), [navigate, handleMarkReviewed]);

  const filtered = useMemo(() => {
    let result = contacts;

    // Review filter
    if (reviewFilter === "reviewed") {
      result = result.filter((c) => isReviewedActive(c.reviewed_at));
    } else if (reviewFilter === "not_reviewed") {
      result = result.filter((c) => !isReviewedActive(c.reviewed_at));
    }

    // Alphabet filter
    if (letterFilter) {
      result = result.filter((c) => {
        const name = (c.last_name || c.first_name || "").toUpperCase();
        return name.startsWith(letterFilter);
      });
    }

    return result;
  }, [contacts, letterFilter, reviewFilter]);

  const reviewedCount = useMemo(
    () => contacts.filter((c) => isReviewedActive(c.reviewed_at)).length,
    [contacts]
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${filtered.length} contacts${letterFilter ? ` (${letterFilter})` : ""}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading contacts…
        </div>
      ) : (
        <>
          {/* Review filter tabs */}
          <div className="flex items-center gap-4">
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              {([
                { key: "not_reviewed" as const, label: "Not Reviewed", count: contacts.length - reviewedCount },
                { key: "reviewed" as const, label: "Reviewed", count: reviewedCount },
                { key: "all" as const, label: "All", count: contacts.length },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setReviewFilter(tab.key)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    reviewFilter === tab.key
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">{tab.count}</span>
                </button>
              ))}
            </div>
            {reviewFilter === "not_reviewed" && filtered.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                disabled={bulkMarkReviewed.isPending}
                onClick={() => {
                  const ids = filtered.map((c) => c.id);
                  bulkMarkReviewed.mutate(ids, {
                    onSuccess: () => toast.success(`${ids.length} contact(s) marked as reviewed`),
                    onError: () => toast.error("Failed to mark contacts as reviewed"),
                  });
                }}
              >
                <CheckCircle2 size={13} />
                Mark all visible as reviewed
              </Button>
            )}
          </div>

          <AlphabetBar active={letterFilter} onChange={setLetterFilter} />
          <DataTable
            data={filtered}
            columns={columns}
            exportName="contacts"
            toExportRow={toExportRow}
            searchPlaceholder="Search contacts…"
            onBulkDelete={(ids) => {
              Promise.all(ids.map((id) => deleteContact.mutateAsync(id)))
                .then(() => toast.success(`${ids.length} contact(s) deleted`))
                .catch(() => toast.error("Failed to delete some contacts"));
            }}
          />
        </>
      )}

      <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
