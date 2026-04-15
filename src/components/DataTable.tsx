import { useState, useMemo, useCallback, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type FilterFn,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Filter,
  X,
  Trash2,
} from "lucide-react";

// ─── Filter meta types ────────────────────────────────────────────────────────

export type ColumnFilterMeta =
  | { type: "text" }
  | { type: "select"; options: { label: string; value: string }[] }
  | { type: "date" }
  | { type: "number" };

// ─── Column definition extension ─────────────────────────────────────────────

export type DataTableColumn<T> = ColumnDef<T> & {
  filterMeta?: ColumnFilterMeta;
};

// ─── CSV export helpers ───────────────────────────────────────────────────────

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return JSON.stringify(value);
}

function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const header = keys.map((k) => JSON.stringify(k)).join(",");
  const body = rows
    .map((row) =>
      keys.map((k) => JSON.stringify(cellToString(row[k]))).join(",")
    )
    .join("\n");
  const blob = new Blob([header + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Custom filter function (case-insensitive string includes) ────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fuzzyFilter: FilterFn<any> = (row, columnId, value) => {
  const cellValue = row.getValue(columnId);
  if (value === "" || value === undefined || value === null) return true;
  const str = cellToString(cellValue).toLowerCase();
  return str.includes(String(value).toLowerCase());
};

// ─── Column filter control ────────────────────────────────────────────────────

function ColumnFilterControl({
  columnId,
  meta,
  value,
  onChange,
}: {
  columnId: string;
  meta?: ColumnFilterMeta;
  value: string;
  onChange: (val: string) => void;
}) {
  const type = meta?.type ?? "text";

  if (type === "select" && meta?.type === "select") {
    return (
      <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
        <SelectTrigger className="h-8 text-xs w-full">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          {meta.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (type === "date") {
    return (
      <Input
        type="date"
        className="h-8 text-xs w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === "number") {
    return (
      <Input
        type="number"
        placeholder="Filter…"
        className="h-8 text-xs w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <Input
      placeholder="Filter…"
      className="h-8 text-xs w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** Key used in the export CSV filename, e.g. "contacts" */
  exportName?: string;
  /** Convert a row to a flat object for CSV export */
  toExportRow?: (row: T) => Record<string, unknown>;
  /** Placeholder text for the global search box */
  searchPlaceholder?: string;
  /** Extra JSX rendered to the right of the search bar */
  actions?: React.ReactNode;
  /** Enable row selection with bulk delete. Receives array of selected row IDs. */
  onBulkDelete?: (ids: string[]) => void;
  /** Accessor to get the row ID for bulk operations. Defaults to (row as any).id */
  getRowId?: (row: T) => string;
  /** Default page size. Defaults to 25. */
  defaultPageSize?: number;
  /** When false, hides all pagination controls and shows all rows. Defaults to true. */
  showPagination?: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DataTable<T>({
  data,
  columns,
  exportName = "export",
  toExportRow,
  searchPlaceholder = "Search…",
  actions,
  onBulkDelete,
  getRowId,
  defaultPageSize = 25,
  showPagination = true,
}: DataTableProps<T>) {
  const effectivePageSize = showPagination ? defaultPageSize : data.length || 1;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: effectivePageSize });
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Keep pageSize in sync with data length when pagination is hidden
  useEffect(() => {
    if (!showPagination) {
      setPagination((p) => ({ ...p, pageSize: data.length || 1, pageIndex: 0 }));
    }
  }, [showPagination, data.length]);

  const resolveRowId = getRowId ?? ((row: T) => (row as Record<string, unknown>).id as string);

  // Build a map of columnId → filterMeta for easy lookup
  const filterMetaMap = useMemo(() => {
    const map: Record<string, ColumnFilterMeta | undefined> = {};
    for (const col of columns) {
      const id =
        (col as { accessorKey?: string }).accessorKey ??
        (typeof col.id === "string" ? col.id : undefined);
      if (id) map[id] = (col as DataTableColumn<T>).filterMeta;
    }
    return map;
  }, [columns]);

  // Prepend checkbox column if bulk delete is enabled
  const allColumns = useMemo(() => {
    if (!onBulkDelete) return columns as ColumnDef<T>[];
    const selectCol: ColumnDef<T> = {
      id: "_select",
      header: ({ table: t }) => (
        <input
          type="checkbox"
          className="rounded border-border"
          checked={t.getIsAllPageRowsSelected()}
          onChange={t.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-border"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    };
    return [selectCol, ...(columns as ColumnDef<T>[])];
  }, [columns, onBulkDelete]);

  const table = useReactTable({
    data,
    columns: allColumns as ColumnDef<unknown>[],
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter as FilterFn<unknown>,
    state: { sorting, columnFilters, globalFilter, pagination, rowSelection },
    autoResetPageIndex: false,
    enableRowSelection: !!onBulkDelete,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getRowId: (row) => resolveRowId(row as T),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Active filter count (column filters only — global search is separate)
  const activeFilterCount = columnFilters.filter((f) => f.value !== "").length;

  const handleExportView = useCallback(() => {
    const rows = table
      .getFilteredRowModel()
      .rows.map((r) =>
        toExportRow ? toExportRow(r.original as T) : (r.original as Record<string, unknown>)
      );
    exportToCsv(`${exportName}-view.csv`, rows);
  }, [table, exportName, toExportRow]);

  const handleExportAll = useCallback(() => {
    const rows = data.map((r) =>
      toExportRow ? toExportRow(r) : (r as Record<string, unknown>)
    );
    exportToCsv(`${exportName}-all.csv`, rows);
  }, [data, exportName, toExportRow]);

  const clearAllFilters = useCallback(() => {
    setColumnFilters([]);
    setGlobalFilter("");
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-9 w-56"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowColumnFilters((v) => !v)}
          className="gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {(activeFilterCount > 0 || globalFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        <div className="flex-1" />

        {actions}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1">
            <button
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
              onClick={handleExportView}
            >
              Export current view
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
              onClick={handleExportAll}
            >
              Export all data
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Top pagination controls ── */}
      {showPagination && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) =>
                setPagination((p) => ({ ...p, pageSize: Number(v), pageIndex: 0 }))
              }
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>

          <div className="flex-1" />

          <span>
            {table.getFilteredRowModel().rows.length === 0
              ? "0 rows"
              : `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )} of ${table.getFilteredRowModel().rows.length}`}
          </span>

          {table.getPageCount() > 1 && (
            <div className="flex items-center gap-1">
              <span>Page</span>
              <Select
                value={String(pagination.pageIndex)}
                onValueChange={(v) => setPagination((p) => ({ ...p, pageIndex: Number(v) }))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: table.getPageCount() }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>of {table.getPageCount()}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {onBulkDelete && Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-2">
          <span className="text-sm text-muted-foreground">
            {Object.keys(rowSelection).length} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={() => {
              if (!confirmBulkDelete) {
                setConfirmBulkDelete(true);
                return;
              }
              onBulkDelete(Object.keys(rowSelection));
              setRowSelection({});
              setConfirmBulkDelete(false);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmBulkDelete ? "Confirm Delete" : "Delete Selected"}
          </Button>
          {confirmBulkDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setConfirmBulkDelete(false)}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => { setRowSelection({}); setConfirmBulkDelete(false); }}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* ── Column filter row ── */}
      {showColumnFilters && (
        <div className="flex gap-2 flex-wrap rounded-md border border-border bg-muted/40 p-3">
          {table.getAllColumns().map((col) => {
            if (!col.getCanFilter()) return null;
            const meta = filterMetaMap[col.id];
            const currentFilter = (col.getFilterValue() as string) ?? "";
            return (
              <div key={col.id} className="flex flex-col gap-1 min-w-[140px] max-w-[200px]">
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {col.id.replace(/_/g, " ")}
                </span>
                <ColumnFilterControl
                  columnId={col.id}
                  meta={meta}
                  value={currentFilter}
                  onChange={(v) => col.setFilterValue(v)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      className={canSort ? "cursor-pointer select-none" : ""}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-muted-foreground">
                            {sorted === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30 group/row">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {showPagination && (
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) =>
                setPagination((p) => ({ ...p, pageSize: Number(v), pageIndex: 0 }))
              }
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span>
            {table.getFilteredRowModel().rows.length === 0
              ? "0 rows"
              : `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )} of ${table.getFilteredRowModel().rows.length}`}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
