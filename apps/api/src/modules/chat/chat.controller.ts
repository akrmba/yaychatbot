import {
  Controller,
  Post,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";
import { ChatService } from "./chat.service";
import { Public } from "../../common/decorators/public.decorator";

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsString()
  visitorId?: string;
}

export class CreateConversationDto {
  @IsString()
  widgetId!: string;

  @IsOptional()
  @IsString()
  visitorId?: string;
}

@Public()
@ApiTags("Chat")
@Throttle({ conversation: { ttl: 3_600_000, limit: 20 } })
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("conversations")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Start a new conversation" })
  @ApiBody({ type: CreateConversationDto })
  async createConversation(@Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(dto.widgetId, dto.visitorId);
  }

  @Post("conversations/:id/messages")
  @ApiOperation({ summary: "Send a message and stream the AI response via SSE" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 200, description: "SSE stream of tokens" })
  async sendMessage(
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of this.chatService.streamMessage(id, dto)) {
        res.write(chunk);
      }
    } catch (err: any) {
      const msg = err?.message ?? "Internal error";
      res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
    } finally {
      res.end();
    }
  }
}
