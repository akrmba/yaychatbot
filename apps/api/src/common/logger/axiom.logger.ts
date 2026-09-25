import { Injectable, LoggerService, LogLevel } from "@nestjs/common";
import { Axiom } from "@axiomhq/js";

type LogMeta = Record<string, unknown>;

@Injectable()
export class AxiomLogger implements LoggerService {
  private readonly axiom: Axiom | null;
  private readonly dataset: string;
  private readonly env: string;

  constructor() {
    this.dataset = process.env.AXIOM_DATASET ?? "yaychatbot-api";
    this.env = process.env.NODE_ENV ?? "development";

    if (process.env.AXIOM_TOKEN) {
      this.axiom = new Axiom({ token: process.env.AXIOM_TOKEN });
    } else {
      this.axiom = null;
      if (this.env === "production") {
        console.warn("[AxiomLogger] AXIOM_TOKEN not set — logs will not be shipped");
      }
    }
  }

  private ingest(level: LogLevel, message: string, meta: LogMeta = {}) {
    const entry = {
      _time: new Date().toISOString(),
      level,
      message,
      env: this.env,
      ...meta,
    };

    // Always write to stdout so Railway captures it
    console[level === "error" || level === "fatal" ? "error" : "log"](
      JSON.stringify(entry)
    );

    if (this.axiom) {
      this.axiom.ingest(this.dataset, [entry]);
    }
  }

  log(message: string, context?: string, meta?: LogMeta) {
    this.ingest("log", message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: LogMeta) {
    this.ingest("error", message, { context, trace, ...meta });
  }

  warn(message: string, context?: string, meta?: LogMeta) {
    this.ingest("warn", message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: LogMeta) {
    if (this.env !== "production") {
      this.ingest("debug", message, { context, ...meta });
    }
  }

  verbose(message: string, context?: string, meta?: LogMeta) {
    this.ingest("verbose", message, { context, ...meta });
  }

  /** Flush buffered events before process exit */
  async flush() {
    if (this.axiom) {
      await this.axiom.flush();
    }
  }
}
