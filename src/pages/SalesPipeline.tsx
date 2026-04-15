import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { KanbanBoard, type KanbanCard, type KanbanStage } from "@/components/KanbanBoard";
import {
  useSalesDeals,
  useCreateSalesDeal,
  useUpdateSalesDeal,
  useDeleteSalesDeal,
  useReorderSalesDeals,
} from "@/hooks/useDeals";
import { useCompanies } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { SALES_STAGE_LABELS } from "@/types";
import { useStageProbabilities } from "@/hooks/useAgent";
import { toast } from "sonner";

export const ACTIVE_SALES_STAGES: KanbanStage[] = [
  { id: "qualification",    label: SALES_STAGE_LABELS.qualification,    color: "bg-blue-400" },
  { id: "needs_analysis",   label: SALES_STAGE_LABELS.needs_analysis,   color: "bg-cyan-400" },
  { id: "proposal",         label: SALES_STAGE_LABELS.proposal,         color: "bg-violet-400" },
];

export const ARCHIVED_SALES_STAGES: KanbanStage[] = [
  { id: "cold_deal",        label: SALES_STAGE_LABELS.cold_deal,        color: "bg-slate-400" },
  { id: "closed_won",       label: SALES_STAGE_LABELS.closed_won,       color: "bg-emerald-400" },
  { id: "closed_lost",      label: SALES_STAGE_LABELS.closed_lost,      color: "bg-rose-400" },
  { id: "service_complete",  label: SALES_STAGE_LABELS.service_complete,  color: "bg-teal-400" },
];


export default function SalesPipelinePage({ stages: stagesProp }: { stages?: KanbanStage[] } = {}) {
  const stages = stagesProp ?? ACTIVE_SALES_STAGES;
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useSalesDeals();
  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const createDeal = useCreateSalesDeal();
  const updateDeal = useUpdateSalesDeal();
  const deleteDeal = useDeleteSalesDeal();
  const reorderDeals = useReorderSalesDeals();
  const stageProbabilities = useStageProbabilities();

  // Build contacts-by-company lookup for filtering
  const contactsByCompany = useMemo(() => {
    const map: Record<string, { id: string; first_name?: string; last_name?: string }[]> = {};
    for (const c of contacts) {
      if (c.company_id) {
        if (!map[c.company_id]) map[c.company_id] = [];
        map[c.company_id].push({ id: c.id, first_name: c.first_name, last_name: c.last_name });
      }
    }
    return map;
  }, [contacts]);

  const stageIds = new Set(stages.map((s) => s.id));

  const isArchived = stages === ARCHIVED_SALES_STAGES;

  const cards: KanbanCard[] = deals
    .filter((d) => stageIds.has(d.stage))
    .map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      stage_order: d.stage_order ?? 0,
      value: d.value,
      company: d.company as KanbanCard["company"],
      contact: d.contact as KanbanCard["contact"],
      probability: isArchived ? null : d.probability,
      close_date: d.expected_close_date,
    }));

  function handleCardMove(cardId: string, newStage: string, newOrder: number) {
    updateDeal.mutate(
      { id: cardId, stage: newStage as import("@/types").SalesStage, stage_order: newOrder },
      { onError: () => toast.error("Failed to move deal") }
    );
  }

  function handleCreate(data: {
    title: string;
    stage: string;
    company_id?: string;
    contact_id?: string;
    value?: number;
    expected_close_date?: string;
    description?: string;
  }) {
    const stageCards = cards.filter((c) => c.stage === data.stage);
    createDeal.mutate(
      {
        title: data.title,
        stage: data.stage as import("@/types").SalesStage,
        stage_order: stageCards.length,
        company_id: data.company_id,
        contact_id: data.contact_id,
        value: data.value,
        expected_close_date: data.expected_close_date,
        description: data.description,
      },
      {
        onSuccess: () => toast.success("Deal created"),
        onError: () => toast.error("Failed to create deal"),
      }
    );
  }

  function handleUpdate(id: string, data: {
    title: string;
    stage: string;
    company_id?: string;
    contact_id?: string;
    value?: number;
    expected_close_date?: string;
    description?: string;
  }) {
    updateDeal.mutate(
      {
        id,
        title: data.title,
        stage: data.stage as import("@/types").SalesStage,
        company_id: data.company_id ?? null,
        contact_id: data.contact_id ?? null,
        value: data.value ?? null,
        expected_close_date: data.expected_close_date ?? null,
        description: data.description ?? null,
      },
      {
        onSuccess: () => toast.success("Deal updated"),
        onError: () => toast.error("Failed to update deal"),
      }
    );
  }

  function handleDelete(id: string) {
    deleteDeal.mutate(id, {
      onSuccess: () => toast.success("Deal deleted"),
      onError: () => toast.error("Failed to delete deal"),
    });
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
        <h1 className="text-2xl font-semibold tracking-tight">
          {stages === ARCHIVED_SALES_STAGES ? "Archived Pipeline" : "Sales Pipeline"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{cards.length} deals</p>
      </div>

      <KanbanBoard
        cards={cards}
        stages={stages}
        onCardMove={handleCardMove}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCardClick={(card) => navigate(`/sales-deals/${card.id}`)}
        onReorder={(updates) => {
          reorderDeals.mutate(updates, {
            onError: () => toast.error("Failed to reorder"),
          });
        }}
        stageProbabilities={stageProbabilities}
        companies={companies}
        contacts={contacts}
        contactsByCompany={contactsByCompany}
      />
    </div>
  );
}
