import { useNavigate } from "react-router-dom";
import { KanbanBoard, type KanbanCard, type KanbanStage } from "@/components/KanbanBoard";
import {
  useDeliveryEngagements,
  useCreateDeliveryEngagement,
  useUpdateDeliveryEngagement,
} from "@/hooks/useDeals";
import { useCompanies } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { DELIVERY_STAGE_LABELS } from "@/types";
import { toast } from "sonner";

const DELIVERY_STAGES: KanbanStage[] = [
  { id: "onboarding",  label: DELIVERY_STAGE_LABELS.onboarding,  color: "bg-blue-400" },
  { id: "in_progress",  label: DELIVERY_STAGE_LABELS.in_progress, color: "bg-violet-400" },
  { id: "review",       label: DELIVERY_STAGE_LABELS.review,      color: "bg-amber-400" },
  { id: "completed",    label: DELIVERY_STAGE_LABELS.completed,   color: "bg-emerald-400" },
  { id: "on_hold",      label: DELIVERY_STAGE_LABELS.on_hold,     color: "bg-slate-400" },
];

export default function DeliveryPipelinePage() {
  const navigate = useNavigate();
  const { data: engagements = [], isLoading } = useDeliveryEngagements();
  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const createEngagement = useCreateDeliveryEngagement();
  const updateEngagement = useUpdateDeliveryEngagement();

  const cards: KanbanCard[] = engagements.map((e) => ({
    id: e.id,
    title: e.title,
    stage: e.stage,
    stage_order: e.stage_order ?? 0,
    value: undefined,
    contract_value: e.total_engagement_value,
    billing_progress: e.billing_progress,
    company: e.company as KanbanCard["company"],
    contact: e.contact as KanbanCard["contact"],
  }));

  function handleCardMove(cardId: string, newStage: string, newOrder: number) {
    updateEngagement.mutate(
      { id: cardId, stage: newStage as import("@/types").DeliveryStage, stage_order: newOrder },
      { onError: () => toast.error("Failed to move engagement") }
    );
  }

  function handleCreate(data: {
    title: string;
    stage: string;
    company_id?: string;
    contact_id?: string;
    value?: number;
  }) {
    const stageCards = cards.filter((c) => c.stage === data.stage);
    createEngagement.mutate(
      {
        title: data.title,
        stage: data.stage as import("@/types").DeliveryStage,
        stage_order: stageCards.length,
        company_id: data.company_id,
        contact_id: data.contact_id,
        total_engagement_value: data.value ?? 0,
      },
      {
        onSuccess: () => toast.success("Engagement created"),
        onError: () => toast.error("Failed to create engagement"),
      }
    );
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
        <h1 className="text-2xl font-semibold tracking-tight">Delivery Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{engagements.length} engagements</p>
      </div>

      <KanbanBoard
        cards={cards}
        stages={DELIVERY_STAGES}
        onCardMove={handleCardMove}
        onCreate={handleCreate}
        onCardClick={(card) => navigate(`/companies/${card.company?.id ?? ""}`)}
        companies={companies}
        contacts={contacts}
      />
    </div>
  );
}
