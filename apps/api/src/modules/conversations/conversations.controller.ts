import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConversationsService } from "./conversations.service";

@ApiTags("Conversations")
@Controller("conversations")
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
  ) {}
}
