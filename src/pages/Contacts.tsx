import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { UserPlus, CheckCircle2, Circle, Mail, ExternalLink, Snowflake, ChevronsUpDown, Check, Plus, Pencil } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useQueryClient } from "@tanstack/react-query";
import { useContacts, useCreateContact, useUpdateContact, useMarkContactReviewed, useUnmarkContactReviewed, useToggleContactCold } from "@/hooks/useContacts";
import { supabase } from "@/lib/supabase";
import { useCompanies, useCreateCompany } from "@/hooks/useCompanies";
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

type ReviewFilter = "all" | "not_reviewed" | "reviewed" | "cold";

// ─── Inline editing cells ────────────────────────────────────────────────────

function InlineEditText({
  value,
  onSave,
  placeholder,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (text.trim() !== value) onSave(text.trim());
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-full bg-transparent border-b border-primary/40 outline-none text-sm py-0.5 px-0"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setText(value); setEditing(false); }
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-text hover:bg-muted/60 rounded px-1 -mx-1 py-0.5 ${className ?? "text-sm"}`}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground">{placeholder ?? "—"}</span>}
    </span>
  );
}

function InlineEditName({
  contact,
  onSave,
  navigate,
}: {
  contact: Contact;
  onSave: (updates: { first_name?: string; last_name?: string }) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(contact.first_name ?? "");
  const [last, setLast] = useState(contact.last_name ?? "");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setFirst(contact.first_name ?? ""); setLast(contact.last_name ?? ""); }, [contact.first_name, contact.last_name]);
  useEffect(() => { if (editing) firstRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    const updates: { first_name?: string; last_name?: string } = {};
    if (first.trim() !== (contact.first_name ?? "")) updates.first_name = first.trim();
    if (last.trim() !== (contact.last_name ?? "")) updates.last_name = last.trim();
    if (Object.keys(updates).length > 0) onSave(updates);
  }

  if (editing) {
    return (
      <div className="flex gap-1">
        <input
          ref={firstRef}
          className="w-20 bg-transparent border-b border-primary/40 outline-none text-sm py-0.5 px-0"
          value={first}
          placeholder="First"
          onChange={(e) => setFirst(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setFirst(contact.first_name ?? ""); setLast(contact.last_name ?? ""); setEditing(false); }
          }}
        />
        <input
          className="w-20 bg-transparent border-b border-primary/40 outline-none text-sm py-0.5 px-0"
          value={last}
          placeholder="Last"
          onChange={(e) => setLast(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setFirst(contact.first_name ?? ""); setLast(contact.last_name ?? ""); setEditing(false); }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => navigate(`/contacts/${contact.id}`)}
        className="font-medium text-sm text-primary hover:underline text-left"
        title="Open contact"
      >
        {fullName(contact) || <span className="text-muted-foreground">—</span>}
      </button>
      <button
        onClick={() => setEditing(true)}
        className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
        title="Edit name"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}

function InlineEditSelect({
  value,
  options,
  onSave,
  renderValue,
}: {
  value: string;
  options: { label: string; value: string }[];
  onSave: (v: string) => void;
  renderValue?: (v: string) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { if (editing) selectRef.current?.focus(); }, [editing]);

  function commit(newVal: string) {
    setEditing(false);
    if (newVal !== value) onSave(newVal);
  }

  if (editing) {
    return (
      <select
        ref={selectRef}
        className="bg-transparent border-b border-primary/40 outline-none text-sm py-0.5 px-0 cursor-pointer"
        defaultValue={value}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setEditing(false)}
      >
        <option value="">None</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-muted/60 rounded px-1 -mx-1 py-0.5 inline-block"
      title="Click to edit"
    >
      {value && renderValue ? renderValue(value) : value ? <span className="text-sm">{value}</span> : <span className="text-muted-foreground text-sm">—</span>}
    </span>
  );
}

function InlineCompanySelect({
  value,
  companies,
  onSave,
  onCreateCompany,
}: {
  value: string;
  companies: { id: string; name: string }[];
  onSave: (companyId: string) => void;
  onCreateCompany: (name: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = companies.find((c) => c.id === value);

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const newId = await onCreateCompany(trimmed);
      onSave(newId);
      setOpen(false);
      setCreating(false);
      setNewName("");
    } finally {
      setSubmitting(false);
    }
  }

  if (creating) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Company name…"
          className="h-7 text-sm w-40"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
            if (e.key === "Escape") { setCreating(false); setNewName(""); }
          }}
          disabled={submitting}
        />
        <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={handleCreate} disabled={submitting || !newName.trim()}>
          Add
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setCreating(false); setNewName(""); }}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="cursor-pointer hover:bg-muted/60 rounded px-1 -mx-1 py-0.5 inline-flex items-center gap-1 text-left"
          title="Click to change company"
        >
          <span className="text-sm">{selected?.name ?? <span className="text-muted-foreground">—</span>}</span>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground opacity-0 group-hover/row:opacity-100" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search companies…" />
          <CommandList>
            <CommandEmpty>No companies found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => { onSave(""); setOpen(false); }}
              >
                <span className="text-muted-foreground">None</span>
                {!value && <Check className="ml-auto h-3.5 w-3.5" />}
              </CommandItem>
              {companies.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => { onSave(c.id); setOpen(false); }}
                >
                  {c.name}
                  {c.id === value && <Check className="ml-auto h-3.5 w-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => { setOpen(false); setCreating(true); }}
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Create new company…
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const categoryOptions = [
  { label: "Client", value: "client" },
  { label: "Prospect", value: "prospect" },
  { label: "Center of Influence", value: "center_of_influence" },
  { label: "Former Client", value: "former_client" },
  { label: "Referral", value: "personal" },
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

interface ColumnHandlers {
  navigate: ReturnType<typeof useNavigate>;
  onMarkReviewed: (id: string) => void;
  onUnmarkReviewed: (id: string) => void;
  onUpdateContact: (id: string, updates: Record<string, unknown>) => void;
  onSetCategory: (contactId: string, category: string) => void;
  onToggleCold: (id: string, isCold: boolean) => void;
  onCreateCompany: (name: string) => Promise<string>;
  companies: { id: string; name: string }[];
  showColdColumn: boolean;
}

function buildColumns(h: ColumnHandlers): DataTableColumn<Contact>[] {
  const cols: DataTableColumn<Contact>[] = [];

  // In cold view, show a "Restore" action instead of reviewed
  if (h.showColdColumn) {
    cols.push({
      id: "cold_action",
      header: "",
      size: 70,
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); h.onToggleCold(row.original.id, false); }}
          className="text-xs text-blue-500 hover:text-blue-700 transition-colors font-medium"
          title="Restore to active contacts"
        >
          Restore
        </button>
      ),
    });
  } else {
    cols.push({
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
            <button
              onClick={(e) => { e.stopPropagation(); h.onUnmarkReviewed(row.original.id); }}
              className="flex items-center gap-1 text-emerald-600 hover:text-muted-foreground transition-colors"
              title="Click to unmark as reviewed"
            >
              <CheckCircle2 size={15} />
              <span className="text-xs">{daysLeft}d</span>
            </button>
          );
        }
        return (
          <button
            onClick={(e) => { e.stopPropagation(); h.onMarkReviewed(row.original.id); }}
            className="text-muted-foreground hover:text-emerald-600 transition-colors"
            title="Mark as reviewed"
          >
            <Circle size={15} />
          </button>
        );
      },
    });

    // Cold toggle button — only in non-cold views
    cols.push({
      id: "cold_action",
      header: "",
      size: 50,
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); h.onToggleCold(row.original.id, true); }}
          className="text-muted-foreground hover:text-blue-500 transition-colors opacity-0 group-hover/row:opacity-100"
          title="Move to Cold Contacts"
        >
          <Snowflake size={14} />
        </button>
      ),
    });
  }

  cols.push({
      id: "name",
      header: "Name",
      accessorFn: (row) => fullName(row),
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <InlineEditName
          contact={row.original}
          onSave={(updates) => h.onUpdateContact(row.original.id, updates)}
          navigate={h.navigate}
        />
      ),
    },
    {
      id: "company",
      header: "Company",
      accessorFn: (row) => (row as any).company?.name ?? "",
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <InlineCompanySelect
          value={row.original.company_id ?? ""}
          companies={h.companies}
          onSave={(v) => h.onUpdateContact(row.original.id, { company_id: v || null })}
          onCreateCompany={h.onCreateCompany}
        />
      ),
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
        return (
          <InlineEditSelect
            value={cats[0] ?? ""}
            options={categoryOptions}
            onSave={(v) => h.onSetCategory(row.original.id, v)}
            renderValue={(v) => (
              <Badge variant="outline" className="text-xs capitalize">
                {CATEGORY_LABELS[v as ContactCategory] ?? v}
              </Badge>
            )}
          />
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <InlineEditText
          value={row.original.title ?? ""}
          onSave={(v) => h.onUpdateContact(row.original.id, { title: v || null })}
          placeholder="—"
        />
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      filterMeta: { type: "text" },
      cell: ({ row }) => {
        const email = row.original.email;
        return (
          <div className="flex items-center gap-1.5">
            {email && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(email);
                  toast.success("Email copied to clipboard");
                }}
                className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                title="Copy email to clipboard"
              >
                <Mail size={13} />
              </button>
            )}
            <InlineEditText
              value={email ?? ""}
              onSave={(v) => h.onUpdateContact(row.original.id, { email: v || null })}
              placeholder="—"
              className="text-sm text-primary"
            />
          </div>
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
    });

  return cols;
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
  const qc = useQueryClient();
  const { data: contacts = [], isLoading } = useContacts();
  const { data: companies = [] } = useCompanies();
  const [createOpen, setCreateOpen] = useState(false);
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("not_reviewed");
  const updateContact = useUpdateContact();
  const createCompany = useCreateCompany();
  const markReviewed = useMarkContactReviewed();
  const unmarkReviewed = useUnmarkContactReviewed();
  const toggleCold = useToggleContactCold();

  const handleToggleCold = useCallback((id: string, isCold: boolean) => {
    toggleCold.mutate(
      { contactId: id, isCold },
      {
        onSuccess: () => toast.success(isCold ? "Moved to Cold Contacts" : "Restored to active contacts"),
        onError: () => toast.error("Failed to update contact"),
      }
    );
  }, [toggleCold]);

  const handleMarkReviewed = useCallback((id: string) => {
    markReviewed.mutate(id, {
      onSuccess: () => toast.success("Contact marked as reviewed for 30 days"),
      onError: () => toast.error("Failed to mark as reviewed"),
    });
  }, [markReviewed]);

  const handleUnmarkReviewed = useCallback((id: string) => {
    unmarkReviewed.mutate(id, {
      onSuccess: () => toast.success("Contact moved back to not reviewed"),
      onError: () => toast.error("Failed to update review status"),
    });
  }, [unmarkReviewed]);

  const handleUpdateContact = useCallback((id: string, updates: Record<string, unknown>) => {
    updateContact.mutate(
      { id, ...updates } as Parameters<typeof updateContact.mutate>[0],
      {
        onSuccess: () => toast.success("Contact updated"),
        onError: () => toast.error("Failed to update contact"),
      }
    );
  }, [updateContact]);

  const handleSetCategory = useCallback(async (contactId: string, category: string) => {
    try {
      await supabase.from("contact_categories").delete().eq("contact_id", contactId);
      if (category) {
        await supabase.from("contact_categories").insert({ contact_id: contactId, category: category as ContactCategory });
      }
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Category updated");
    } catch {
      toast.error("Failed to update category");
    }
  }, [qc]);

  const handleCreateCompany = useCallback(async (name: string): Promise<string> => {
    const result = await createCompany.mutateAsync({ name });
    toast.success(`Company "${name}" created`);
    return (result as { id: string }).id;
  }, [createCompany]);

  const columns = useMemo(
    () => buildColumns({ navigate, onMarkReviewed: handleMarkReviewed, onUnmarkReviewed: handleUnmarkReviewed, onUpdateContact: handleUpdateContact, onSetCategory: handleSetCategory, onToggleCold: handleToggleCold, onCreateCompany: handleCreateCompany, companies, showColdColumn: reviewFilter === "cold" }),
    [navigate, handleMarkReviewed, handleUnmarkReviewed, handleUpdateContact, handleSetCategory, handleToggleCold, handleCreateCompany, companies, reviewFilter]
  );

  // Split contacts into active (non-cold) and cold
  const activeContacts = useMemo(() => contacts.filter((c) => !c.is_cold), [contacts]);
  const coldContacts = useMemo(() => contacts.filter((c) => c.is_cold), [contacts]);

  const filtered = useMemo(() => {
    let result: Contact[];

    if (reviewFilter === "cold") {
      result = coldContacts;
    } else {
      result = activeContacts;
      // Review filter (only applies to active contacts)
      if (reviewFilter === "reviewed") {
        result = result.filter((c) => isReviewedActive(c.reviewed_at));
      } else if (reviewFilter === "not_reviewed") {
        result = result.filter((c) => !isReviewedActive(c.reviewed_at));
      }
    }

    // Alphabet filter
    if (letterFilter) {
      result = result.filter((c) => {
        const name = (c.last_name || c.first_name || "").toUpperCase();
        return name.startsWith(letterFilter);
      });
    }

    return result;
  }, [activeContacts, coldContacts, letterFilter, reviewFilter]);

  const reviewedCount = useMemo(
    () => activeContacts.filter((c) => isReviewedActive(c.reviewed_at)).length,
    [activeContacts]
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
                { key: "not_reviewed" as const, label: "Not Reviewed", count: activeContacts.length - reviewedCount },
                { key: "reviewed" as const, label: "Reviewed", count: reviewedCount },
                { key: "all" as const, label: "All", count: activeContacts.length },
                { key: "cold" as const, label: "Cold Contacts", count: coldContacts.length },
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
                  {tab.key === "cold" && <Snowflake size={12} className="inline mr-1" />}
                  {tab.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          <AlphabetBar active={letterFilter} onChange={setLetterFilter} />
          <DataTable
            data={filtered}
            columns={columns}
            exportName="contacts"
            toExportRow={toExportRow}
            searchPlaceholder="Search contacts…"
            showPagination={false}
          />
        </>
      )}

      <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
