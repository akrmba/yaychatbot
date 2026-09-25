import { createClient } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface UsageSummary {
  plan: "FREE" | "STARTER" | "GROWTH" | "SCALE";
  conversationCount: number;
  conversationLimit: number;
  usagePercent: number;
  isOverLimit: boolean;
  widgetCount: number;
  widgetLimit: number;
  costCapCents: number | null;
  currentSpendCents: number;
  trialEndsAt: string | null;
  month: string;
}

export interface Invoice {
  id: string;
  number: string | null;
  date: string;
  amount: number;
  currency: string;
  status: string | null;
  pdfUrl: string | null;
}

export const billingApi = {
  getUsage: () => apiFetch<UsageSummary>("/billing/usage"),
  getInvoices: () => apiFetch<Invoice[]>("/billing/invoices"),
  subscribe: (plan: string) =>
    apiFetch<{ subscriptionId: string; clientSecret: string | null }>("/billing/subscribe", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
  getPortalUrl: () =>
    apiFetch<{ url: string }>("/billing/portal", { method: "POST" }),
  setCostCap: (costCapCents: number) =>
    apiFetch<void>("/billing/cost-cap", {
      method: "PUT",
      body: JSON.stringify({ costCapCents }),
    }),
};
