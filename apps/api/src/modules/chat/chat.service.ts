import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LlmService, ChatMessage } from "../../ai/llm.service";
import { GuardrailsService } from "../../ai/guardrails.service";
import { KnowledgeBaseService } from "../../ai/knowledge-base.service";
import { ConversationOrchestratorService } from "../../ai/conversation-orchestrator.service";
import { MessageRole } from "@prisma/client";
import type { QualificationQuestion } from "../../ai/conversation-orchestrator.service";

export interface SendMessageDto {
  content: string;
  visitorId?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly guardrails: GuardrailsService,
    private readonly kb: KnowledgeBaseService,
    private readonly orchestrator: ConversationOrchestratorService,
  ) {}

  async *streamMessage(
    conversationId: string,
    dto: SendMessageDto,
  ): AsyncIterable<string> {
    // 1. Load conversation + widget + playbook
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId },
      include: {
        widget: { include: { playbook: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 40 },
      },
    });

    if (!conversation) throw new NotFoundException("Conversation not found");

    const playbook = conversation.widget.playbook;
    const organizationId = conversation.organizationId;

    // 2. Guardrails on user input
    const guard = this.guardrails.check(dto.content);
    if (guard.blocked) {
      const refusal = this.refusalMessage(guard.reason!);
      yield `data: ${JSON.stringify({ type: "token", token: refusal })}\n\n`;
      yield `data: ${JSON.stringify({ type: "done" })}\n\n`;
      await this.saveMessage(conversationId, MessageRole.USER, dto.content);
      await this.saveMessage(conversationId, MessageRole.ASSISTANT, refusal);
      return;
    }

    // 3. Persist user message
    await this.saveMessage(conversationId, MessageRole.USER, dto.content);

    // 4. Build chat history
    const history: ChatMessage[] = conversation.messages.map((m) => ({
      role: m.role === MessageRole.USER ? "user" : m.role === MessageRole.ASSISTANT ? "assistant" : "system",
      content: m.content,
    }));

    // 5. RAG — inject top-3 knowledge chunks
    const ragChunks = await this.kb.search(dto.content, organizationId, conversation.widgetId).catch(() => []);
    const ragContext = ragChunks.length
      ? `\n\nRelevant knowledge:\n${ragChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}`
      : "";

    // 6. Orchestrator — intent + system prompt
    const questions: QualificationQuestion[] = Array.isArray(playbook?.qualificationQuestions)
      ? (playbook!.qualificationQuestions as unknown as QualificationQuestion[])
      : [];

    const orchResult = await this.orchestrator.buildContext({
      conversationId,
      organizationId,
      widgetId: conversation.widgetId,
      playbook: {
        qualificationQuestions: questions,
        welcomeMessage: playbook?.welcomeMessage ?? undefined,
        handoffMessage: playbook?.handoffMessage ?? undefined,
        calendarUrl: playbook?.calendarUrl ?? undefined,
      },
      history,
      userMessage: dto.content,
    });

    // 7. Assemble messages for LLM
    const systemMsg: ChatMessage = {
      role: "system",
      content: orchResult.systemPrompt + ragContext,
    };
    const llmMessages: ChatMessage[] = [systemMsg, ...orchResult.messages];

    // 8. Stream from LLM
    const { stream, usage } = await this.llm.streamChat(llmMessages, organizationId, conversationId);

    let fullReply = "";
    const startMs = Date.now();

    for await (const token of stream) {
      const clean = this.guardrails.sanitiseOutput(token);
      fullReply += clean;
      yield `data: ${JSON.stringify({ type: "token", token: clean })}\n\n`;
    }

    const latencyMs = Date.now() - startMs;
    const { inputTokens, outputTokens, model } = await usage;

    // 9. Persist assistant message
    await this.saveMessage(conversationId, MessageRole.ASSISTANT, fullReply, {
      tokens: inputTokens + outputTokens,
      latencyMs,
      modelUsed: model,
    });

    // 10. Lead capture from reply
    if (orchResult.shouldCaptureLead) {
      await this.orchestrator.captureLeadData(conversationId, organizationId, fullReply, dto.content);
    }

    // 11. Emit metadata event
    yield `data: ${JSON.stringify({
      type: "done",
      intent: orchResult.intent,
      status: orchResult.updatedStatus,
      shouldOfferBooking: orchResult.shouldOfferBooking,
    })}\n\n`;
  }

  async createConversation(widgetId: string, visitorId?: string) {
    const widget = await this.prisma.widget.findFirst({ where: { id: widgetId } });
    if (!widget) throw new NotFoundException("Widget not found");

    return this.prisma.conversation.create({
      data: {
        widgetId,
        organizationId: widget.organizationId,
        visitorId: visitorId ?? undefined,
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async saveMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    meta?: { tokens?: number; latencyMs?: number; modelUsed?: string },
  ) {
    await this.prisma.message.create({
      data: { conversationId, role, content, ...meta },
    });
  }

  private refusalMessage(reason: string): string {
    const map: Record<string, string> = {
      prompt_injection: "I'm not able to follow those instructions. How can I help you today?",
      competitor_mention: "I can only discuss our own products and services. What can I help you with?",
    };
    if (reason.startsWith("pii_")) {
      return "Please avoid sharing sensitive personal information in this chat. How can I assist you?";
    }
    return map[reason] ?? "I'm unable to process that request. How can I help you?";
  }
}
