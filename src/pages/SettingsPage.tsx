import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAgentConfig, useUpdateAgentConfig } from "@/hooks/useAgent";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useChangeLog } from "@/hooks/useChangeLog";
import { toast } from "sonner";
import { Bot, Zap, Bell, History } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

// ─── Agent config section ─────────────────────────────────────────────────────

function AgentSettings() {
  const { data: configs = [], isLoading } = useAgentConfig();
  const updateConfig = useUpdateAgentConfig();

  // Build a quick-access map
  const configMap = Object.fromEntries(configs.map((c) => [c.config_key, c.config_value]));

  const schedule = configMap["schedule"] as any ?? {};
  const outreach = configMap["outreach_rules"] as any ?? {};
  const sms = configMap["sms"] as any ?? {};

  function saveConfig(key: string, value: Record<string, unknown>) {
    updateConfig.mutate(
      { config_key: key, config_value: value },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: () => toast.error("Failed to save settings"),
      }
    );
  }

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading agent configuration…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Run Schedule
          </CardTitle>
          <CardDescription>
            When the agent runs and what days to surface LinkedIn post reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Run Days</Label>
              <p className="text-sm text-muted-foreground">
                {(schedule.run_days ?? ["Mon", "Tue", "Wed", "Thu", "Fri"]).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">Configured in n8n workflow</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>LinkedIn Reminder Days</Label>
              <p className="text-sm text-muted-foreground">
                {(schedule.linkedin_reminder_days ?? ["Tue", "Thu"]).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">Configured in n8n workflow</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Max Contacts Per Run</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-24"
                defaultValue={schedule.max_contacts_per_run ?? 6}
                onBlur={(e) =>
                  saveConfig("schedule", {
                    ...schedule,
                    max_contacts_per_run: parseInt(e.target.value),
                  })
                }
              />
              <span className="text-sm text-muted-foreground">contacts surfaced per run</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outreach rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Outreach Rules
          </CardTitle>
          <CardDescription>
            Minimum days between agent-initiated outreach to the same contact.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Min Days Between Outreach</Label>
              <Input
                type="number"
                className="w-24"
                defaultValue={outreach.min_days_between_outreach ?? 14}
                onBlur={(e) =>
                  saveConfig("outreach_rules", {
                    ...outreach,
                    min_days_between_outreach: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority Window (days)</Label>
              <Input
                type="number"
                className="w-24"
                defaultValue={outreach.priority_window_days ?? 90}
                onBlur={(e) =>
                  saveConfig("outreach_rules", {
                    ...outreach,
                    priority_window_days: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={outreach.require_approval ?? true}
              onCheckedChange={(v) =>
                saveConfig("outreach_rules", { ...outreach, require_approval: v })
              }
            />
            <div>
              <Label>Require Approval Before Sending</Label>
              <p className="text-xs text-muted-foreground">
                All agent-drafted outreach must be approved in the Agent Log before sending.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SMS Delivery (Twilio)</CardTitle>
          <CardDescription>
            Phone number where the agent sends your daily briefing via SMS.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Your SMS Number</Label>
            <div className="flex items-center gap-2">
              <Input
                className="w-48"
                defaultValue={sms.to_number ?? ""}
                placeholder="+1 (000) 000-0000"
                onBlur={(e) =>
                  saveConfig("sms", { ...sms, to_number: e.target.value })
                }
              />
              <span className="text-sm text-muted-foreground">Twilio configured in n8n</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={sms.enabled ?? true}
              onCheckedChange={(v) =>
                saveConfig("sms", { ...sms, enabled: v })
              }
            />
            <Label>Enable SMS Briefings</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Integrations section ─────────────────────────────────────────────────────

const INTEGRATION_META: Record<string, { label: string; description: string; static?: boolean; staticBadge?: string; staticCls?: string }> = {
  gmail: {
    label: "Gmail",
    description: "Emails to/from contacts are synced and appear on contact timelines.",
  },
  gcal: {
    label: "Google Calendar",
    description: "Calendar events with contacts are synced as meeting interactions.",
  },
  quickbooks: {
    label: "QuickBooks",
    description: "Invoices are imported from QuickBooks and matched to companies.",
  },
  andrea_agent: {
    label: "Andrea Agent",
    description: "Daily autonomous outreach run powered by Claude via n8n.",
  },
  twilio: {
    label: "Twilio SMS",
    description: "Sends your daily BD briefing via SMS to your registered number.",
    static: true,
    staticBadge: "Active",
    staticCls: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

function IntegrationsSection() {
  const { data: syncRows = [], isLoading } = useSyncStatus();

  const syncMap = Object.fromEntries(syncRows.map((r) => [r.service, r]));

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(INTEGRATION_META).map(([key, meta]) => {
        if (meta.static) {
          return (
            <Card key={key}>
              <CardContent className="pt-4 flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{meta.label}</p>
                    <Badge variant="outline" className={`text-xs ${meta.staticCls}`}>
                      {meta.staticBadge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">via n8n</span>
              </CardContent>
            </Card>
          );
        }

        const row = syncMap[key];
        const lastSuccessful = row?.last_sync_status === "success" ? row.last_sync_at : null;

        return (
          <Card key={key}>
            <CardContent className="pt-4 flex flex-col gap-1.5">
              <p className="text-sm font-medium">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
              {lastSuccessful ? (
                <p className="text-xs text-muted-foreground">
                  Last successful sync: {format(parseISO(lastSuccessful), "MMM d, yyyy 'at' h:mm a")}
                  {row?.records_synced != null && ` — ${row.records_synced} records`}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No successful sync recorded.</p>
              )}
              {row?.next_sync_at && (
                <p className="text-xs text-muted-foreground">
                  Next scheduled sync: {format(parseISO(row.next_sync_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
              {row?.error_message && row.last_sync_status === "error" && (
                <p className="text-xs text-red-600 truncate">Last error: {row.error_message}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Change log section ──────────────────────────────────────────────────────

const TABLE_LABELS: Record<string, string> = {
  contacts: "Contact",
  companies: "Company",
  sales_deals: "Deal",
  delivery_engagements: "Engagement",
  invoices: "Invoice",
};

const ACTION_COLORS: Record<string, string> = {
  insert: "bg-emerald-100 text-emerald-700 border-emerald-200",
  update: "bg-blue-100 text-blue-700 border-blue-200",
  delete: "bg-rose-100 text-rose-700 border-rose-200",
};

function ChangeLogSection() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const { data: entries = [], isLoading } = useChangeLog({
    tableName: filter === "all" ? undefined : filter,
    limit: 100,
  });

  function navigateToRecord(tableName: string, recordId: string) {
    switch (tableName) {
      case "contacts": navigate(`/contacts/${recordId}`); break;
      case "companies": navigate(`/companies/${recordId}`); break;
      case "sales_deals": navigate("/sales-pipeline"); break;
      case "invoices": navigate(`/invoices/${recordId}`); break;
      default: break;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "contacts", label: "Contacts" },
          { key: "companies", label: "Companies" },
          { key: "sales_deals", label: "Deals" },
          { key: "invoices", label: "Invoices" },
        ].map((t) => (
          <button
            key={t.key}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              filter === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Loading change history…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No changes recorded yet. Changes will appear here once the migration is applied.
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
          {entries.map((entry) => (
            <Card key={entry.id} className="border shadow-none">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${ACTION_COLORS[entry.action] ?? ""}`}>
                      {entry.action}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {TABLE_LABELS[entry.table_name] ?? entry.table_name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {entry.summary && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">{entry.summary}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs shrink-0 h-7"
                  onClick={() => navigateToRecord(entry.table_name, entry.record_id)}
                >
                  View
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure your CRM and BD agent behavior.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium">Andrea Agent</h2>
        </div>
        <AgentSettings />
      </section>

      <Separator />

      <section>
        <h2 className="text-lg font-medium mb-4">Integrations</h2>
        <IntegrationsSection />
      </section>

      <Separator />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium">Change History</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Track changes to contacts, companies, deals, and invoices. History is retained for review.
        </p>
        <ChangeLogSection />
      </section>
    </div>
  );
}
