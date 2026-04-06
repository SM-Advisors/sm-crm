import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, parseISO, isThisWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Target, TrendingUp, FileText,
  Users, ClipboardList, Mail, Phone, UserPlus,
  Check, X, Bot, Activity,
} from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useInvoices } from "@/hooks/useInvoices";
import { useSalesDeals } from "@/hooks/useDeals";
import { useInteractions } from "@/hooks/useInteractions";
import { useAgentRuns, useUpdateAgentAction } from "@/hooks/useAgent";
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

  const recent = interactions.slice(0, 8);

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
      <CardContent className="space-y-3">
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
        ) : (
          recent.map((item) => {
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
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: contacts = [] } = useContacts();
  const { data: invoices = [] } = useInvoices();
  const { data: deals = [] } = useSalesDeals();
  const { data: runs = [] } = useAgentRuns();

  const metrics = useMemo(() => {
    const totalPipeline = deals
      .filter((d) => !["won", "lost"].includes(d.stage))
      .reduce((s, d) => s + (d.value ?? 0), 0);

    const weightedPipeline = deals
      .filter((d) => !["won", "lost"].includes(d.stage))
      .reduce((s, d) => s + ((d.value ?? 0) * ((d.probability ?? 50) / 100)), 0);

    const outstanding = invoices
      .filter((i) => i.status !== "paid" && i.status !== "voided")
      .reduce((s, i) => s + (i.balance_due ?? 0), 0);

    const pendingDrafts = runs
      .flatMap((r) => (r as any).actions ?? [])
      .filter((a: AgentAction) => a.status === "pending").length;

    return [
      {
        label: "Total Pipeline",
        value: `$${totalPipeline.toLocaleString()}`,
        icon: DollarSign,
        onClick: () => navigate("/sales-pipeline"),
      },
      {
        label: "Weighted Pipeline",
        value: `$${Math.round(weightedPipeline).toLocaleString()}`,
        icon: Target,
        onClick: () => navigate("/sales-pipeline"),
      },
      {
        label: "Total Contacts",
        value: String(contacts.length),
        icon: Users,
        onClick: () => navigate("/contacts"),
      },
      {
        label: "Outstanding Invoices",
        value: `$${outstanding.toLocaleString()}`,
        icon: FileText,
        onClick: () => navigate("/invoices"),
      },
      {
        label: "Active Deals",
        value: String(deals.filter((d) => !["won", "lost"].includes(d.stage)).length),
        icon: TrendingUp,
        onClick: () => navigate("/sales-pipeline"),
      },
      {
        label: "Agent Drafts Pending",
        value: String(pendingDrafts),
        icon: ClipboardList,
        onClick: () => navigate("/agent-log"),
      },
    ];
  }, [contacts, invoices, deals, runs, navigate]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AgentSurfacingCard />
        <RecentActivityCard />
      </div>
    </div>
  );
}
