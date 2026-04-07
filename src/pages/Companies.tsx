import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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
import { useCompanies, useCreateCompany, useDeleteCompany } from "@/hooks/useCompanies";
import type { Company } from "@/types";
import { toast } from "sonner";

// ─── Column definitions ───────────────────────────────────────────────────────

function buildColumns(navigate: ReturnType<typeof useNavigate>): DataTableColumn<Company>[] {
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
      cell: ({ getValue }) =>
        (getValue() as string) || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "website",
      header: "Website",
      filterMeta: { type: "text" },
      cell: ({ getValue }) => {
        const url = getValue() as string | undefined;
        if (!url) return <span className="text-muted-foreground">—</span>;
        return (
          <a
            href={url.startsWith("http") ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {url.replace(/^https?:\/\//, "")}
          </a>
        );
      },
    },
    {
      accessorKey: "city",
      header: "City",
      filterMeta: { type: "text" },
      cell: ({ getValue }) =>
        (getValue() as string) || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "state",
      header: "State",
      filterMeta: { type: "text" },
      cell: ({ getValue }) =>
        (getValue() as string) || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      filterMeta: { type: "text" },
      cell: ({ getValue }) =>
        (getValue() as string) || <span className="text-muted-foreground">—</span>,
    },
    {
      id: "contact_count",
      header: "Contacts",
      accessorFn: (row) => (row as any).contact_count ?? 0,
      filterMeta: { type: "number" },
      cell: ({ getValue }) => (
        <span className="tabular-nums">{getValue() as number}</span>
      ),
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

// ─── Export mapper ────────────────────────────────────────────────────────────

function toExportRow(c: Company): Record<string, unknown> {
  return {
    Name: c.name,
    Industry: c.industry ?? "",
    Website: c.website ?? "",
    City: c.city ?? "",
    State: c.state ?? "",
    Phone: c.phone ?? "",
    Tags: ((c as any).tags ?? []).map((t: any) => t.name).join("; "),
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

export default function CompaniesPage() {
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useCompanies();
  const columns = useMemo(() => buildColumns(navigate), [navigate]);
  const [createOpen, setCreateOpen] = useState(false);
  const deleteCompany = useDeleteCompany();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${companies.length} companies`}
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
        <DataTable
          data={companies}
          columns={columns}
          exportName="companies"
          toExportRow={toExportRow}
          searchPlaceholder="Search companies…"
          onBulkDelete={(ids) => {
            Promise.all(ids.map((id) => deleteCompany.mutateAsync(id)))
              .then(() => toast.success(`${ids.length} company(ies) deleted`))
              .catch(() => toast.error("Failed to delete some companies"));
          }}
        />
      )}

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
