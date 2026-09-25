import { Injectable } from "@nestjs/common";
import { AxiomLogger } from "./axiom.logger";

/**
 * Structured log helpers for domain-specific events.
 * Inject this service instead of using raw console.log.
 *
 * Usage:
 *   constructor(private readonly log: AppLoggerService) {}
 *   this.log.llmCall({ model, tokens, durationMs });
 */
@Injectable()
export class AppLoggerService {
  constructor(private readonly logger: AxiomLogger) {}

  llmCall(meta: {
    model: string;
    tokens: number;
    durationMs: number;
    orgId?: string;
    error?: string;
  }) {
    if (meta.error) {
      this.logger.error("LLM call failed", meta.error, "LlmService", meta);
    } else {
      this.logger.log("LLM call completed", "LlmService", meta);
    }
  }

  webhookDelivery(meta: {
    webhookId: string;
    orgId: string;
    status: number;
    durationMs: number;
    attempt: number;
    error?: string;
  }) {
    if (meta.error || meta.status >= 400) {
      this.logger.error(
        "Webhook delivery failed",
        meta.error,
        "WebhookService",
        meta
      );
    } else {
      this.logger.log("Webhook delivered", "WebhookService", meta);
    }
  }

  httpRequest(meta: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    orgId?: string;
  }) {
    this.logger.log("HTTP request", "HttpInterceptor", meta);
  }
}
