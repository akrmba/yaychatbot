"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Zap, Rocket, Building2, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { billingApi, UsageSummary, Invoice } from "@/lib/api";

// ─── Plan metadata ────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "STARTER" as const,
    name: "Starter",
    price: 49,
    icon: Zap,
    features: ["1 widget", "500 conversations/mo", "Basic analytics", "Email support"],
  },
  {
    id: "GROWTH" as const,
    name: "Growth",
    price: 149,
    icon: Rocket,
    features: [
      "5 widgets",
      "5,000 conversations/mo",
      "Advanced analytics",
      "Calendar integration",
      "Priority support",
    ],
  },
  {
    id: "SCALE" as const,
    name: "Scale",
    price: 499,
    icon: Building2,
    features: [
      "Unlimited widgets",
      "50,000 conversations/mo",
      "Custom integrations",
      "Dedicated CSM",
      "SLA guarantee",
    ],
  },
];

const PLAN_RANK: Record<string, number> = { FREE: 0, STARTER: 1, GROWTH: 2, SCALE: 3 };

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ percent, isOver }: { percent: number; isOver: boolean }) {
  const color = isOver ? "bg-destructive" : percent >= 80 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

// ─── Cost cap input ───────────────────────────────────────────────────────────

function CostCapSection({
  currentCap,
  onSave,
}: {
  currentCap: number | null;
  onSave: (cents: number) => Promise<void>;
}) {
  const [value, setValue] = useState(
    currentCap != null ? String(currentCap / 100) : "",
  );
  const [saving, startSave] = useTransition();

  function handleSave() {
    const dollars = parseFloat(value);
    const cents = isNaN(dollars) || dollars <= 0 ? 0 : Math.round(dollars * 100);
    startSave(() => onSave(cents));
  }

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <label className="text-sm font-medium mb-1 block">
          Monthly spend ceiling (USD)
        </label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">$</span>
          <input
            type="number"
            min="0"
            step="10"
            placeholder="No limit"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Widget falls back to email capture when this limit is reached.
        </p>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [portalLoading, startPortal] = useTransition();

  useEffect(() => {
    Promise.all([billingApi.getUsage(), billingApi.getInvoices()])
      .then(([u, inv]) => {
        setUsage(u);
        setInvoices(inv);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubscribe(planId: string) {
    setSubscribing(planId);
    try {
      const { clientSecret } = await billingApi.subscribe(planId);
      if (clientSecret) {
        // Redirect to Stripe-hosted payment setup
        window.location.href = `/settings/billing/setup?secret=${clientSecret}`;
      } else {
        window.location.reload();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubscribing(null);
    }
  }

  function handleManage() {
    startPortal(async () => {
      try {
        const { url } = await billingApi.getPortalUrl();
        window.location.href = url;
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  async function handleCostCap(cents: number) {
    await billingApi.setCostCap(cents);
    const updated = await billingApi.getUsage();
    setUsage(updated);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-40 rounded-lg bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  const currentPlan = usage?.plan ?? "FREE";
  const trialDaysLeft = usage?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(usage.trialEndsAt).getTime() - Date.now()) / 86_400_000,
        ),
      )
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and payment details
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Current plan banner ── */}
      {usage && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg capitalize">
                  {currentPlan.charAt(0) + currentPlan.slice(1).toLowerCase()} Plan
                </CardTitle>
                {trialDaysLeft != null && trialDaysLeft > 0 && (
                  <CardDescription className="text-amber-600 font-medium">
                    Trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}
                  </CardDescription>
                )}
              </div>
              <Badge variant="default">Current plan</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Conversation usage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Conversations this month</span>
                <span className={usage.isOverLimit ? "text-destructive font-semibold" : "font-medium"}>
                  {usage.conversationCount.toLocaleString()} / {usage.conversationLimit.toLocaleString()}
                  {usage.isOverLimit && " — overage billing active"}
                </span>
              </div>
              <UsageBar percent={usage.usagePercent} isOver={usage.isOverLimit} />
            </div>

            {/* Widget usage */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Widgets active</span>
                <p className="font-semibold">
                  {usage.widgetCount} / {usage.widgetLimit === 999 ? "∞" : usage.widgetLimit}
                </p>
              </div>
              {usage.currentSpendCents > 0 && (
                <div>
                  <span className="text-muted-foreground">Spend this month</span>
                  <p className="font-semibold">
                    ${(usage.currentSpendCents / 100).toFixed(2)}
                    {usage.costCapCents != null && (
                      <span className="text-muted-foreground font-normal">
                        {" "}/ ${(usage.costCapCents / 100).toFixed(0)} cap
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          {currentPlan !== "FREE" && (
            <CardFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManage}
                disabled={portalLoading}
              >
                {portalLoading ? "Redirecting…" : "Manage billing"}
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* ── Cost cap ── */}
      {usage && currentPlan !== "FREE" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend protection</CardTitle>
            <CardDescription>
              Set a monthly ceiling. When reached, the chat widget switches to email capture instead of AI responses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CostCapSection
              currentCap={usage.costCapCents}
              onSave={handleCostCap}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Plan comparison ── */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Plans</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {PLANS.map(({ id, name, price, icon: Icon, features }) => {
            const isCurrent = currentPlan === id;
            const isUpgrade = PLAN_RANK[id] > PLAN_RANK[currentPlan];
            const isDowngrade = PLAN_RANK[id] < PLAN_RANK[currentPlan];
            const isLoading = subscribing === id;

            return (
              <Card key={id} className={isCurrent ? "border-primary ring-1 ring-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{name}</CardTitle>
                    {isCurrent && (
                      <Badge className="ml-auto" variant="default">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold">
                    ${price}
                    <span className="text-sm font-normal text-muted-foreground"> / mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isUpgrade ? "default" : "outline"}
                      disabled={isLoading}
                      onClick={() => handleSubscribe(id)}
                    >
                      {isLoading
                        ? "Processing…"
                        : isUpgrade
                        ? `Upgrade to ${name}`
                        : `Downgrade to ${name}`}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── Invoice history ── */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Invoice history</h2>
        <Card>
          <CardContent className="pt-6">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No invoices yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Invoice</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 font-mono text-xs">
                        {inv.number ?? inv.id.slice(0, 12)}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(inv.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 font-medium">
                        {(inv.amount / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: inv.currency.toUpperCase(),
                        })}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={inv.status === "paid" ? "success" : inv.status === "open" ? "outline" : "destructive"}
                        >
                          {inv.status ?? "unknown"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm" className="text-xs h-7">
                              Download
                            </Button>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
