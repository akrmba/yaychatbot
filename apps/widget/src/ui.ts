import type { WidgetStore } from "./types";
import { dispatch, getStore, subscribe } from "./store";
import { sendMessage, submitLead, submitOffline } from "./api";
import { trapFocus, releaseFocus, announce } from "./a11y";
import { ICONS } from "./icons";

let shadowRoot: ShadowRoot;
let root: HTMLElement;
let prevOpen = false;
let prevState = "";

export function mountUI(sr: ShadowRoot): void {
  shadowRoot = sr;
  root = document.createElement("div");
  root.setAttribute("id", "yay-root");
  shadowRoot.appendChild(root);
  subscribe(render);
  render(getStore());
}

// ── Render orchestrator ─────────────────────────────────────────────
function render(store: WidgetStore): void {
  const html: string[] = [];

  if (store.isOpen && store.config) {
    html.push(renderPanel(store));
  }

  html.push(renderLauncher(store));
  root.innerHTML = html.join("");
  bindEvents(store);

  // Focus management
  if (store.isOpen && !prevOpen) {
    const panel = root.querySelector<HTMLElement>(".yay-panel");
    if (panel) trapFocus(panel);
  } else if (!store.isOpen && prevOpen) {
    releaseFocus();
    const launcher = root.querySelector<HTMLElement>(".yay-launcher");
    if (launcher) launcher.focus();
  }

  // Announce new messages to screen readers
  if (store.messages.length > 0) {
    const last = store.messages[store.messages.length - 1];
    if (last.role === "assistant") {
      announce(`New message: ${last.content}`);
    }
  }

  if (store.isTyping) announce("Assistant is typing");

  prevOpen = store.isOpen;
  prevState = store.state;

  // Auto-scroll messages
  if (store.isOpen) {
    const body = root.querySelector(".yay-body");
    if (body) body.scrollTop = body.scrollHeight;
  }
}

// ── Launcher ────────────────────────────────────────────────────────
function renderLauncher(s: WidgetStore): string {
  const pos = s.config?.position === "bottom-left" ? " yay-launcher--left" : "";
  const badge = s.unreadCount > 0
    ? `<span class="yay-badge" aria-label="${s.unreadCount} unread messages">${s.unreadCount}</span>`
    : "";
  const icon = s.isOpen ? ICONS.close : ICONS.chat;
  const label = s.isOpen ? "Close chat" : "Open chat";

  return `<button class="yay-launcher${pos}" data-action="toggle" aria-label="${label}" type="button">
    ${icon}${badge}
  </button>`;
}

// ── Panel ───────────────────────────────────────────────────────────
function renderPanel(s: WidgetStore): string {
  const pos = s.config?.position === "bottom-left" ? " yay-panel--left" : "";
  let body = "";

  switch (s.state) {
    case "WELCOME":
    case "IDLE":
    case "LOADING":
      body = renderWelcome(s);
      break;
    case "CHATTING":
      body = renderChat(s);
      break;
    case "QUALIFYING":
      body = renderQualification(s);
      break;
    case "LEAD_CAPTURE":
      body = renderLeadCapture(s);
      break;
    case "HANDOFF":
      body = renderHandoff();
      break;
    case "OFFLINE":
    case "ERROR":
      body = renderOffline(s);
      break;
  }

  return `<div class="yay-panel${pos}" role="dialog" aria-label="Chat with ${esc(s.config?.name ?? "us")}" aria-modal="true">
    ${renderHeader(s)}
    <div class="yay-body" role="log" aria-live="polite">${body}</div>
    ${s.state === "CHATTING" ? renderComposer() : ""}
    <div class="yay-powered">Powered by <a href="https://yaychatbot.com" target="_blank" rel="noopener">YayChatbot</a></div>
  </div>`;
}

// ── Header ──────────────────────────────────────────────────────────
function renderHeader(s: WidgetStore): string {
  return `<div class="yay-header">
    <span class="yay-header__title">${esc(s.config?.name ?? "Chat")}</span>
    <button class="yay-header__close" data-action="close" aria-label="Close chat" type="button">${ICONS.close}</button>
  </div>`;
}

