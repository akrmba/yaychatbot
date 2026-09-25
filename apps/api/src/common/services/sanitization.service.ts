/**
 * SanitizationService — strips HTML/script injection from user-supplied strings.
 *
 * Uses the `sanitize-html` package (server-safe, no DOM required) instead of
 * DOMPurify which requires a browser DOM.  The service is registered globally
 * so any module can inject it.
 */
import { Injectable } from "@nestjs/common";
import sanitizeHtml from "sanitize-html";

@Injectable()
export class SanitizationService {
  /** Strip ALL HTML tags and attributes — safe plain text only. */
  sanitize(input: string): string {
    return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
  }

  /** Sanitize every string value in a plain object (shallow). */
  sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const result = { ...obj } as Record<string, unknown>;
    for (const key of Object.keys(result)) {
      if (typeof result[key] === "string") {
        result[key] = this.sanitize(result[key] as string);
      }
    }
    return result as T;
  }
}
