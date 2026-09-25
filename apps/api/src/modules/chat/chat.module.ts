import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { AiModule } from "../../ai/ai.module";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
