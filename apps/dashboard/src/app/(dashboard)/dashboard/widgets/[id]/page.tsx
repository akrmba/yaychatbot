"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Copy, Check } from "lucide-react";

// In production: fetch widget by params.id from Supabase
const mockWidget = {
  id: "w1",
  name: "Main Website Bot",
  domain: "acme.com",
  vertical: "saas",
  is_active: true,
  calendarUrl: "https://calendly.com/acme/30min",
  primaryColor: "#8b5cf6",
  greeting: "Hi! I'm here to help you find the right plan. Mind if I ask a few quick questions?",
};

export default function WidgetSettingsPage({ params }: { params: { id: string } }) {
  const [widget, setWidget] = useState(mockWidget);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = `<script>
  window.YayChatbot = { widgetId: "${params.id}" };
</script>
<script src="https://cdn.yaychatbot.com/widget.js" async></script>`;

  function handleSave() {
    // In production: call Server Action to update widget
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/widgets">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Widgets
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{widget.name}</h1>
          <Badge variant={widget.is_active ? "success" : "secondary"}>
            {widget.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="playbook">Playbook</TabsTrigger>
          <TabsTrigger value="install">Install</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget settings</CardTitle>
              <CardDescription>Basic configuration for this widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Widget name</Label>
                <Input value={widget.name} onChange={(e) => setWidget({ ...widget, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input value={widget.domain} onChange={(e) => setWidget({ ...widget, domain: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Calendar booking URL</Label>
                <Input
                  placeholder="https://calendly.com/..."
                  value={widget.calendarUrl}
                  onChange={(e) => setWidget({ ...widget, calendarUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Opening greeting</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={widget.greeting}
                  onChange={(e) => setWidget({ ...widget, greeting: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Label>Widget active</Label>
                  <button
                    onClick={() => setWidget({ ...widget, is_active: !widget.is_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${widget.is_active ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${widget.is_active ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <Button onClick={handleSave}>
                  {saved ? <><Check className="h-4 w-4 mr-1" /> Saved</> : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the widget looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Primary color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={widget.primaryColor}
                    onChange={(e) => setWidget({ ...widget, primaryColor: e.target.value })}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <Input
                    value={widget.primaryColor}
                    onChange={(e) => setWidget({ ...widget, primaryColor: e.target.value })}
                    className="w-32 font-mono"
                  />
                </div>
              </div>
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">Preview</p>
                <div className="flex justify-end">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer"
                    style={{ backgroundColor: widget.primaryColor }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave}>Save changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playbook" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Playbook editor</h2>
              <p className="text-sm text-muted-foreground">Build your qualification flow visually</p>
            </div>
            <Button asChild>
              <Link href={`/dashboard/widgets/${params.id}/playbook`}>Open full editor</Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="install" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Install snippet</CardTitle>
              <CardDescription>Paste this before the closing &lt;/body&gt; tag on {widget.domain}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                {snippet}
              </pre>
              <Button variant="outline" onClick={copySnippet}>
                {copied ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy snippet</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
