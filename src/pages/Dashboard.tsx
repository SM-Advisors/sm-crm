import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign, Target, TrendingUp, FileText,
  Users, Send, Calendar, ClipboardList,
  Check, X, Mail, Phone, UserPlus, FileCheck,
} from "lucide-react";

const metrics = [
  { label: "Total Pipeline", value: "$430,000", icon: DollarSign },
  { label: "Weighted Pipeline", value: "$287,500", icon: Target },
  { label: "Revenue This Quarter", value: "$142,000", icon: TrendingUp },
  { label: "Outstanding Invoices", value: "$38,500", icon: FileText },
  { label: "Contacts Touched This Week", value: "14", icon: Users },
  { label: "Outreach Sent", value: "8", icon: Send },
  { label: "Days Since Last BD", value: "0", icon: Calendar },
  { label: "Agent Drafts Pending", value: "6", icon: ClipboardList },
];

const surfacings = [
  { name: "Sarah Mitchell", reason: "No contact in 45 days — warm lead, $80k opp" },
  { name: "James Thornton", reason: "Contract renewal due in 14 days" },
  { name: "Priya Desai", reason: "Engaged with 3 emails last week, no meeting set" },
  { name: "Michael Chen", reason: "Referred by existing client, intro pending" },
];

const activities = [
  { icon: Mail, text: "Email sent to Sarah Mitchell", time: "12 min ago" },
  { icon: Phone, text: "Call logged with Acme Corp", time: "1 hr ago" },
  { icon: UserPlus, text: "New contact added: Lisa Park", time: "2 hrs ago" },
  { icon: FileCheck, text: "Invoice #1042 marked paid", time: "3 hrs ago" },
  { icon: Send, text: "Proposal sent to Thornton Group", time: "5 hrs ago" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="border border-border shadow-sm dark:shadow-none">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <m.icon size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-lg font-semibold text-foreground">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Surfacing */}
        <Card className="lg:col-span-2 border border-border shadow-sm dark:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's Agent Surfacing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {surfacings.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between p-3 rounded-md border border-border bg-background"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.reason}</p>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Check size={14} /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground">
                    <X size={14} /> Skip
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border border-border shadow-sm dark:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <a.icon size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
