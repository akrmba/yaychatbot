import { Injectable, Logger } from "@nestjs/common";

export interface GuardrailResult {
  blocked: boolean;
  reason?: string;
}

// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /you\s+are\s+now\s+(a\s+)?(?!an?\s+assistant)/i,
  /act\s+as\s+(?!an?\s+assistant)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /system\s+prompt/i,
  /reveal\s+(your\s+)?(instructions|prompt|system)/i,
  /print\s+(your\s+)?(instructions|prompt|system)/i,
];

// PII patterns
const PII_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, label: "SSN" },
  { pattern: /\b\d{16}\b/, label: "credit card" },
  { pattern: /\b4[0-9]{12}(?:[0-9]{3})?\b/, label: "Visa card" },
  { pattern: /\b5[1-5][0-9]{14}\b/, label: "Mastercard" },
  { pattern: /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/i, label: "password" },
  { pattern: /\b[A-Z]{2}\d{6}[A-Z]?\b/, label: "passport number" },
];

@Injectable()
export class GuardrailsService {
  private readonly logger = new Logger(GuardrailsService.name);
  private competitors: string[] = [];

  setCompetitors(names: string[]) {
    this.competitors = names;
  }

  check(text: string): GuardrailResult {
    // 1. Prompt injection
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        this.logger.warn(`Prompt injection detected: "${text.slice(0, 80)}"`);
        return { blocked: true, reason: "prompt_injection" };
      }
    }

    // 2. PII
    for (const { pattern, label } of PII_PATTERNS) {
      if (pattern.test(text)) {
        this.logger.warn(`PII detected (${label})`);
        return { blocked: true, reason: `pii_${label.replace(/\s+/g, "_")}` };
      }
    }

    // 3. Competitor mentions
    for (const competitor of this.competitors) {
      const re = new RegExp(`\\b${competitor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(text)) {
        this.logger.warn(`Competitor mention blocked: ${competitor}`);
        return { blocked: true, reason: "competitor_mention" };
      }
    }

    return { blocked: false };
  }

  /** Sanitise assistant output — strip any accidental PII leakage */
  sanitiseOutput(text: string): string {
    let out = text;
    for (const { pattern } of PII_PATTERNS) {
      out = out.replace(pattern, "[REDACTED]");
    }
    return out;
  }
}
