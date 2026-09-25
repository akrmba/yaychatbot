import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, ExternalLink, Plus } from "lucide-react";

// Mock data — replace with Supabase query
const widgets = [
  { id: "w1", name: "Main Website Bot", domain: "acme.com", vertical: "SaaS", is_active: true, leads: 142, meetings: 28 },
  { id: "w2", name: "Pricing Page Bot", domain: "acme.com/pricing", vertical: "SaaS", is_active: false, leads: 34, meetings: 6 },
];

export default function WidgetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Widgets</h1>
          <p className="text-muted-foreground mt-1">Manage your chatbot widgets</p>
        </div>
        <Button asChild>
          <Link href="/onboarding">
            <Plus className="h-4 w-4 mr-2" />
            New widget
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {widgets.map((widget) => (
          <Card key={widget.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{widget.name}</CardTitle>
                  <Badge variant={widget.is_active ? "success" : "secondary"}>
                    {widget.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <ExternalLink className="h-3 w-3" />
                  {widget.domain}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/widgets/${widget.id}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Leads captured</span>
                  <p className="font-semibold text-lg">{widget.leads}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Meetings booked</span>
                  <p className="font-semibold text-lg">{widget.meetings}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vertical</span>
                  <p className="font-semibold text-lg">{widget.vertical}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