// ── Welcome ─────────────────────────────────────────────────────────
function renderWelcome(s: WidgetStore): string {
  const greeting = s.config?.greeting ?? "Hi there! How can we help?";
  const hasQual = s.config?.qualificationEnabled && s.config.qualificationSteps?.length;
  const btnLabel = hasQual ? "Get started" : "Start chatting";
  const action = hasQual ? "start-qualify" : "start-chat";

  return `<div class="yay-welcome">
    <div class="yay-welcome__greeting">${esc(greeting)}</div>
    <div class="yay-welcome__sub">We typically reply within a few minutes.</div>
    <button class="yay-welcome__start" data-action="${action}" type="button">${btnLabel}</button>
  </div>`;
}

// ── Chat ────────────────────────────────────────────────────────────
function renderChat(s: WidgetStore): string {
  let html = s.messages
    .map(
      (m) =>
        `<div class="yay-msg yay-msg--${m.role}" role="${m.role === "user" ? "none" : "status"}">${esc(m.content)}</div>`,
    )
    .join("");

  if (s.isTyping) {
    html += `<div class="yay-typing" aria-label="Assistant is typing">
      <span class="yay-typing__dot"></span>
      <span class="yay-typing__dot"></span>
      <span class="yay-typing__dot"></span>
    </div>`;
  }

  return html;
}

// ── Composer ────────────────────────────────────────────────────────
function renderComposer(): string {
  return `<div class="yay-composer">
    <input class="yay-composer__input" data-input="message" type="text"
      placeholder="Type a message…" aria-label="Type a message"
      autocomplete="off" />
    <button class="yay-composer__send" data-action="send" type="button" aria-label="Send message">Send</button>
  </div>`;
}

// ── Qualification ───────────────────────────────────────────────────
function renderQualification(s: WidgetStore): string {
  const steps = s.config?.qualificationSteps ?? [];
  const step = steps[s.qualificationStep];
  if (!step) return renderChat(s);

  const options = step.options
    .map(
      (o) =>
        `<button class="yay-qual__btn" data-action="qualify" data-step="${esc(step.id)}" data-value="${esc(o.value)}" type="button">
          ${o.icon ? `<span aria-hidden="true">${esc(o.icon)}</span> ` : ""}${esc(o.label)}
        </button>`,
    )
    .join("");

  return `<div class="yay-qual" role="group" aria-label="Qualification question">
    <div class="yay-qual__question">${esc(step.question)}</div>
    <div class="yay-qual__options" role="list">${options}</div>
  </div>`;
}

// ── Lead Capture ────────────────────────────────────────────────────
function renderLeadCapture(s: WidgetStore): string {
  const fields = s.config?.leadCaptureFields ?? [
    { name: "name", label: "Name", type: "text" as const, required: true, placeholder: "Your name" },
    { name: "email", label: "Email", type: "email" as const, required: true, placeholder: "you@example.com" },
  ];

  const inputs = fields
    .map(
      (f) =>
        `<div class="yay-lead__field">
          <label class="yay-lead__label" for="yay-lead-${f.name}">${esc(f.label)}${f.required ? " *" : ""}</label>
          <input class="yay-lead__input" id="yay-lead-${f.name}" data-lead="${f.name}"
            type="${f.type}" ${f.required ? "required" : ""} placeholder="${esc(f.placeholder ?? "")}"
            aria-required="${f.required}" />
        </div>`,
    )
    .join("");

  return `<div class="yay-lead">
    <div class="yay-lead__title">Before we continue, tell us a bit about yourself</div>
    <form data-action="lead-form" novalidate>${inputs}
      <button class="yay-lead__submit" type="submit">Continue</button>
    </form>
  </div>`;
}

