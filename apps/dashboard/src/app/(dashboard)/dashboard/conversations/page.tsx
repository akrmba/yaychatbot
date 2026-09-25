import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

// Mock data — replace with Supabase query
const conversations = [
  { id: "c1", visitor_id: "v_abc123", status: "qualified", widget_name: "Main Website Bot", message_count: 12, created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: "c2", visitor_id: "v_def456", status: "active", widget_name: "Pricing Page Bot", message_count: 4, created_at: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: "c3", visitor_id: "v_ghi789", status: "disqualified", widget_name: "Main Website Bot", message_count: 7, created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "c4", visitor_id: "v_jkl012", status: "abandoned", widget_name: "Main Website Bot", message_count: 2, created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
];

const statusVariant: Record<string, "success" | "default" | "destructive" | "secondary"> = {
  qualified: "success",
  active: "default",
  disqualified: "destructive",
  abandoned: "secondary",
};

export default function ConversationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground mt-1">Live and recent chat sessions</p>
      </div>

      <div className="grid gap-3">
        {conversations.map((conv) => (
          <Link key={conv.id} href={`/dashboard/conversations/${conv.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">
                      Visitor {conv.visitor_id.slice(-6)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{conv.widget_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{conv.message_count} messages</span>
                  <Badge variant={statusVariant[conv.status] ?? "secondary"}>{conv.status}</Badge>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(conv.created_at)}</span>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
