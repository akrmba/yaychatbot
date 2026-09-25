import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { PrismaService } from "../prisma/prisma.service";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LlmStreamResult {
  stream: AsyncIterable<string>;
  usage: Promise<{ inputTokens: number; outputTokens: number; costUsd: number; model: string }>;
}

// Cost per 1M tokens in USD
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "claude-haiku-4-5-20251001": { input: 0.25, output: 1.25 },
};

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly primary: ChatOpenAI;
  private readonly fallback: ChatAnthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.primary = new ChatOpenAI({
      model: "gpt-4o-mini",
      apiKey: this.config.get<string>("OPENAI_API_KEY"),
      streaming: true,
      temperature: 0.4,
      maxTokens: 1024,
    });

    this.fallback = new ChatAnthropic({
      model: "claude-haiku-4-5-20251001",
      apiKey: this.config.get<string>("ANTHROPIC_API_KEY"),
      streaming: true,
      temperature: 0.4,
      maxTokens: 1024,
    });
  }

  async streamChat(
    messages: ChatMessage[],
    organizationId: string,
    conversationId?: string,
  ): Promise<LlmStreamResult> {
    const langchainMessages = messages.map((m) => ({ role: m.role, content: m.content }));

    let usedModel = "gpt-4o-mini";
    let streamSource: AsyncIterable<any>;

    try {
      streamSource = await this.primary.stream(langchainMessages as any);
    } catch (err) {
      this.logger.warn(`Primary LLM failed, falling back to Claude Haiku: ${err}`);
      usedModel = "claude-haiku-4-5-20251001";
      streamSource = await this.fallback.stream(langchainMessages as any);
    }

    // Estimate input tokens (4 chars ≈ 1 token)
    let inputTokens = 0;
    for (const m of messages) inputTokens += Math.ceil(m.content.length / 4);
    let outputTokens = 0;

    const self = this;

    async function* tokenStream(): AsyncIterable<string> {
      for await (const chunk of streamSource) {
        const text = typeof chunk.content === "string" ? chunk.content : "";
        if (text) {
          outputTokens += Math.ceil(text.length / 4);
          yield text;
        }
      }
    }

    const capturedStream = tokenStream();

    const usagePromise = (async () => {
      // Drain happens in caller; we resolve after a tick so outputTokens is populated
      await new Promise<void>((r) => setTimeout(r, 50));
      const costs = MODEL_COSTS[usedModel] ?? { input: 0.15, output: 0.6 };
      const costUsd = (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
      await self.recordCost(organizationId, usedModel, inputTokens, outputTokens, costUsd, conversationId);
      return { inputTokens, outputTokens, costUsd, model: usedModel };
    })();

    return { stream: capturedStream, usage: usagePromise };
  }

  private async recordCost(
    organizationId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    costUsd: number,
    conversationId?: string,
  ) {
    try {
      await (this.prisma as any).costRecord.create({
        data: { organizationId, model, inputTokens, outputTokens, costUsd, conversationId },
      });
      const month = new Date().toISOString().slice(0, 7);
      await this.prisma.usageRecord.upsert({
        where: { organizationId_month: { organizationId, month } },
        create: { organizationId, month, tokenCount: inputTokens + outputTokens, cost: costUsd },
        update: {
          tokenCount: { increment: inputTokens + outputTokens },
          cost: { increment: costUsd },
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record cost: ${err}`);
    }
  }
}
