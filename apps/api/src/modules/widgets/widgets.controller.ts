import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { WidgetsService } from "./widgets.service";

@ApiTags("Widgets")
@Controller("widgets")
export class WidgetsController {
  constructor(private readonly widgetsService: WidgetsService) {}
}
