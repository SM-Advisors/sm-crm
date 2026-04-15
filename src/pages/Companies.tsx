import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
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
import { useCompanies, useCreateCompany, useUpdateCompany } from "@/hooks/useCompanies";
import type { Company } from "@/types";
import { toast } from "sonner";

// ─── Inline edit cell ────────────────────────────────────────────────────────

function InlineEditCell({
  value,
  companyId,
  field,
  onSave,
  isLink,
}: {
  value: string | null | undefined;
  companyId: string;
  field: string;
  onSave: (id: string, field: string, value: string) => void;
  isLink?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "")) {
      onSave(companyId, field, trimmed);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          className="h-7 text-sm px-1.5 py-0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
        />
      </div>
    );
  }

  if (isLink && value) {
    const href = value.startsWith("http") ? value : `https://${value}`;
    return (
      <div className="group flex items-center gap-1.5">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline truncate"
        >
          {value.replace(/^https?:\/\//, "")}
        </a>
        <button
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setDraft(value ?? "");
            setEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-1.5">
      <span className={value ? "" : "text-muted-foreground"}>{value || "—"}</span>
      <button
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value ?? "");
          setEditing(true);
        }}
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

function buildColumns(
  navigate: ReturnType<typeof useNavigate>,
  onSave: (id: string, field: string, value: string) => void
): DataTableColumn<Company>[] {
  return [
    {
      accessorKey: "name",
      header: "Company Name",
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <button
          className="font-medium text-primary hover:underline text-left"
          onClick={() => navigate(`/companies/${row.original.id}`)}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: "industry",
      header: "Industry",
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <InlineEditCell
          value={row.original.industry}
          companyId={row.original.id}
          field="industry"
          onSave={onSave}
        />
      ),
    },
    {
      accessorKey: "website",
      header: "Website",
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <InlineEditCell
          value={row.original.website}
          companyId={row.original.id}
          field="website"
          onSave={onSave}
          isLink
        />
      ),
    },
    {
      accessorKey: "city",
      header: "City",
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <InlineEditCell
          value={row.original.city}
          companyId={row.original.id}
          field="city"
          onSave={onSave}
        />
      ),
    },
    {
      accessorKey: "state",
      header: "State",
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <InlineEditCell
          value={row.original.state}
          companyId={row.original.id}
          field="state"
          onSave={onSave}
        />
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      filterMeta: { type: "text" },
      cell: ({ row }) => (
        <InlineEditCell
          value={row.original.phone}
          companyId={row.original.id}
          field="phone"
          onSave={onSave}
        />
      ),
    },
    {
      id: "contact_count",
      header: "Contacts",
      accessorFn: (row) => (row as Company & { contact_count?: number }).contact_count ?? 0,
      filterMeta: { type: "number" },
      cell: ({ getValue }) => (
        <span className="tabular-nums">{getValue() as number}</span>
      ),
    },
    {
      id: "tags",
      header: "Tags",
      accessorFn: (row) => ((row as Company & { tags?: { name: string }[] }).tags ?? []).map((t) => t.name).join(", "),
      filterMeta: { type: "text" },
      cell: ({ row }) => {
        const tags = ((row.original as Company & { tags?: { id: string; name: string; color: string }[] }).tags ?? []);
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

// ─── Export mapper ────────────────────────────────────────────────────────────

function toExportRow(c: Company): Record<string, unknown> {
  return {
    Name: c.name,
    Industry: c.industry ?? "",
    Website: c.website ?? "",
    City: c.city ?? "",
    State: c.state ?? "",
    Phone: c.phone ?? "",
    Tags: ((c as Company & { tags?: { name: string }[] }).tags ?? []).map((t) => t.name).join("; "),
  };
}

// ─── Create Company Dialog ───────────────────────────────────────────────────

function CreateCompanyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const createCompany = useCreateCompany();

  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    phone: "",
    city: "",
    state: "",
    zip: "",
    description: "",
  });

  function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    createCompany.mutate(form, {
      onSuccess: (data) => {
        toast.success("Company created");
        setForm({ name: "", industry: "", website: "", phone: "", city: "", state: "", zip: "", description: "" });
        onOpenChange(false);
        if (data?.id) navigate(`/companies/${data.id}`);
      },
      onError: () => toast.error("Failed to create company"),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Company</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Company Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Industry</Label>
            <Input
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Website</Label>
            <Input
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
          <div className="flex flex-col gap-1.5">
            <Label>ZIP</Label>
            <Input
              value={form.zip}
              onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createCompany.isPending}>
            Create Company
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

export default function CompaniesPage() {
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useCompanies();
  const updateCompany = useUpdateCompany();
  const [createOpen, setCreateOpen] = useState(false);
  const [letterFilter, setLetterFilter] = useState<string | null>(null);

  function handleInlineSave(id: string, field: string, value: string) {
    updateCompany.mutate(
      { id, [field]: value || null } as Partial<Company> & { id: string },
      {
        onSuccess: () => toast.success("Updated"),
        onError: () => toast.error("Failed to update"),
      }
    );
  }

  const columns = useMemo(
    () => buildColumns(navigate, handleInlineSave),
    [navigate]
  );

  const filtered = useMemo(() => {
    if (!letterFilter) return companies;
    return companies.filter((c) => c.name?.toUpperCase().startsWith(letterFilter));
  }, [companies, letterFilter]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${filtered.length} companies${letterFilter ? ` (${letterFilter})` : ""}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading companies…
        </div>
      ) : (
        <>
          <AlphabetBar active={letterFilter} onChange={setLetterFilter} />
          <DataTable
            data={filtered}
            columns={columns}
            exportName="companies"
            toExportRow={toExportRow}
            searchPlaceholder="Search companies…"
            showPagination={false}
          />
        </>
      )}

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
