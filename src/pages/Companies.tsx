import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { useCompanies } from "@/hooks/useCompanies";
import type { Company } from "@/types";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useCompanies();
  const columns = useMemo(() => buildColumns(navigate), [navigate]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${companies.length} companies`}
          </p>
        </div>
        <Button onClick={() => navigate("/companies/new")} className="gap-2">
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
        />
      )}
    </div>
  );
}
