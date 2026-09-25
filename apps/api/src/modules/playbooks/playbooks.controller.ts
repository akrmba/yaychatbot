import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PlaybooksService } from "./playbooks.service";

@ApiTags("Playbooks")
@Controller("playbooks")
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}
}
