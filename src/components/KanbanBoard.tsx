/**
 * KanbanBoard — reusable drag-and-drop kanban built on @hello-pangea/dnd.
 * Works for both Sales Pipeline and Delivery Pipeline.
 */
import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Plus, GripVertical, DollarSign, Building2, User, CalendarIcon, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KanbanCard {
  id: string;
  title: string;
  stage: string;
  stage_order: number;
  value?: number | null;
  company?: { id: string; name: string } | null;
  contact?: { id: string; first_name?: string; last_name?: string } | null;
  probability?: number | null;
  close_date?: string | null;
  // delivery-specific
  billing_progress?: number | null;
  contract_value?: number | null;
}

export interface KanbanStage {
  id: string;           // stage key (e.g. "prospect")
  label: string;
  color?: string;       // tailwind bg class e.g. "bg-blue-500"
}

interface DealFormData {
  title: string;
  stage: string;
  company_id?: string;
  contact_id?: string;
  value?: number;
  expected_close_date?: string;
  description?: string;
}

interface KanbanBoardProps {
  cards: KanbanCard[];
  stages: KanbanStage[];
  onCardMove: (cardId: string, newStage: string, newOrder: number) => void;
  onReorder?: (updates: { id: string; stage: string; stage_order: number }[]) => void;
  onCreate?: (data: DealFormData) => void;
  onUpdate?: (id: string, data: DealFormData) => void;
  onDelete?: (id: string) => void;
  onCardClick?: (card: KanbanCard) => void;
  companies?: { id: string; name: string }[];
  contacts?: { id: string; first_name?: string; last_name?: string; company_id?: string | null }[];
  contactsByCompany?: Record<string, { id: string; first_name?: string; last_name?: string }[]>;
  valueLabelSuffix?: string;
}

// ─── Card component ───────────────────────────────────────────────────────────

