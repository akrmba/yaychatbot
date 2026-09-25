/**
 * YayChatbot Widget — entry point / loader.
 *
 * Embedding: <script async src="https://cdn.yaychatbot.com/widget.js" data-key="WIDGET_SCRIPT_KEY"></script>
 *
 * 1. Reads data-key from its own <script> tag.
 * 2. Injects a shadow DOM container (CSS isolation).
 * 3. Fetches config from GET /api/v1/chat/config/:scriptKey.
 * 4. If config.requireConsent === true, shows a GDPR consent banner first.
 *    The widget only boots fully after the visitor accepts.
 * 5. Boots the widget UI inside the shadow root.
 */

import type { WidgetConfig } from "./types";
import { dispatch } from "./store";
import { fetchConfig, initApi } from "./api";
import { getStyles } from "./styles";
import { mountUI } from "./ui";
import { initLiveRegion } from "./a11y";

// ── Defaults ────────────────────────────────────────────────────────
const DEFAULTS: Omit<WidgetConfig, "chatbotId" | "apiUrl" | "name"> = {
  greeting: "Hi there! How can we help you today?",
  position: "bottom-right",
  primaryColor: "#6366f1",
  textColor: "#ffffff",
  fontFamily: "system-ui",
  offlineMessage: "We're currently offline.",
  qualificationEnabled: false,
  leadCaptureEnabled: false,
  requireConsent: false,
};

const CONSENT_STORAGE_KEY = "yaychatbot_consent";

// ── Boot ──────────────────────���──────────────────────────────────────
(function boot() {
  const scriptEl =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>("script[data-key]");

  const scriptKey = scriptEl?.getAttribute("data-key");
  if (!scriptKey) {
    console.warn("[YayChatbot] Missing data-key attribute on script tag.");
    return;
  }

  const apiBase = scriptEl?.src
    ? new URL(scriptEl.src).origin
    : window.location.origin;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(scriptKey, apiBase));
  } else {
    init(scriptKey, apiBase);
  }
})();

async function init(scriptKey: string, apiBase: string): Promise<void> {
  const host = document.createElement("div");
  host.id = "yaychatbot-widget";
  host.setAttribute("aria-label", "YayChatbot chat widget");
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  let config: WidgetConfig;
  try {
    const tempConfig = { apiUrl: apiBase } as WidgetConfig;
    initApi(tempConfig);

    const remote = await fetchConfig(scriptKey);
    config = { ...DEFAULTS, ...remote } as WidgetConfig;
  } catch (err) {
    console.warn("[YayChatbot] Could not load config, entering offline mode.", err);
    config = {
      ...DEFAULTS,
      chatbotId: "",
      apiUrl: apiBase,
      name: "Chat",
    } as WidgetConfig;
    initApi(config);
    injectStyles(shadow, config);
    mountUI(shadow);
    initLiveRegion(shadow);
    dispatch({ type: "CONFIG_ERROR", error: "Could not load configuration" });
    return;
  }

  initApi(config);
  injectStyles(shadow, config);
  mountUI(shadow);
  initLiveRegion(shadow);

  // ── Consent gate ────────────────────────────────────────────────
  if (config.requireConsent && !hasConsent()) {
    dispatch({ type: "CONFIG_LOADED", config });
    // Render consent banner; actual WELCOME transition happens on CONSENT_GIVEN
    renderConsentBanner(shadow, config);
    return;
  }

  dispatch({ type: "CONFIG_LOADED", config });
}

// ── Consent helpers ──────────────────────────────────────────────────

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function persistConsent(): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, "true");
  } catch {
    // localStorage unavailable (private browsing, etc.) — consent is session-only
  }
}

function renderConsentBanner(shadow: ShadowRoot, config: WidgetConfig): void {
  const banner = document.createElement("div");
  banner.id = "yay-consent-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-modal", "true");
  banner.setAttribute("aria-label", "Chat consent");
  banner.innerHTML = `
    <style>
      #yay-consent-banner {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 300px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.12);
        font-family: system-ui, sans-serif;
        font-size: 13px;
        color: #374151;
        z-index: 9999;
      }
      #yay-consent-banner p { margin: 0 0 12px; line-height: 1.5; }
      #yay-consent-banner .yay-consent-actions { display: flex; gap: 8px; }
      #yay-consent-banner button {
        flex: 1;
        padding: 8px 0;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      }
      #yay-consent-accept { background: ${config.primaryColor}; color: ${config.textColor}; }
      #yay-consent-decline { background: #f3f4f6; color: #374151; }
      #yay-consent-banner a { color: ${config.primaryColor}; }
    </style>
    <p>
      This chat uses cookies to improve your experience.
      ${config.privacyPolicyUrl ? `<a href="${config.privacyPolicyUrl}" target="_blank" rel="noopener noreferrer">Privacy Policy</a>` : ""}
    </p>
    <div class="yay-consent-actions">
      <button id="yay-consent-accept">Accept</button>
      <button id="yay-consent-decline">Decline</button>
    </div>
  `;

  shadow.appendChild(banner);

  shadow.getElementById("yay-consent-accept")?.addEventListener("click", () => {
    persistConsent();
    banner.remove();
    dispatch({ type: "CONSENT_GIVEN" });
  });

  shadow.getElementById("yay-consent-decline")?.addEventListener("click", () => {
    banner.remove();
    dispatch({ type: "CONSENT_DECLINED" });
  });
}

function injectStyles(shadow: ShadowRoot, config: WidgetConfig): void {
  const style = document.createElement("style");
  style.textContent = getStyles(
    config.primaryColor,
    config.textColor,
    config.fontFamily,
  );
  shadow.appendChild(style);
}

// ── Public API ──────────────────────────────────────────────────────
declare global {
  interface Window {
    YayChatbot?: {
      open(): void;
      close(): void;
      toggle(): void;
    };
  }
}

window.YayChatbot = {
  open: () => dispatch({ type: "OPEN" }),
  close: () => dispatch({ type: "CLOSE" }),
  toggle: () => dispatch({ type: "TOGGLE" }),
};
