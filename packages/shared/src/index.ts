import { z } from "zod";

// ─── User ───────────────────────────────────────────────────────────
export const UserRoleSchema = z.enum(["owner", "admin", "member"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: UserRoleSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

// ─── Chatbot ────────────────────────────────────────────────────────
export const ChatbotStatusSchema = z.enum(["active", "paused", "draft"]);
export type ChatbotStatus = z.infer<typeof ChatbotStatusSchema>;

export const ChatbotSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: ChatbotStatusSchema,
  ownerId: z.string().uuid(),
  widgetConfig: z.record(z.unknown()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Chatbot = z.infer<typeof ChatbotSchema>;

// ─── Conversation / Message ─────────────────────────────────────────
export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  createdAt: z.coerce.date(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  chatbotId: z.string().uuid(),
  visitorId: z.string(),
  messages: z.array(MessageSchema).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

// ─── API Response ───────────────────────────────────────────────────
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
