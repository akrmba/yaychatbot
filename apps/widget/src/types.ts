// ── Widget Config (returned by /api/v1/chat/config/:scriptKey) ──────
export interface WidgetConfig {
  chatbotId: string;
  apiUrl: string;
  name: string;
  greeting: string;
  position: "bottom-right" | "bottom-left";
  primaryColor: string;
  textColor: string;
  fontFamily: string;
  offlineMessage: string;
  qualificationEnabled: boolean;
  qualificationSteps?: QualificationStep[];
  leadCaptureEnabled: boolean;
  leadCaptureFields?: LeadField[];
  /** GDPR: when true the widget must obtain visitor consent before chatting */
  requireConsent?: boolean;
  /** Optional URL to the host's Privacy Policy shown in the consent banner */
  privacyPolicyUrl?: string;
}

export interface QualificationStep {
  id: string;
  question: string;
  type: "buttons" | "cards";
  options: { label: string; value: string; icon?: string }[];
}

export interface LeadField {
  name: string;
  label: string;
  type: "text" | "email" | "tel";
  required: boolean;
  placeholder?: string;
}

// ── Messages ─────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

// ── State Machine ─────────────────────────────────────────────────────
export type WidgetState =
  | "IDLE"
  | "LOADING"
  | "CONSENT_PENDING"
  | "WELCOME"
  | "CHATTING"
  | "QUALIFYING"
  | "LEAD_CAPTURE"
  | "BOOKING"
  | "HANDOFF"
  | "OFFLINE"
  | "ERROR";

export interface WidgetStore {
  state: WidgetState;
  isOpen: boolean;
  config: WidgetConfig | null;
  messages: ChatMessage[];
  conversationId: string | null;
  unreadCount: number;
  isTyping: boolean;
  qualificationStep: number;
  leadData: Record<string, string>;
  error: string | null;
}

// ── Events ────────────────────────────────────────────────────────────
export type WidgetEvent =
  | { type: "CONFIG_LOADED"; config: WidgetConfig }
  | { type: "CONFIG_ERROR"; error: string }
  | { type: "CONSENT_GIVEN" }
  | { type: "CONSENT_DECLINED" }
  | { type: "TOGGLE" }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SEND_MESSAGE"; content: string }
  | { type: "MESSAGE_RECEIVED"; message: ChatMessage }
  | { type: "TYPING_START" }
  | { type: "TYPING_STOP" }
  | { type: "QUALIFY_ANSWER"; stepId: string; value: string }
  | { type: "QUALIFY_DONE" }
  | { type: "START_QUALIFYING" }
  | { type: "LEAD_SUBMIT"; data: Record<string, string> }
  | { type: "LEAD_SUBMITTED" }
  | { type: "HANDOFF_START" }
  | { type: "SET_CONVERSATION_ID"; id: string }
  | { type: "OFFLINE_SUBMIT"; email: string; message: string }
  | { type: "GO_BACK" }
  | { type: "RESET" };
