import { Calendar, MessageSquare, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ConversionFunnel, LeadsChart } from "@/components/analytics/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Mock data — replace with real Supabase queries
const kpis = [
  { title: "Meetings Booked", value: 54, change: 12, icon: <Calendar className="h-4 w-4" /> },
  { title: "Lead Capture Rate", value: "42%", change: 8, icon: <TrendingUp className="h-4 w-4" /> },
  { title: "Active Conversations", value: 18, change: -3, icon: <MessageSquare className="h-4 w-4" /> },
  { title: "Total Leads", value: 312, change: 21, icon: <Users className="h-4 w-4" /> },
];

const chartData = [
  { date: "Jan", leads: 40, meetings: 12 },
  { date: "Feb", leads: 55, meetings: 18 },
  { date: "Mar", leads: 48, meetings: 14 },
  { date: "Apr", leads: 70, meetings: 22 },
  { date: "May", leads: 65, meetings: 20 },
  { date: "Jun", leads: 90, meetings: 28 },
  { date: "Jul", leads: 80, meetings: 25 },
];

const recentLeads = [
  { id: "1", name: "Alice Johnson", email: "alice@acme.com", score: 92, meeting_booked: true, created_at: "2024-07-15" },
  { id: "2", name: "Bob Chen", email: "bob@startup.io", score: 78, meeting_booked: false, created_at: "2024-07-14" },
  { id: "3", name: "Carol White", email: "carol@corp.com", score: 85, meeting_booked: true, created_at: "2024-07-14" },
  { id: "4", name: "David Kim", email: "david@agency.co", score: 61, meeting_booked: false, created_at: "2024-07-13" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Your chatbot performance at a glance</p>
        </div>
        <Button asChild>
          <Link href="/onboarding">+ New Widget</Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Leads & Meetings</CardTitle>
            <CardDescription>Monthly breakdown over the last 7 months</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadsChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Visitors → Qualified → Booked</CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionFunnel />
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Latest qualified prospects</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/leads">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Score: {lead.score}</span>
                  <Badge variant={lead.meeting_booked ? "success" : "secondary"}>
                    {lead.meeting_booked ? "Meeting booked" : "No meeting"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
