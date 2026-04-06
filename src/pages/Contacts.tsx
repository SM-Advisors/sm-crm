import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { useContacts } from "@/hooks/useContacts";
import type { Contact } from "@/types";
import { INTERACTION_TYPE_LABELS } from "@/types";

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

function buildColumns(navigate: ReturnType<typeof useNavigate>): DataTableColumn<Contact>[] {
  return [
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts();
  const columns = useMemo(() => buildColumns(navigate), [navigate]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${contacts.length} contacts`}
          </p>
        </div>
        <Button onClick={() => navigate("/contacts/new")} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading contacts…
        </div>
      ) : (
        <DataTable
          data={contacts}
          columns={columns}
          exportName="contacts"
          toExportRow={toExportRow}
          searchPlaceholder="Search contacts…"
        />
      )}
    </div>
  );
}
