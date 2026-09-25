import { Module } from "@nestjs/common";
import { LlmService } from "./llm.service";
import { GuardrailsService } from "./guardrails.service";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { ConversationOrchestratorService } from "./conversation-orchestrator.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [LlmService, GuardrailsService, KnowledgeBaseService, ConversationOrchestratorService],
  exports: [LlmService, GuardrailsService, KnowledgeBaseService, ConversationOrchestratorService],
})
export class AiModule {}
