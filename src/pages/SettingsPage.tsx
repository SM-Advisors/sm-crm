import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAgentConfig, useUpdateAgentConfig } from "@/hooks/useAgent";
import { useSyncStatus, useManualSync } from "@/hooks/useSyncStatus";
import { toast } from "sonner";
import { Bot, Zap, RefreshCcw, Bell, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Agent config section ─────────────────────────────────────────────────────

function AgentSettings() {
  const { data: configs = [], isLoading } = useAgentConfig();
  const updateConfig = useUpdateAgentConfig();

  // Build a quick-access map
  const configMap = Object.fromEntries(configs.map((c) => [c.config_key, c.config_value]));

  const schedule = configMap["schedule"] as any ?? {};
  const outreach = configMap["outreach_rules"] as any ?? {};
  const research = configMap["research"] as any ?? {};
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

      {/* Research */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Perplexity Research
          </CardTitle>
          <CardDescription>
            When and how the agent uses Perplexity to research contacts before drafting outreach.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={research.enabled ?? true}
              onCheckedChange={(v) =>
                saveConfig("research", { ...research, enabled: v })
              }
            />
            <div>
              <Label>Enable Perplexity Research</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, the agent will research prospects with recent activity before drafting.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Research Cache TTL (days)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-24"
                defaultValue={research.cache_ttl_days ?? 7}
                onBlur={(e) =>
                  saveConfig("research", {
                    ...research,
                    cache_ttl_days: parseInt(e.target.value),
                  })
                }
              />
              <span className="text-sm text-muted-foreground">days before re-researching a contact</span>
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
  bd_agent: {
    label: "BD Agent",
    description: "Daily autonomous outreach run powered by Claude + Perplexity via n8n.",
  },
  perplexity: {
    label: "Perplexity API",
    description: "Real-time research on high-priority contacts before outreach drafts.",
    static: true,
    staticBadge: "Active",
    staticCls: "bg-blue-100 text-blue-700 border-blue-200",
  },
  twilio: {
    label: "Twilio SMS",
    description: "Sends your daily BD briefing via SMS to your registered number.",
    static: true,
    staticBadge: "Active",
    staticCls: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

function syncStatusBadge(status: string | null) {
  if (!status || status === "never") {
    return { icon: <Clock className="h-3 w-3" />, label: "Never run", cls: "bg-slate-100 text-slate-600 border-slate-200" };
  }
  if (status === "requested") {
    return { icon: <Loader2 className="h-3 w-3 animate-spin" />, label: "Syncing…", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  }
  if (status === "success") {
    return { icon: <CheckCircle2 className="h-3 w-3" />, label: "Synced", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }
  if (status === "error") {
    return { icon: <AlertCircle className="h-3 w-3" />, label: "Error", cls: "bg-red-100 text-red-700 border-red-200" };
  }
  return { icon: <Clock className="h-3 w-3" />, label: status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
}

function IntegrationsSection() {
  const { data: syncRows = [], isLoading } = useSyncStatus();
  const manualSync = useManualSync();

  const syncMap = Object.fromEntries(syncRows.map((r) => [r.service, r]));

  function handleSync(service: string) {
    manualSync.mutate(service, {
      onSuccess: () => toast.success(`Sync requested for ${INTEGRATION_META[service]?.label ?? service}`),
      onError: () => toast.error("Failed to request sync"),
    });
  }

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
        const badge = syncStatusBadge(row?.last_sync_status ?? null);
        const lastRun = row?.last_sync_at
          ? formatDistanceToNow(new Date(row.last_sync_at), { addSuffix: true })
          : null;

        return (
          <Card key={key}>
            <CardContent className="pt-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <Badge variant="outline" className={`text-xs flex items-center gap-1 ${badge.cls}`}>
                    {badge.icon}
                    {badge.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
                {lastRun && (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {lastRun}
                    {row?.records_synced != null && ` — ${row.records_synced} records`}
                  </p>
                )}
                {row?.error_message && (
                  <p className="text-xs text-red-600 truncate">{row.error_message}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                disabled={manualSync.isPending || row?.last_sync_status === "requested"}
                onClick={() => handleSync(key)}
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Sync now
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
          <h2 className="text-lg font-medium">BD Agent</h2>
        </div>
        <AgentSettings />
      </section>

      <Separator />

      <section>
        <h2 className="text-lg font-medium mb-4">Integrations</h2>
        <IntegrationsSection />
      </section>
    </div>
  );
}
