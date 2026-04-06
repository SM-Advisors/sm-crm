import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Send,
  Clock,
  Bot,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAgentRuns, useUpdateAgentAction } from "@/hooks/useAgent";
import type { AgentRun, AgentAction } from "@/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "MMM d, yyyy"); } catch { return "—"; }
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "MMM d, yyyy h:mm a"); } catch { return "—"; }
}

function gmailComposeUrl(to: string, subject = "", body = "") {
  const base = "https://mail.google.com/mail/?view=cm&fs=1";
  return `${base}&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending:  { label: "Pending",  className: "bg-amber-100 text-amber-700 border-amber-200" },
    approved: { label: "Approved", className: "bg-blue-100 text-blue-700 border-blue-200" },
    sent:     { label: "Sent",     className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    dismissed:{ label: "Dismissed",className: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  const { label, className } = map[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${className}`}>
      {label}
    </Badge>
  );
}

// ─── Action card ──────────────────────────────────────────────────────────────

function ActionCard({ action }: { action: AgentAction }) {
  const navigate = useNavigate();
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const updateAction = useUpdateAgentAction();

  const contact = (action as any).contact;
  const contactName = contact
    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
    : action.contact_id;

  function approve() {
    updateAction.mutate(
      { id: action.id, status: "approved" },
      {
        onSuccess: () => toast.success("Action approved"),
        onError: () => toast.error("Failed to approve"),
      }
    );
  }

  function markSent() {
    updateAction.mutate(
      { id: action.id, status: "sent" },
      {
        onSuccess: () => toast.success("Marked as sent"),
        onError: () => toast.error("Failed to update"),
      }
    );
  }

  function dismiss() {
    updateAction.mutate(
      { id: action.id, status: "dismissed", dismiss_reason: dismissReason || undefined },
      {
        onSuccess: () => { toast.success("Action dismissed"); setDismissOpen(false); },
        onError: () => toast.error("Failed to dismiss"),
      }
    );
  }

  const isDone = action.status === "sent" || action.status === "dismissed";

  // Build Gmail URL if we have content + contact email
  const gmailUrl = action.content && (action as any).contact?.email
    ? gmailComposeUrl(
        (action as any).contact.email,
        "Reaching out",
        action.content
      )
    : null;

  return (
    <Card className={isDone ? "opacity-60" : ""}>
      <CardContent className="pt-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={action.status} />
              <Badge variant="outline" className="text-xs capitalize">
                {action.action_type}
              </Badge>
              {contactName && (
                <button
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => contact && navigate(`/contacts/${contact.id}`)}
                >
                  {contactName}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isDone && (
            <div className="flex gap-1.5 shrink-0">
              {action.status === "pending" && (
                <Button size="sm" variant="outline" onClick={approve} disabled={updateAction.isPending}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Approve
                </Button>
              )}
              {action.status === "approved" && gmailUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={gmailUrl} target="_blank" rel="noopener noreferrer" onClick={markSent}>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Open in Gmail
                    <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                  </a>
                </Button>
              )}
              {action.status === "approved" && !gmailUrl && (
                <Button size="sm" variant="outline" onClick={markSent} disabled={updateAction.isPending}>
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Mark Sent
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setDismissOpen(true)}
                disabled={updateAction.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Dismiss
              </Button>
            </div>
          )}
        </div>

        {/* Content / draft */}
        {action.content && (
          <div className="rounded-md border bg-card px-3 py-2 text-sm whitespace-pre-wrap">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Draft
            </p>
            {action.content}
          </div>
        )}

        {/* Timestamps */}
        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          {action.approved_at && <span>Approved {formatDateTime(action.approved_at)}</span>}
          {action.sent_at && <span>Sent {formatDateTime(action.sent_at)}</span>}
          {action.dismiss_reason && (
            <span>Dismissed: {action.dismiss_reason}</span>
          )}
        </div>
      </CardContent>

      {/* Dismiss dialog */}
      <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dismiss Action</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="Why are you dismissing this?"
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissOpen(false)}>Cancel</Button>
            <Button onClick={dismiss} disabled={updateAction.isPending}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Run section ──────────────────────────────────────────────────────────────

function RunSection({ run }: { run: AgentRun }) {
  const [open, setOpen] = useState((run.actions ?? []).some((a: AgentAction) => a.status === "pending"));
  const actions: AgentAction[] = (run as any).actions ?? [];
  const pendingCount = actions.filter((a) => a.status === "pending").length;

  const statusIcon = pendingCount > 0
    ? <Clock className="h-4 w-4 text-amber-500" />
    : <CheckCircle className="h-4 w-4 text-emerald-500" />;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-muted/40 transition-colors text-left">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          {statusIcon}
          <div className="flex-1">
            <span className="text-sm font-medium">{formatDate(run.run_date)} Agent Run</span>
            <span className="text-xs text-muted-foreground ml-2">
              {actions.length} action{actions.length !== 1 ? "s" : ""}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-4 px-1 text-xs">
                  {pendingCount} pending
                </Badge>
              )}
            </span>
          </div>
          {run.reasoning_summary && (
            <span className="text-xs text-muted-foreground hidden md:block max-w-xs truncate">
              {run.reasoning_summary}
            </span>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 flex flex-col gap-3">
          {run.reasoning_summary && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <p className="text-xs font-medium uppercase tracking-wide mb-1">Run Summary</p>
              {run.reasoning_summary}
            </div>
          )}
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions generated this run.</p>
          ) : (
            actions.map((action) => <ActionCard key={action.id} action={action} />)
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentLogPage() {
  const { data: runs = [], isLoading } = useAgentRuns();

  const pendingTotal = runs.flatMap((r) => (r as any).actions ?? []).filter(
    (a: AgentAction) => a.status === "pending"
  ).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agent Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading…"
              : `${runs.length} runs · ${pendingTotal} action${pendingTotal !== 1 ? "s" : ""} awaiting review`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading agent runs…
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <Bot className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No agent runs yet.</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Once the BD agent runs, surfaced outreach recommendations will appear here for your review.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {runs.map((run) => (
            <RunSection key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
