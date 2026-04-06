import { useMemo } from "react";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInvoices } from "@/hooks/useInvoices";
import { useInteractions } from "@/hooks/useInteractions";
import { useSalesDeals } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { INTERACTION_TYPE_LABELS } from "@/types";

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

// ─── Revenue charts ───────────────────────────────────────────────────────────

function RevenueTab() {
  const { data: invoices = [] } = useInvoices();

  // Monthly invoiced + collected (last 12 months)
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; invoiced: number; collected: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(startOfMonth(d), "yyyy-MM");
      months[key] = { month: format(d, "MMM yy"), invoiced: 0, collected: 0 };
    }
    for (const inv of invoices) {
      if (!inv.invoice_date) continue;
      try {
        const key = format(startOfMonth(parseISO(inv.invoice_date)), "yyyy-MM");
        if (months[key]) {
          months[key].invoiced += inv.total ?? 0;
          months[key].collected += inv.amount_paid ?? 0;
        }
      } catch {}
    }
    return Object.values(months);
  }, [invoices]);

  // Status breakdown pie
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inv of invoices) {
      counts[inv.status ?? "unknown"] = (counts[inv.status ?? "unknown"] ?? 0) + (inv.total ?? 0);
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total ?? 0), 0);
  const totalCollected = invoices.reduce((s, i) => s + (i.amount_paid ?? 0), 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "voided")
    .reduce((s, i) => s + ((i.total ?? 0) - (i.amount_paid ?? 0)), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Invoiced", value: `$${totalInvoiced.toLocaleString()}` },
          { label: "Total Collected", value: `$${totalCollected.toLocaleString()}` },
          { label: "Outstanding", value: `$${totalOutstanding.toLocaleString()}` },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className="text-2xl font-semibold mt-1">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => `$${v.toLocaleString()}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="invoiced" name="Invoiced" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill={COLORS[1]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Activity charts ──────────────────────────────────────────────────────────

function ActivityTab() {
  const { data: interactions = [] } = useInteractions();
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useSalesDeals();

  // Monthly interaction count (last 12 months)
  const monthlyActivity = useMemo(() => {
    const months: Record<string, { month: string; count: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(startOfMonth(d), "yyyy-MM");
      months[key] = { month: format(d, "MMM yy"), count: 0 };
    }
    for (const interaction of interactions) {
      if (!interaction.occurred_at) continue;
      try {
        const key = format(startOfMonth(parseISO(interaction.occurred_at)), "yyyy-MM");
        if (months[key]) months[key].count += 1;
      } catch {}
    }
    return Object.values(months);
  }, [interactions]);

  // Activity type breakdown
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of interactions) {
      counts[i.type] = (counts[i.type] ?? 0) + 1;
    }
    return Object.entries(counts).map(([type, count]) => ({
      name: INTERACTION_TYPE_LABELS[type as keyof typeof INTERACTION_TYPE_LABELS] ?? type,
      value: count,
    }));
  }, [interactions]);

  // Pipeline stage breakdown
  const pipelineData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of deals) counts[d.stage] = (counts[d.stage] ?? 0) + 1;
    return Object.entries(counts).map(([stage, count]) => ({
      stage: stage.replace(/_/g, " "),
      count,
    }));
  }, [deals]);

  // Contact categories
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contacts) {
      const cats: string[] = (c as any).categories ?? ["uncategorized"];
      for (const cat of cats) counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [contacts]);

  return (
    <div className="flex flex-col gap-6">
      {/* Monthly activity line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Activity (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyActivity} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="count"
                name="Interactions"
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Activity type pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity by Type</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {typeBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contact categories pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacts by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline stage bar */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sales Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" name="Deals" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue and activity dashboards</p>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="revenue" className="mt-6">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
