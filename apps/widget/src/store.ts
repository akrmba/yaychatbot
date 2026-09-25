import type { WidgetStore, WidgetEvent, WidgetState } from "./types";

type Listener = (store: WidgetStore) => void;

const SESSION_KEY = "yaychatbot_cid";

function createInitialStore(): WidgetStore {
  return {
    state: "IDLE",
    isOpen: false,
    config: null,
    messages: [],
    conversationId: sessionStorage.getItem(SESSION_KEY),
    unreadCount: 0,
    isTyping: false,
    qualificationStep: 0,
    leadData: {},
    error: null,
  };
}

let store: WidgetStore = createInitialStore();
const listeners: Set<Listener> = new Set();

export function getStore(): Readonly<WidgetStore> {
  return store;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn(store);
}

function patch(partial: Partial<WidgetStore>): void {
  store = { ...store, ...partial };
  if (partial.conversationId !== undefined) {
    if (partial.conversationId) {
      sessionStorage.setItem(SESSION_KEY, partial.conversationId);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
  notify();
}

// ── State transition table ──────────────────────────────────────────
function nextState(current: WidgetState, event: WidgetEvent): WidgetState {
  switch (event.type) {
    case "CONFIG_LOADED":
      return "WELCOME";
    case "CONFIG_ERROR":
      return "OFFLINE";
    case "SEND_MESSAGE":
      return "CHATTING";
    case "QUALIFY_ANSWER":
      return "QUALIFYING";
    case "START_QUALIFYING":
      return "QUALIFYING";
    case "QUALIFY_DONE":
      return store.config?.leadCaptureEnabled ? "LEAD_CAPTURE" : "CHATTING";
    case "LEAD_SUBMIT":
      return "LEAD_CAPTURE";
    case "LEAD_SUBMITTED":
      return "CHATTING";
    case "HANDOFF_START":
      return "HANDOFF";
    case "GO_BACK":
      return "WELCOME";
    case "RESET":
      return "IDLE";
    default:
      return current;
  }
}

// ── Dispatch ─────────────────────────────────────────────────���──────
export function dispatch(event: WidgetEvent): void {
  const next = nextState(store.state, event);

  switch (event.type) {
    case "CONFIG_LOADED":
      patch({ state: next, config: event.config });
      break;

    case "CONFIG_ERROR":
      patch({ state: next, error: event.error });
      break;

    case "TOGGLE":
      patch({
        isOpen: !store.isOpen,
        unreadCount: !store.isOpen ? store.unreadCount : 0,
      });
      break;

    case "OPEN":
      patch({ isOpen: true, unreadCount: 0 });
      break;

    case "CLOSE":
      patch({ isOpen: false });
      break;

    case "SEND_MESSAGE": {
      const msg = {
        id: uid(),
        role: "user" as const,
        content: event.content,
        timestamp: Date.now(),
      };
      patch({
        state: next,
        messages: [...store.messages, msg],
      });
      break;
    }

    case "MESSAGE_RECEIVED":
      patch({
        messages: [...store.messages, event.message],
        isTyping: false,
        unreadCount: store.isOpen ? store.unreadCount : store.unreadCount + 1,
      });
      break;

    case "TYPING_START":
      patch({ isTyping: true });
      break;

    case "TYPING_STOP":
      patch({ isTyping: false });
      break;

    case "START_QUALIFYING":
      patch({ state: next, qualificationStep: 0 });
      break;

    case "QUALIFY_ANSWER": {
      const step = store.qualificationStep + 1;
      const total = store.config?.qualificationSteps?.length ?? 0;
      if (step >= total) {
        dispatch({ type: "QUALIFY_DONE" });
        return;
      }
      patch({ state: next, qualificationStep: step });
      break;
    }

    case "QUALIFY_DONE":
      patch({ state: next });
      break;

    case "LEAD_SUBMIT":
      patch({ state: next, leadData: event.data });
      break;

    case "LEAD_SUBMITTED":
      patch({ state: next });
      break;

    case "SET_CONVERSATION_ID":
      patch({ conversationId: event.id });
      break;

    case "HANDOFF_START":
      patch({ state: next });
      break;

    case "GO_BACK":
      patch({ state: next });
      break;

    case "RESET":
      store = createInitialStore();
      notify();
      break;

    default:
      patch({ state: next });
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
