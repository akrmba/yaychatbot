import { Plan } from "@prisma/client";

export interface PlanConfig {
  conversationLimit: number;
  widgetLimit: number;
  monthlyPrice: number;
  stripePriceId: string;
  stripeMeteredPriceId?: string; // for overage billing
  features: string[];
}

export const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  FREE: {
    conversationLimit: 100,
    widgetLimit: 1,
    monthlyPrice: 0,
    stripePriceId: "",
    features: ["1 widget", "100 conversations/mo", "Basic analytics"],
  },
  STARTER: {
    conversationLimit: 500,
    widgetLimit: 1,
    monthlyPrice: 49,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? "",
    stripeMeteredPriceId: process.env.STRIPE_PRICE_STARTER_OVERAGE ?? "",
    features: ["1 widget", "500 conversations/mo", "Basic analytics", "Email support"],
  },
  GROWTH: {
    conversationLimit: 5000,
    widgetLimit: 5,
    monthlyPrice: 149,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? "",
    stripeMeteredPriceId: process.env.STRIPE_PRICE_GROWTH_OVERAGE ?? "",
    features: [
      "5 widgets",
      "5,000 conversations/mo",
      "Advanced analytics",
      "Calendar integration",
      "Priority support",
    ],
  },
  SCALE: {
    conversationLimit: 50000,
    widgetLimit: 999,
    monthlyPrice: 499,
    stripePriceId: process.env.STRIPE_PRICE_SCALE ?? "",
    stripeMeteredPriceId: process.env.STRIPE_PRICE_SCALE_OVERAGE ?? "",
    features: [
      "Unlimited widgets",
      "50,000 conversations/mo",
      "Custom integrations",
      "Dedicated CSM",
      "SLA guarantee",
    ],
  },
};

export const TRIAL_DAYS = 14;
