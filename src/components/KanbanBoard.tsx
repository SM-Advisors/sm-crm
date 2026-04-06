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
import { Plus, GripVertical, DollarSign, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface KanbanBoardProps {
  cards: KanbanCard[];
  stages: KanbanStage[];
  onCardMove: (cardId: string, newStage: string, newOrder: number) => void;
  onCreate?: (data: { title: string; stage: string; company_id?: string; contact_id?: string; value?: number }) => void;
  onCardClick?: (card: KanbanCard) => void;
  companies?: { id: string; name: string }[];
  contacts?: { id: string; first_name?: string; last_name?: string }[];
  valueLabelSuffix?: string;
}

// ─── Card component ───────────────────────────────────────────────────────────

function KanbanCardItem({
  card,
  index,
  onClick,
}: {
  card: KanbanCard;
  index: number;
  onClick?: (card: KanbanCard) => void;
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
            className="cursor-pointer hover:shadow-md transition-shadow select-none"
            onClick={() => onClick?.(card)}
          >
            <CardContent className="p-3">
              {/* Drag handle + title */}
              <div className="flex items-start gap-1.5">
                <div
                  {...provided.dragHandleProps}
                  className="mt-0.5 text-muted-foreground/50 hover:text-muted-foreground shrink-0"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium leading-tight flex-1">{card.title}</p>
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
  onAddClick,
}: {
  stage: KanbanStage;
  cards: KanbanCard[];
  onCardClick?: (card: KanbanCard) => void;
  onAddClick: (stageId: string) => void;
}) {
  const totalValue = cards.reduce((sum, c) => sum + (c.value ?? c.contract_value ?? 0), 0);

  return (
    <div className="flex flex-col w-64 shrink-0">
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
            className={`flex-1 min-h-[120px] rounded-lg p-2 transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
            }`}
          >
            {cards.map((card, index) => (
              <KanbanCardItem
                key={card.id}
                card={card}
                index={index}
                onClick={onCardClick}
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
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  defaultStage: string;
  stages: KanbanStage[];
  companies?: { id: string; name: string }[];
  contacts?: { id: string; first_name?: string; last_name?: string }[];
  onOpenChange: (v: boolean) => void;
  onCreate?: KanbanBoardProps["onCreate"];
}) {
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState(defaultStage);
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [value, setValue] = useState("");

  function handleCreate() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    onCreate?.({
      title: title.trim(),
      stage,
      company_id: companyId || undefined,
      contact_id: contactId || undefined,
      value: value ? parseFloat(value) : undefined,
    });
    setTitle(""); setValue(""); setCompanyId(""); setContactId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Deal / Engagement</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Title *</Label>
            <Input placeholder="Deal name…" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
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
          {companies && companies.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Company</Label>
              <Select value={companyId || "__none__"} onValueChange={(v) => setCompanyId(v === "__none__" ? "" : v)}>
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
          {contacts && contacts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Contact</Label>
              <Select value={contactId || "__none__"} onValueChange={(v) => setContactId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select contact…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Value ($)</Label>
            <Input type="number" placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
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
  onCreate,
  onCardClick,
  companies,
  contacts,
}: KanbanBoardProps) {
  const [addDialogStage, setAddDialogStage] = useState<string | null>(null);

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

    const newStage = destination.droppableId;
    const newOrder = destination.index;
    onCardMove(draggableId, newStage, newOrder);
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 overflow-x-auto min-h-[500px]">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                cards={byStage[stage.id] ?? []}
                onCardClick={onCardClick}
                onAddClick={(stageId) => setAddDialogStage(stageId)}
              />
            ))}
          </div>
        </ScrollArea>
      </DragDropContext>

      <AddCardDialog
        open={!!addDialogStage}
        defaultStage={addDialogStage ?? stages[0]?.id ?? ""}
        stages={stages}
        companies={companies}
        contacts={contacts}
        onOpenChange={(v) => { if (!v) setAddDialogStage(null); }}
        onCreate={onCreate}
      />
    </>
  );
}
