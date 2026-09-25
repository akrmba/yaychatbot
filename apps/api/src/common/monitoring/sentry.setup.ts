import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn("[Sentry] SENTRY_DSN not set — error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.RAILWAY_GIT_COMMIT_SHA ?? "local",
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    beforeSend(event) {
      // Strip PII from request bodies
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        for (const key of ["password", "token", "secret", "apiKey"]) {
          if (key in data) data[key] = "[Filtered]";
        }
      }
      return event;
    },
  });
}

/** Call in NestJS exception filters to capture handled errors */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}
