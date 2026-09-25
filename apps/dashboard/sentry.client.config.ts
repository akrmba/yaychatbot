import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event) {
    // Drop noisy browser extension errors
    const msg = event.exception?.values?.[0]?.value ?? "";
    if (msg.includes("ResizeObserver loop") || msg.includes("Non-Error promise rejection")) {
      return null;
    }
    return event;
  },
});
