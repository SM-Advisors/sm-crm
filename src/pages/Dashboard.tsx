import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Target, TrendingUp, FileText,
  Users, ClipboardList, Mail, Phone,
  Check, X, Bot, Activity,
} from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useInvoices } from "@/hooks/useInvoices";
import { useSalesDeals } from "@/hooks/useDeals";
import { useInteractions } from "@/hooks/useInteractions";
import { useAgentRuns, useUpdateAgentAction, useStageProbabilities } from "@/hooks/useAgent";
import type { AgentAction } from "@/types";
import { INTERACTION_TYPE_LABELS } from "@/types";
import { toast } from "sonner";

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`border border-border shadow-sm dark:shadow-none ${onClick ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 shrink-0">
          <Icon size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Agent surfacing section ──────────────────────────────────────────────────

function AgentSurfacingCard() {
  const navigate = useNavigate();
  const { data: runs = [] } = useAgentRuns();
  const updateAction = useUpdateAgentAction();

  // Get the most recent run with pending actions
  const pendingActions: AgentAction[] = useMemo(() => {
    for (const run of runs) {
      const pending = ((run as any).actions ?? []).filter(
        (a: AgentAction) => a.status === "pending"
      );
      if (pending.length) return pending.slice(0, 5);
    }
    return [];
  }, [runs]);

  function approve(id: string) {
    updateAction.mutate(
      { id, status: "approved" },
      { onSuccess: () => toast.success("Approved"), onError: () => toast.error("Failed") }
    );
  }

  function dismiss(id: string) {
    updateAction.mutate(
      { id, status: "dismissed" },
      { onSuccess: () => toast.success("Dismissed"), onError: () => toast.error("Failed") }
    );
  }

  return (
    <Card className="lg:col-span-2 border border-border shadow-sm dark:shadow-none">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Agent Surfacing
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={() => navigate("/agent-log")} className="text-xs text-muted-foreground">
          View all
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Bot className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No pending agent actions.</p>
          </div>
        ) : (
          pendingActions.map((action) => {
            const contact = (action as any).contact;
            const name = contact
              ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
              : "Unknown";
            return (
              <div
                key={action.id}
                className="flex items-center justify-between p-3 rounded-md border border-border bg-background gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={() => contact && navigate(`/contacts/${contact.id}`)}
                    >
                      {name}
                    </button>
                    <Badge variant="outline" className="text-xs">{action.action_type}</Badge>
                  </div>
                  {action.content && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {action.content}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => approve(action.id)}
                    disabled={updateAction.isPending}
                  >
                    <Check size={12} /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => dismiss(action.id)}
                    disabled={updateAction.isPending}
                  >
                    <X size={12} /> Skip
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recent activity ──────────────────────────────────────────────────────────

function RecentActivityCard() {
  const { data: interactions = [] } = useInteractions();

  // Sort by proximity to now (most recent/nearest first) and show up to 40
  const recent = useMemo(() => {
    const now = Date.now();
    return [...interactions]
      .sort((a, b) => {
        const da = Math.abs(now - new Date(a.occurred_at).getTime());
        const db = Math.abs(now - new Date(b.occurred_at).getTime());
        return da - db;
      })
      .slice(0, 40);
  }, [interactions]);

  const iconMap: Record<string, React.ElementType> = {
    email: Mail,
    call: Phone,
    note: FileText,
    meeting: Users,
  };

  return (
    <Card className="border border-border shadow-sm dark:shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto space-y-3 pr-1">
            {recent.map((item) => {
              const Icon = iconMap[item.type] ?? Activity;
              const contact = (item as any).contact;
              const timeAgo = item.occurred_at
                ? formatDistanceToNow(parseISO(item.occurred_at), { addSuffix: true })
                : "";
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <Icon size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground leading-tight">
                      {INTERACTION_TYPE_LABELS[item.type as keyof typeof INTERACTION_TYPE_LABELS] ?? item.type}
                      {contact && (
                        <span className="text-muted-foreground">
                          {" "}— {[contact.first_name, contact.last_name].filter(Boolean).join(" ")}
                        </span>
                      )}
                    </p>
                    {item.subject && (
                      <p className="text-xs text-muted-foreground truncate">{item.subject}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Active stages: deals in the sales pipeline (not archived)
const ACTIVE_STAGES = ["qualification", "needs_analysis", "proposal"];
// Executed: won deals
const EXECUTED_STAGES = ["closed_won"];

function ActiveDealsCard({ deals }: { deals: import("@/types").SalesDeal[] }) {
  const navigate = useNavigate();
  const [view, setView] = useState<"proposals" | "executed">("proposals");

  const proposalDeals = deals.filter((d) => ACTIVE_STAGES.includes(d.stage));
  const executedDeals = deals.filter((d) => EXECUTED_STAGES.includes(d.stage));
  const shown = view === "proposals" ? proposalDeals : executedDeals;

  return (
    <Card
      className="border border-border shadow-sm dark:shadow-none cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => navigate("/pipeline")}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-primary/10 shrink-0">
            <TrendingUp size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <div
              className="flex gap-1 mb-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={`text-[10px] px-1.5 py-0.5 rounded ${view === "proposals" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                onClick={() => setView("proposals")}
              >
                Proposals
              </button>
              <button
                className={`text-[10px] px-1.5 py-0.5 rounded ${view === "executed" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                onClick={() => setView("executed")}
              >
                Executed
              </button>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {shown.length} {view === "proposals" ? "Open" : "Won"}
            </p>
            <p className="text-xs text-muted-foreground">
              ${shown.reduce((s, d) => s + (d.value ?? 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: contacts = [] } = useContacts();
  const { data: invoices = [] } = useInvoices();
  const { data: deals = [] } = useSalesDeals();
  const { data: runs = [] } = useAgentRuns();
  const stageProbabilities = useStageProbabilities();

  const metrics = useMemo(() => {
    // Only active sales pipeline stages (not archived)
    const activeDeals = deals.filter((d) => ACTIVE_STAGES.includes(d.stage));

    const totalPipeline = activeDeals.reduce((s, d) => s + (d.value ?? 0), 0);
    const weightedPipeline = activeDeals.reduce(
      (s, d) => s + ((d.value ?? 0) * ((stageProbabilities[d.stage] ?? 0) / 100)),
      0
    );

    const outstanding = invoices
      .filter((i) => i.status !== "paid" && i.status !== "voided")
      .reduce((s, i) => s + (i.balance_due ?? 0), 0);

    const pendingDrafts = runs
      .flatMap((r) => (r as any).actions ?? [])
      .filter((a: AgentAction) => a.status === "pending").length;

    return {
      totalPipeline,
      weightedPipeline,
      outstanding,
      pendingDrafts,
    };
  }, [deals, invoices, runs, stageProbabilities]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Total Pipeline"
          value={`$${metrics.totalPipeline.toLocaleString()}`}
          icon={DollarSign}
          onClick={() => navigate("/pipeline")}
        />
        <MetricCard
          label="Weighted Pipeline"
          value={`$${Math.round(metrics.weightedPipeline).toLocaleString()}`}
          icon={Target}
          onClick={() => navigate("/pipeline")}
        />
        <MetricCard
          label="Total Contacts"
          value={String(contacts.length)}
          icon={Users}
          onClick={() => navigate("/contacts")}
        />
        <MetricCard
          label="Outstanding Invoices"
          value={`$${metrics.outstanding.toLocaleString()}`}
          icon={FileText}
          onClick={() => navigate("/invoices")}
        />
        <ActiveDealsCard deals={deals} />
        <MetricCard
          label="Agent Drafts Pending"
          value={String(metrics.pendingDrafts)}
          icon={ClipboardList}
          onClick={() => navigate("/agent-log")}
        />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AgentSurfacingCard />
        <RecentActivityCard />
      </div>
    </div>
  );
}
