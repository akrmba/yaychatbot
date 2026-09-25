import type { WidgetConfig, ChatMessage } from "./types";
import { dispatch, getStore } from "./store";

let apiBase = "";

export function initApi(config: WidgetConfig): void {
  apiBase = config.apiUrl.replace(/\/+$/, "");
}

export async function fetchConfig(scriptKey: string): Promise<WidgetConfig> {
  const res = await fetch(
    `${apiBase || ""}/api/v1/chat/config/${encodeURIComponent(scriptKey)}`,
  );
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function sendMessage(content: string): Promise<void> {
  const { config, conversationId } = getStore();
  if (!config) return;

  dispatch({ type: "SEND_MESSAGE", content });
  dispatch({ type: "TYPING_START" });

  try {
    const res = await fetch(`${apiBase}/api/v1/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatbotId: config.chatbotId,
        conversationId,
        content,
      }),
    });

    if (!res.ok) throw new Error(`Message send failed: ${res.status}`);
    const json = await res.json();
    const data = json.data ?? json;

    // Persist new conversationId if the server assigned one
    if (data.conversationId && data.conversationId !== conversationId) {
      dispatch({ type: "SET_CONVERSATION_ID", id: data.conversationId });
    }

    dispatch({
      type: "MESSAGE_RECEIVED",
      message: {
        id: data.id ?? uid(),
        role: "assistant",
        content: data.content ?? data.message ?? "",
        timestamp: Date.now(),
      },
    });
  } catch {
    dispatch({ type: "TYPING_STOP" });
    dispatch({
      type: "MESSAGE_RECEIVED",
      message: {
        id: uid(),
        role: "system",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: Date.now(),
      },
    });
  }
}

export async function submitLead(
  data: Record<string, string>,
): Promise<boolean> {
  const { config, conversationId } = getStore();
  if (!config) return false;

  dispatch({ type: "LEAD_SUBMIT", data });

  try {
    const res = await fetch(`${apiBase}/api/v1/chat/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatbotId: config.chatbotId,
        conversationId,
        ...data,
      }),
    });
    if (!res.ok) throw new Error(`Lead submit failed: ${res.status}`);
    dispatch({ type: "LEAD_SUBMITTED" });
    return true;
  } catch {
    return false;
  }
}

export async function submitOffline(
  email: string,
  message: string,
): Promise<boolean> {
  const { config } = getStore();
  if (!config) return false;

  try {
    const res = await fetch(`${apiBase}/api/v1/chat/offline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatbotId: config.chatbotId, email, message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