// ── Handoff ─────────────────────────────────────────────────────────
function renderHandoff(): string {
  return `<div class="yay-handoff">
    <div class="yay-handoff__icon" aria-hidden="true">${ICONS.headset}</div>
    <div class="yay-handoff__title">Connecting you to a human</div>
    <div class="yay-handoff__sub">A team member will be with you shortly. Hang tight!</div>
  </div>`;
}

// ── Offline ─────────────────────────────────────────────────────────
function renderOffline(s: WidgetStore): string {
  const msg = s.config?.offlineMessage ?? "We're currently offline.";
  return `<div class="yay-offline">
    <div class="yay-offline__title">${esc(msg)}</div>
    <div class="yay-offline__sub">Leave us a message and we'll get back to you.</div>
    <form data-action="offline-form" novalidate>
      <input class="yay-offline__input" data-input="offline-email" type="email"
        placeholder="Your email" aria-label="Your email" required aria-required="true" />
      <textarea class="yay-offline__textarea" data-input="offline-msg"
        placeholder="Your message…" aria-label="Your message" required aria-required="true"></textarea>
      <button class="yay-offline__submit" type="submit">Send message</button>
    </form>
  </div>`;
}

// ── Event binding ───────────────────────────────────────────────────
function bindEvents(s: WidgetStore): void {
  // Delegate clicks
  root.onclick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case "toggle":
        dispatch({ type: "TOGGLE" });
        break;
      case "close":
        dispatch({ type: "CLOSE" });
        break;
      case "start-chat":
        dispatch({ type: "QUALIFY_DONE" });
        break;
      case "start-qualify":
        dispatch({ type: "START_QUALIFYING" });
        break;
      case "send":
        handleSend();
        break;
      case "qualify": {
        const stepId = target.dataset.step ?? "";
        const value = target.dataset.value ?? "";
        dispatch({ type: "QUALIFY_ANSWER", stepId, value });
        break;
      }
    }
  };

  // Enter key to send
  const input = root.querySelector<HTMLInputElement>('[data-input="message"]');
  if (input) {
    input.onkeydown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };
    // Auto-focus input when chat opens
    if (s.state === "CHATTING" && s.isOpen) {
      requestAnimationFrame(() => input.focus());
    }
  }

  // Lead form
  const leadForm = root.querySelector<HTMLFormElement>('[data-action="lead-form"]');
  if (leadForm) {
    leadForm.onsubmit = (e: Event) => {
      e.preventDefault();
      const data: Record<string, string> = {};
      leadForm.querySelectorAll<HTMLInputElement>("[data-lead]").forEach((el) => {
        data[el.dataset.lead!] = el.value.trim();
      });
      // Basic validation
      const invalid = leadForm.querySelector<HTMLInputElement>(":invalid");
      if (invalid) {
        invalid.focus();
        return;
      }
      submitLead(data);
    };
  }

  // Offline form
  const offlineForm = root.querySelector<HTMLFormElement>('[data-action="offline-form"]');
  if (offlineForm) {
    offlineForm.onsubmit = async (e: Event) => {
      e.preventDefault();
      const email = root.querySelector<HTMLInputElement>('[data-input="offline-email"]')?.value.trim() ?? "";
      const msg = root.querySelector<HTMLTextAreaElement>('[data-input="offline-msg"]')?.value.trim() ?? "";
      if (!email || !msg) return;
      const btn = offlineForm.querySelector<HTMLButtonElement>("button");
      if (btn) btn.disabled = true;
      const ok = await submitOffline(email, msg);
      if (ok) {
        offlineForm.innerHTML = '<div class="yay-offline__success">Thanks! We\'ll be in touch.</div>';
      } else if (btn) {
        btn.disabled = false;
      }
    };
  }

  // Escape key to close
  root.onkeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && s.isOpen) {
      dispatch({ type: "CLOSE" });
    }
  };
}

function handleSend(): void {
  const input = root.querySelector<HTMLInputElement>('[data-input="message"]');
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;
  input.value = "";
  sendMessage(content);
}

function esc(str: string): string {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}
