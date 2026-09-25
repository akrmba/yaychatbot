import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { HealthService } from "./health.service";
import { Public } from "../../common/decorators/public.decorator";

@Public()
@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Health check" })
  check() {
    return this.healthService.check();
  }
}
