"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Search, Download, Calendar, Mail, Phone } from "lucide-react";
import type { Lead } from "@/lib/supabase";

// Mock data — replace with Supabase query
const mockLeads: Lead[] = [
  { id: "l1", conversation_id: "c1", widget_id: "w1", name: "Alice Johnson", email: "alice@acme.com", phone: "+1 555-0101", score: 92, meeting_booked: true, created_at: "2024-07-15T10:30:00Z" },
  { id: "l2", conversation_id: "c2", widget_id: "w1", name: "Bob Chen", email: "bob@startup.io", phone: null, score: 78, meeting_booked: false, created_at: "2024-07-14T14:20:00Z" },
  { id: "l3", conversation_id: "c3", widget_id: "w1", name: "Carol White", email: "carol@corp.com", phone: "+1 555-0303", score: 85, meeting_booked: true, created_at: "2024-07-14T09:15:00Z" },
  { id: "l4", conversation_id: "c4", widget_id: "w2", name: "David Kim", email: "david@agency.co", phone: null, score: 61, meeting_booked: false, created_at: "2024-07-13T16:45:00Z" },
  { id: "l5", conversation_id: "c5", widget_id: "w1", name: "Eva Martinez", email: "eva@design.studio", phone: "+1 555-0505", score: 95, meeting_booked: true, created_at: "2024-07-12T11:00:00Z" },
  { id: "l6", conversation_id: "c6", widget_id: "w2", name: "Frank Lee", email: "frank@tech.co", phone: null, score: 44, meeting_booked: false, created_at: "2024-07-11T08:30:00Z" },
];

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 80 ? "success" : score >= 60 ? "warning" : "secondary";
  return <Badge variant={variant}>{score}</Badge>;
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "booked" | "not_booked">("all");

  const filtered = mockLeads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "booked" && lead.meeting_booked) ||
      (filter === "not_booked" && !lead.meeting_booked);
    return matchesSearch && matchesFilter;
  });

  function exportCsv() {
    const rows = [
      ["Name", "Email", "Phone", "Score", "Meeting Booked", "Date"],
      ...filtered.map((l) => [
        l.name ?? "",
        l.email ?? "",
        l.phone ?? "",
        String(l.score),
        l.meeting_booked ? "Yes" : "No",
        formatDate(l.created_at),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">{mockLeads.length} total leads captured</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "booked", "not_booked"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "booked" ? "Meeting booked" : "No meeting"}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Contact</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Meeting</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium">{lead.name ?? "—"}</td>
                    <td className="py-3">
                      <div className="space-y-0.5">
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${lead.email}`} className="hover:text-foreground transition-colors">
                              {lead.email}
                            </a>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <ScoreBadge score={lead.score} />
                    </td>
                    <td className="py-3">
                      {lead.meeting_booked ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Booked</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No leads match your search.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
