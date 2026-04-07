import { useNavigate } from "react-router-dom";
import { KanbanBoard, type KanbanCard, type KanbanStage } from "@/components/KanbanBoard";
import {
  useSalesDeals,
  useCreateSalesDeal,
  useUpdateSalesDeal,
  useDeleteSalesDeal,
} from "@/hooks/useDeals";
import { useCompanies } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { SALES_STAGE_LABELS } from "@/types";
import { toast } from "sonner";

const SALES_STAGES: KanbanStage[] = [
  { id: "qualification",    label: SALES_STAGE_LABELS.qualification,    color: "bg-blue-400" },
  { id: "needs_analysis",   label: SALES_STAGE_LABELS.needs_analysis,   color: "bg-cyan-400" },
  { id: "proposal",         label: SALES_STAGE_LABELS.proposal,         color: "bg-violet-400" },
  { id: "cold_deal",        label: SALES_STAGE_LABELS.cold_deal,        color: "bg-slate-400" },
  { id: "closed_won",       label: SALES_STAGE_LABELS.closed_won,       color: "bg-emerald-400" },
  { id: "closed_lost",      label: SALES_STAGE_LABELS.closed_lost,      color: "bg-rose-400" },
  { id: "service_complete",  label: SALES_STAGE_LABELS.service_complete,  color: "bg-teal-400" },
];

export default function SalesPipelinePage() {
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useSalesDeals();
  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const createDeal = useCreateSalesDeal();
  const updateDeal = useUpdateSalesDeal();
  const deleteDeal = useDeleteSalesDeal();

  const cards: KanbanCard[] = deals.map((d) => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    stage_order: d.stage_order ?? 0,
    value: d.value,
    company: d.company as KanbanCard["company"],
    contact: d.contact as KanbanCard["contact"],
    probability: d.probability,
    close_date: d.expected_close_date,
  }));

  function handleCardMove(cardId: string, newStage: string, newOrder: number) {
    updateDeal.mutate(
      { id: cardId, stage: newStage as import("@/types").SalesStage, stage_order: newOrder },
      { onError: () => toast.error("Failed to move deal") }
    );
  }

  async function handleCreate(data: {
    title: string;
    stage: string;
    company_id?: string;
    contact_id?: string;
    value?: number;
    expected_close_date?: string;
    description?: string;
  }) {
    const stageCards = cards.filter((c) => c.stage === data.stage);
    try {
      await createDeal.mutateAsync({
        title: data.title,
        stage: data.stage as import("@/types").SalesStage,
        stage_order: stageCards.length,
        company_id: data.company_id,
        contact_id: data.contact_id,
        value: data.value,
        expected_close_date: data.expected_close_date,
        description: data.description,
      });
      toast.success("Deal created");
    } catch {
      toast.error("Failed to create deal");
      throw new Error("create failed");
    }
  }

  async function handleUpdate(id: string, data: {
    title: string;
    stage: string;
    company_id?: string;
    contact_id?: string;
    value?: number;
    expected_close_date?: string;
    description?: string;
  }) {
    try {
      await updateDeal.mutateAsync({
        id,
        title: data.title,
        stage: data.stage as import("@/types").SalesStage,
        company_id: data.company_id ?? null,
        contact_id: data.contact_id ?? null,
        value: data.value ?? null,
        expected_close_date: data.expected_close_date ?? null,
        description: data.description ?? null,
      });
      toast.success("Deal updated");
    } catch {
      toast.error("Failed to update deal");
      throw new Error("update failed");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDeal.mutateAsync(id);
      toast.success("Deal deleted");
    } catch {
      toast.error("Failed to delete deal");
      throw new Error("delete failed");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground p-6">
        Loading pipeline…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{deals.length} deals</p>
      </div>

      <KanbanBoard
        cards={cards}
        stages={SALES_STAGES}
        onCardMove={handleCardMove}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCardClick={(card) => navigate(`/contacts/${card.contact?.id ?? ""}`)}
        companies={companies}
        contacts={contacts}
      />
    </div>
  );
}
