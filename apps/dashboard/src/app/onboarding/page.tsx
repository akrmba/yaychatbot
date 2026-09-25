"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check, Globe, Building2, MessageSquare, Calendar, Code2 } from "lucide-react";

const STEPS = [
  { id: 1, label: "Domain", icon: Globe },
  { id: 2, label: "Vertical", icon: Building2 },
  { id: 3, label: "Playbook", icon: MessageSquare },
  { id: 4, label: "Calendar", icon: Calendar },
  { id: 5, label: "Install", icon: Code2 },
];

const VERTICALS = [
  { id: "saas", label: "SaaS / Software" },
  { id: "agency", label: "Agency / Consulting" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "real_estate", label: "Real Estate" },
  { id: "healthcare", label: "Healthcare" },
  { id: "other", label: "Other" },
];

type FormData = {
  domain: string;
  widgetName: string;
  vertical: string;
  qualifyBudget: boolean;
  qualifyTimeline: boolean;
  qualifyRole: boolean;
  calendarUrl: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    domain: "",
    widgetName: "",
    vertical: "",
    qualifyBudget: true,
    qualifyTimeline: true,
    qualifyRole: true,
    calendarUrl: "",
  });
  const [widgetId] = useState(() => crypto.randomUUID());

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  function next() { setStep((s) => Math.min(s + 1, STEPS.length)); }
  function back() { setStep((s) => Math.max(s - 1, 1)); }

  function finish() {
    // In production: save widget via Server Action then redirect
    router.push("/dashboard");
  }

  const installSnippet = `<script>
  window.YayChatbot = { widgetId: "${widgetId}" };
</script>
<script src="https://cdn.yaychatbot.com/widget.js" async></script>`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map(({ id, label, icon: Icon }) => (
            <div key={id} className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors",
                step > id ? "bg-primary border-primary text-white" :
                step === id ? "border-primary text-primary bg-white" :
                "border-muted text-muted-foreground bg-white"
              )}>
                {step > id ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn("text-xs font-medium hidden sm:block", step === id ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="mb-6 h-1.5" />

        <Card>
          {/* Step 1: Domain */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Where will the chatbot live?</CardTitle>
                <CardDescription>Enter the domain you want to install YayChatbot on</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="widgetName">Widget name</Label>
                  <Input
                    id="widgetName"
                    placeholder="My Website Bot"
                    value={form.widgetName}
                    onChange={(e) => setForm({ ...form, widgetName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    placeholder="https://yoursite.com"
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button onClick={next} disabled={!form.domain || !form.widgetName}>Continue</Button>
              </CardFooter>
            </>
          )}

          {/* Step 2: Vertical */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>What industry are you in?</CardTitle>
                <CardDescription>We&apos;ll pre-configure your playbook for your vertical</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {VERTICALS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setForm({ ...form, vertical: id })}
                      className={cn(
                        "rounded-lg border-2 p-4 text-left text-sm font-medium transition-colors",
                        form.vertical === id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={next} disabled={!form.vertical}>Continue</Button>
              </CardFooter>
            </>
          )}

          {/* Step 3: Playbook */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Configure your qualification playbook</CardTitle>
                <CardDescription>Choose what the bot asks to qualify leads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "qualifyBudget" as const, label: "Ask about budget", description: "\"What's your monthly budget for this?\"" },
                  { key: "qualifyTimeline" as const, label: "Ask about timeline", description: "\"When are you looking to get started?\"" },
                  { key: "qualifyRole" as const, label: "Ask about decision-making role", description: "\"Are you the decision maker?\"" },
                ].map(({ key, label, description }) => (
                  <div
                    key={key}
                    onClick={() => setForm({ ...form, [key]: !form[key] })}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors",
                      form[key] ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 shrink-0",
                      form[key] ? "bg-primary border-primary text-white" : "border-muted-foreground"
                    )}>
                      {form[key] && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={next}>Continue</Button>
              </CardFooter>
            </>
          )}

          {/* Step 4: Calendar */}
          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle>Connect your calendar</CardTitle>
                <CardDescription>Paste your Calendly or Cal.com booking link so leads can book directly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="calendarUrl">Booking link</Label>
                  <Input
                    id="calendarUrl"
                    placeholder="https://calendly.com/yourname/30min"
                    value={form.calendarUrl}
                    onChange={(e) => setForm({ ...form, calendarUrl: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You can skip this and add it later in widget settings.
                </p>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={next}>Continue</Button>
              </CardFooter>
            </>
          )}

          {/* Step 5: Install */}
          {step === 5 && (
            <>
              <CardHeader>
                <CardTitle>Install your widget</CardTitle>
                <CardDescription>Paste this snippet before the closing &lt;/body&gt; tag on {form.domain}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                  {installSnippet}
                </pre>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(installSnippet)}
                  >
                    Copy snippet
                  </Button>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  Your widget ID is <code className="font-mono font-semibold">{widgetId.slice(0, 8)}…</code>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={finish}>Go to dashboard</Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