function KanbanCardItem({
  card,
  index,
  onClick,
  onEditClick,
}: {
  card: KanbanCard;
  index: number;
  onClick?: (card: KanbanCard) => void;
  onEditClick?: (card: KanbanCard) => void;
}) {
  const navigate = useNavigate();
  const displayValue = card.value ?? card.contract_value;

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`mb-2 ${snapshot.isDragging ? "opacity-80" : ""}`}
        >
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow select-none group"
            onClick={() => onClick ? onClick(card) : onEditClick?.(card)}
          >
            <CardContent className="p-3">
              {/* Drag handle + title + edit */}
              <div className="flex items-start gap-1.5">
                <div
                  {...provided.dragHandleProps}
                  className="mt-0.5 text-muted-foreground/50 hover:text-muted-foreground shrink-0"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium leading-tight flex-1">{card.title}</p>
                {onEditClick && (
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground shrink-0 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onEditClick(card); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-col gap-1 mt-2 pl-5">
                {card.company && (
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/companies/${card.company!.id}`);
                    }}
                  >
                    <Building2 className="h-3 w-3 shrink-0" />
                    {card.company.name}
                  </button>
                )}
                {card.contact && (
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/contacts/${card.contact!.id}`);
                    }}
                  >
                    <User className="h-3 w-3 shrink-0" />
                    {[card.contact.first_name, card.contact.last_name].filter(Boolean).join(" ")}
                  </button>
                )}
                {displayValue != null && (
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <DollarSign className="h-3 w-3" />
                    {displayValue.toLocaleString()}
                  </div>
                )}
                {card.billing_progress != null && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Billed: {Math.round(card.billing_progress)}%</span>
                    <div className="flex-1 h-1 rounded bg-muted overflow-hidden ml-1">
                      <div
                        className="h-1 rounded bg-primary"
                        style={{ width: `${Math.min(100, card.billing_progress)}%` }}
                      />
                    </div>
                  </div>
                )}
                {card.close_date && (() => {
                  const isOverdue = new Date(card.close_date) < new Date() &&
                    !["closed_won", "closed_lost", "service_complete", "completed"].includes(card.stage);
                  return (
                    <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                      {isOverdue && <AlertTriangle className="h-3 w-3" />}
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(card.close_date).toLocaleDateString()}
                      {isOverdue && " — Needs Follow-Up"}
                    </div>
                  );
                })()}
                {card.probability != null && (
                  <Badge variant="outline" className="text-xs w-fit">
                    {card.probability}% likely
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}

// ─── Column component ─────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  cards,
  onCardClick,
  onEditClick,
  onAddClick,
}: {
  stage: KanbanStage;
  cards: KanbanCard[];
  onCardClick?: (card: KanbanCard) => void;
  onEditClick?: (card: KanbanCard) => void;
  onAddClick: (stageId: string) => void;
}) {
  const totalValue = cards.reduce((sum, c) => sum + (c.value ?? c.contract_value ?? 0), 0);

  return (
    <div className="flex flex-col w-64 shrink-0 max-h-[calc(100vh-200px)]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${stage.color ?? "bg-muted-foreground"}`} />
          <span className="text-sm font-medium">{stage.label}</span>
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {cards.length}
          </Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => onAddClick(stage.id)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {totalValue > 0 && (
        <p className="text-xs text-muted-foreground px-1 mb-2">
          ${totalValue.toLocaleString()}
        </p>
      )}

      {/* Drop zone */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[120px] rounded-lg p-2 transition-colors overflow-y-auto ${
              snapshot.isDraggingOver ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
            }`}
          >
            {cards.map((card, index) => (
              <KanbanCardItem
                key={card.id}
                card={card}
                index={index}
                onClick={onCardClick}
                onEditClick={onEditClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ─── Add card dialog ──────────────────────────────────────────────────────────

function AddCardDialog({
  open,
  defaultStage,
  stages,
  companies,
  contacts,
  contactsByCompany,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  defaultStage: string;
  stages: KanbanStage[];
  companies?: { id: string; name: string }[];
  contacts?: { id: string; first_name?: string; last_name?: string; company_id?: string | null }[];
  contactsByCompany?: Record<string, { id: string; first_name?: string; last_name?: string }[]>;
  onOpenChange: (v: boolean) => void;
  onCreate?: KanbanBoardProps["onCreate"];
}) {
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState(defaultStage);
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [value, setValue] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [description, setDescription] = useState("");

  // Filter contacts to those associated with the selected company
  const filteredContacts = companyId && contactsByCompany
    ? (contactsByCompany[companyId] ?? [])
    : (contacts ?? []);

  function handleCreate() {
    if (!title.trim()) { toast.error("Deal name is required"); return; }
    onCreate?.({
      title: title.trim(),
      stage,
      company_id: companyId || undefined,
      contact_id: contactId || undefined,
      value: value ? parseFloat(value) : undefined,
      expected_close_date: closingDate || undefined,
      description: description.trim() || undefined,
    });
    setTitle(""); setValue(""); setCompanyId(""); setContactId("");
    setClosingDate(""); setDescription("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Create Deal</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Deal Name */}
          <div className="flex flex-col gap-1.5">
            <Label>Deal Name *</Label>
            <Input
              placeholder="e.g., Acme Bank - AI Enablement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Company Name */}
          {companies && companies.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Company Name</Label>
              <Select value={companyId || "__none__"} onValueChange={(v) => { setCompanyId(v === "__none__" ? "" : v); setContactId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Contact Name */}
          {(filteredContacts.length > 0 || contacts?.length) && (
            <div className="flex flex-col gap-1.5">
              <Label>Contact Name</Label>
              <Select value={contactId || "__none__"} onValueChange={(v) => setContactId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select contact…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {filteredContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companyId && filteredContacts.length === 0 && (
                <p className="text-xs text-muted-foreground">No contacts linked to this company.</p>
              )}
            </div>
          )}

          {/* Stage */}
          <div className="flex flex-col gap-1.5">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue placeholder="Choose a stage" /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label>Amount</Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            </div>
          </div>

          {/* Follow Up Date */}
          <div className="flex flex-col gap-1.5">
            <Label>Follow Up Date</Label>
            <Input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="A few words about this deal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-y"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit card dialog ────────────────────────────────────────────────────────

function EditCardDialog({
  card,
  stages,
  companies,
  contacts,
  contactsByCompany,
  onOpenChange,
  onUpdate,
  onDelete,
}: {
  card: KanbanCard | null;
  stages: KanbanStage[];
  companies?: { id: string; name: string }[];
  contacts?: { id: string; first_name?: string; last_name?: string; company_id?: string | null }[];
  contactsByCompany?: Record<string, { id: string; first_name?: string; last_name?: string }[]>;
  onOpenChange: (v: boolean) => void;
  onUpdate?: KanbanBoardProps["onUpdate"];
  onDelete?: KanbanBoardProps["onDelete"];
}) {
  const [title, setTitle] = useState(card?.title ?? "");
  const [stage, setStage] = useState(card?.stage ?? "");
  const [companyId, setCompanyId] = useState(card?.company?.id ?? "");
  const [contactId, setContactId] = useState(card?.contact?.id ?? "");
  const [value, setValue] = useState(card?.value?.toString() ?? "");
  const [closingDate, setClosingDate] = useState(card?.close_date ?? "");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Filter contacts to those associated with the selected company
  const filteredContacts = companyId && contactsByCompany
    ? (contactsByCompany[companyId] ?? [])
    : (contacts ?? []);

  if (!card) return null;

  function handleSave() {
    if (!title.trim()) { toast.error("Deal name is required"); return; }
    onUpdate?.(card!.id, {
      title: title.trim(),
      stage,
      company_id: companyId || undefined,
      contact_id: contactId || undefined,
      value: value ? parseFloat(value) : undefined,
      expected_close_date: closingDate || undefined,
      description: description.trim() || undefined,
    });
    onOpenChange(false);
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete?.(card!.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={!!card} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Edit Deal</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Deal Name *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>

          {companies && companies.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Company Name</Label>
              <Select value={companyId || "__none__"} onValueChange={(v) => { setCompanyId(v === "__none__" ? "" : v); setContactId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(filteredContacts.length > 0 || contacts?.length) && (
            <div className="flex flex-col gap-1.5">
              <Label>Contact Name</Label>
              <Select value={contactId || "__none__"} onValueChange={(v) => setContactId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select contact…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {filteredContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companyId && filteredContacts.length === 0 && (
                <p className="text-xs text-muted-foreground">No contacts linked to this company.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Amount</Label>
            <div className="relative">
              <Input type="number" placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} className="pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Follow Up Date</Label>
            <Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea placeholder="A few words about this deal" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px] resize-y" />
          </div>
        </div>
        <DialogFooter className="flex !justify-between">
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmDelete ? "Confirm Delete" : "Delete Deal"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function KanbanBoard({
  cards,
  stages,
  onCardMove,
  onReorder,
  onCreate,
  onUpdate,
  onDelete,
  onCardClick,
  companies,
  contacts,
  contactsByCompany,
}: KanbanBoardProps) {
  const [addDialogStage, setAddDialogStage] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);

  // Group cards by stage, sorted by stage_order
  const byStage: Record<string, KanbanCard[]> = {};
  for (const stage of stages) byStage[stage.id] = [];
  for (const card of cards) {
    if (byStage[card.stage]) byStage[card.stage].push(card);
    else byStage[card.stage] = [card];
  }
  for (const stageId of Object.keys(byStage)) {
    byStage[stageId].sort((a, b) => a.stage_order - b.stage_order);
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const srcStage = source.droppableId;
    const dstStage = destination.droppableId;

    if (onReorder) {
      // Build new ordered lists for affected columns
      const srcList = [...(byStage[srcStage] ?? [])];
      const dstList = srcStage === dstStage ? srcList : [...(byStage[dstStage] ?? [])];

      // Remove card from source
      const [moved] = srcList.splice(source.index, 1);
      if (!moved) return;

      // Insert into destination
      if (srcStage === dstStage) {
        srcList.splice(destination.index, 0, moved);
      } else {
        dstList.splice(destination.index, 0, moved);
      }

      // Build batch update for all cards that need new stage_order
      const updates: { id: string; stage: string; stage_order: number }[] = [];

      srcList.forEach((card, i) => {
        if (card.stage !== srcStage || card.stage_order !== i) {
          updates.push({ id: card.id, stage: srcStage, stage_order: i });
        }
      });

      if (srcStage !== dstStage) {
        dstList.forEach((card, i) => {
          updates.push({ id: card.id, stage: dstStage, stage_order: i });
        });
      }

      if (updates.length > 0) {
        onReorder(updates);
      }
    } else {
      // Fallback: single-card move (legacy)
      onCardMove(draggableId, dstStage, destination.index);
    }
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="w-full overflow-x-auto">
          <div className="flex gap-4 pb-4 min-h-[500px]" style={{ minWidth: `${stages.length * 272}px` }}>
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                cards={byStage[stage.id] ?? []}
                onCardClick={onCardClick}
                onEditClick={(onUpdate || onDelete) ? (card) => setEditingCard(card) : undefined}
                onAddClick={(stageId) => setAddDialogStage(stageId)}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      <AddCardDialog
        open={!!addDialogStage}
        defaultStage={addDialogStage ?? stages[0]?.id ?? ""}
        stages={stages}
        companies={companies}
        contacts={contacts}
        contactsByCompany={contactsByCompany}
        onOpenChange={(v) => { if (!v) setAddDialogStage(null); }}
        onCreate={onCreate}
      />

      {editingCard && (
        <EditCardDialog
          card={editingCard}
          stages={stages}
          companies={companies}
          contacts={contacts}
          contactsByCompany={contactsByCompany}
          onOpenChange={(v) => { if (!v) setEditingCard(null); }}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
