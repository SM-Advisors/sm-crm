import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, ExternalLink, X, Check, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useEngagementLetterServices,
  useCreateEngagementLetterService,
  useUpdateEngagementLetterService,
  useDeleteEngagementLetterService,
  useEngagementLetters,
  useCreateEngagementLetter,
  useUpdateEngagementLetter,
  useDeleteEngagementLetter,
} from "@/hooks/useEngagementLetters";
import { useCompanies } from "@/hooks/useCompanies";
import type { EngagementLetterService, EngagementLetter } from "@/types";

// ── Service Catalog ────────────────────────────────────────────────────────────

interface ServiceRowProps {
  service: EngagementLetterService;
  onSave: (id: string, updates: Partial<EngagementLetterService>) => void;
  onDelete: (id: string) => void;
}

function ServiceRow({ service, onSave, onDelete }: ServiceRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(service.service_name);
  const [url, setUrl] = useState(service.template_url ?? "");

  function handleSave() {
    onSave(service.id, { service_name: name.trim(), template_url: url.trim() || null });
    setEditing(false);
  }

  function handleCancel() {
    setName(service.service_name);
    setUrl(service.template_url ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5 pl-4">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <Input
            className="h-7 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Service name"
          />
          <Input
            className="h-7 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Template Google Drive URL (optional)"
          />
        </div>
        <button onClick={handleSave} className="text-emerald-600 hover:text-emerald-700 shrink-0">
          <Check size={15} />
        </button>
        <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground shrink-0">
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5 pl-4 group">
      <div className="flex-1 min-w-0">
        <span className="text-sm">{service.service_name}</span>
        {service.template_url && (
          <a
            href={service.template_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
          >
            Template <ExternalLink size={10} />
          </a>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(service.id)}
          className="p-1 text-muted-foreground hover:text-red-600"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  categoryName: string;
  services: EngagementLetterService[];
  onSaveService: (id: string, updates: Partial<EngagementLetterService>) => void;
  onDeleteService: (id: string) => void;
  onAddService: (categoryName: string, serviceName: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
}

function CategorySection({
  categoryName,
  services,
  onSaveService,
  onDeleteService,
  onAddService,
  onRenameCategory,
}: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [addingService, setAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [renamingCategory, setRenamingCategory] = useState(false);
  const [catName, setCatName] = useState(categoryName);

  function handleAddService() {
    if (!newServiceName.trim()) return;
    onAddService(categoryName, newServiceName.trim());
    setNewServiceName("");
    setAddingService(false);
  }

  function handleRenameCategory() {
    if (!catName.trim() || catName.trim() === categoryName) {
      setRenamingCategory(false);
      return;
    }
    onRenameCategory(categoryName, catName.trim());
    setRenamingCategory(false);
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Category header */}
      <div className="flex items-center bg-muted/50 px-3 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {expanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
          {renamingCategory ? (
            <Input
              className="h-6 text-sm font-medium py-0 w-48"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameCategory();
                if (e.key === "Escape") { setRenamingCategory(false); setCatName(categoryName); }
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-medium">{categoryName}</span>
          )}
          <Badge variant="secondary" className="text-[10px] ml-1">{services.length}</Badge>
        </button>
        <div className="flex items-center gap-1 ml-2">
          {renamingCategory ? (
            <>
              <button onClick={handleRenameCategory} className="text-emerald-600 hover:text-emerald-700">
                <Check size={13} />
              </button>
              <button onClick={() => { setRenamingCategory(false); setCatName(categoryName); }} className="text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setRenamingCategory(true); setExpanded(true); }}
              className="p-1 text-muted-foreground hover:text-foreground"
              title="Rename category"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Services */}
      {expanded && (
        <div className="divide-y divide-border/50">
          {services.map((svc) => (
            <ServiceRow
              key={svc.id}
              service={svc}
              onSave={onSaveService}
              onDelete={onDeleteService}
            />
          ))}

          {/* Add service inline */}
          {addingService ? (
            <div className="flex items-center gap-2 py-1.5 pl-4 pr-3">
              <Input
                className="h-7 text-sm flex-1"
                placeholder="New service name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddService();
                  if (e.key === "Escape") { setAddingService(false); setNewServiceName(""); }
                }}
                autoFocus
              />
              <button onClick={handleAddService} className="text-emerald-600 hover:text-emerald-700">
                <Check size={15} />
              </button>
              <button onClick={() => { setAddingService(false); setNewServiceName(""); }} className="text-muted-foreground hover:text-foreground">
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingService(true)}
              className="flex items-center gap-1.5 pl-4 py-1.5 text-xs text-muted-foreground hover:text-foreground w-full text-left"
            >
              <Plus size={11} /> Add service
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add/Edit Executed Letter Modal ─────────────────────────────────────────────

interface LetterModalProps {
  open: boolean;
  onClose: () => void;
  initial?: EngagementLetter | null;
  services: EngagementLetterService[];
}

function LetterModal({ open, onClose, initial, services }: LetterModalProps) {
  const { data: companies = [] } = useCompanies();
  const create = useCreateEngagementLetter();
  const update = useUpdateEngagementLetter();

  const [companyId, setCompanyId] = useState(initial?.company_id ?? "");
  const [serviceId, setServiceId] = useState(initial?.service_id ?? "");
  const [executedUrl, setExecutedUrl] = useState(initial?.executed_url ?? "");
  const [signedDate, setSignedDate] = useState(initial?.signed_date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Reset on open
  useState(() => {
    if (open) {
      setCompanyId(initial?.company_id ?? "");
      setServiceId(initial?.service_id ?? "");
      setExecutedUrl(initial?.executed_url ?? "");
      setSignedDate(initial?.signed_date ?? "");
      setNotes(initial?.notes ?? "");
    }
  });

  const isEditing = !!initial;
  const isPending = create.isPending || update.isPending;

  function handleSubmit() {
    const payload = {
      company_id: companyId || null,
      service_id: serviceId || null,
      executed_url: executedUrl.trim() || null,
      signed_date: signedDate || null,
      notes: notes.trim() || null,
    };

    if (isEditing) {
      update.mutate(
        { id: initial!.id, ...payload },
        {
          onSuccess: () => { toast.success("Executed letter updated"); onClose(); },
          onError: () => toast.error("Failed to update letter"),
        }
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Executed letter added"); onClose(); },
        onError: () => toast.error("Failed to add letter"),
      });
    }
  }

  // Group services by category for the select
  const serviceGroups = useMemo(() => {
    const groups: Record<string, EngagementLetterService[]> = {};
    for (const svc of services) {
      if (!groups[svc.category_name]) groups[svc.category_name] = [];
      groups[svc.category_name].push(svc);
    }
    return groups;
  }, [services]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Executed Letter" : "Add Executed Letter"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select company…" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select service…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(serviceGroups).map(([cat, svcs]) => (
                  svcs.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {cat} — {svc.service_name}
                    </SelectItem>
                  ))
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Executed Letter URL (Google Drive)</Label>
            <Input
              value={executedUrl}
              onChange={(e) => setExecutedUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Signed Date</Label>
            <Input
              type="date"
              value={signedDate}
              onChange={(e) => setSignedDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isEditing ? "Save changes" : "Add letter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EngagementLettersPage() {
  const { data: services = [], isLoading: servicesLoading } = useEngagementLetterServices();
  const { data: letters = [], isLoading: lettersLoading } = useEngagementLetters();

  const createService = useCreateEngagementLetterService();
  const updateService = useUpdateEngagementLetterService();
  const deleteService = useDeleteEngagementLetterService();
  const deleteLetter = useDeleteEngagementLetter();

  const [addCategoryName, setAddCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [letterModal, setLetterModal] = useState<{ open: boolean; editing: EngagementLetter | null }>({
    open: false,
    editing: null,
  });

  // Group services by category, preserving sort order
  const categories = useMemo(() => {
    const groups: Record<string, EngagementLetterService[]> = {};
    for (const svc of services) {
      if (!groups[svc.category_name]) groups[svc.category_name] = [];
      groups[svc.category_name].push(svc);
    }
    return groups;
  }, [services]);

  function handleSaveService(id: string, updates: Partial<EngagementLetterService>) {
    updateService.mutate(
      { id, ...updates },
      {
        onSuccess: () => toast.success("Service updated"),
        onError: () => toast.error("Failed to update service"),
      }
    );
  }

  function handleDeleteService(id: string) {
    deleteService.mutate(id, {
      onSuccess: () => toast.success("Service deleted"),
      onError: () => toast.error("Failed to delete service"),
    });
  }

  function handleAddService(categoryName: string, serviceName: string) {
    const maxOrder = services.filter((s) => s.category_name === categoryName)
      .reduce((m, s) => Math.max(m, s.sort_order), 0);
    createService.mutate(
      { category_name: categoryName, service_name: serviceName, template_url: null, sort_order: maxOrder + 1 },
      {
        onSuccess: () => toast.success("Service added"),
        onError: () => toast.error("Failed to add service"),
      }
    );
  }

  function handleRenameCategory(oldName: string, newName: string) {
    // Update all services in this category
    const toRename = services.filter((s) => s.category_name === oldName);
    let remaining = toRename.length;
    if (remaining === 0) return;
    for (const svc of toRename) {
      updateService.mutate(
        { id: svc.id, category_name: newName },
        {
          onSuccess: () => {
            remaining--;
            if (remaining === 0) toast.success("Category renamed");
          },
          onError: () => toast.error("Failed to rename category"),
        }
      );
    }
  }

  function handleAddCategory() {
    if (!addCategoryName.trim()) return;
    createService.mutate(
      { category_name: addCategoryName.trim(), service_name: "New service", template_url: null, sort_order: services.length + 1 },
      {
        onSuccess: () => {
          toast.success("Category added");
          setAddCategoryName("");
          setAddingCategory(false);
        },
        onError: () => toast.error("Failed to add category"),
      }
    );
  }

  function handleDeleteLetter(id: string) {
    deleteLetter.mutate(id, {
      onSuccess: () => toast.success("Letter removed"),
      onError: () => toast.error("Failed to remove letter"),
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Engagement Letters
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage service templates and track executed engagement letters by company.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Service Catalog ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Service Catalog</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure service categories and link Google Drive templates. Categories and services are fully editable.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {servicesLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : Object.keys(categories).length === 0 ? (
              <p className="text-sm text-muted-foreground">No services configured yet. Add a category to get started.</p>
            ) : (
              Object.entries(categories).map(([catName, catServices]) => (
                <CategorySection
                  key={catName}
                  categoryName={catName}
                  services={catServices}
                  onSaveService={handleSaveService}
                  onDeleteService={handleDeleteService}
                  onAddService={handleAddService}
                  onRenameCategory={handleRenameCategory}
                />
              ))
            )}

            {/* Add category */}
            {addingCategory ? (
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 text-sm"
                  placeholder="Category name"
                  value={addCategoryName}
                  onChange={(e) => setAddCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                    if (e.key === "Escape") { setAddingCategory(false); setAddCategoryName(""); }
                  }}
                  autoFocus
                />
                <button onClick={handleAddCategory} className="text-emerald-600 hover:text-emerald-700 shrink-0">
                  <Check size={16} />
                </button>
                <button onClick={() => { setAddingCategory(false); setAddCategoryName(""); }} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="self-start text-xs"
                onClick={() => setAddingCategory(true)}
              >
                <Plus size={13} className="mr-1" />
                Add category
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Executed Letters ── */}
        <Card>
          <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Executed Letters</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Signed engagement letters linked to companies.
              </p>
            </div>
            <Button
              size="sm"
              className="text-xs shrink-0"
              onClick={() => setLetterModal({ open: true, editing: null })}
            >
              <Plus size={13} className="mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {lettersLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : letters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No executed letters yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {letters.map((letter) => (
                  <div
                    key={letter.id}
                    className="border border-border rounded-lg p-3 flex items-start justify-between gap-3 group"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {(letter.company as { name: string } | null)?.name ?? "—"}
                        </span>
                        {letter.service && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {(letter.service as { category_name: string; service_name: string }).category_name} — {(letter.service as { category_name: string; service_name: string }).service_name}
                          </Badge>
                        )}
                      </div>
                      {letter.signed_date && (
                        <p className="text-xs text-muted-foreground">
                          Signed {format(new Date(letter.signed_date), "MMM d, yyyy")}
                        </p>
                      )}
                      {letter.executed_url && (
                        <a
                          href={letter.executed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                        >
                          View executed letter <ExternalLink size={10} />
                        </a>
                      )}
                      {letter.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{letter.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setLetterModal({ open: true, editing: letter })}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteLetter(letter.id)}
                        className="p-1 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LetterModal
        open={letterModal.open}
        onClose={() => setLetterModal({ open: false, editing: null })}
        initial={letterModal.editing}
        services={services}
      />
    </div>
  );
}
