import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto, CreateApiKeyDto } from "./dto/auth.dto";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "./strategies/jwt.strategy";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register a new user and organization" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @Throttle({ auth: { ttl: 900_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @Get("profile")
  @ApiOperation({ summary: "Get current user profile" })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user);
  }

  // ─── API Keys ──────────────────────────────────────────────

  @ApiBearerAuth()
  @Post("api-keys")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new API key" })
  async createApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.authService.createApiKey(user.organizationId, dto, user.id);
  }

  @ApiBearerAuth()
  @Get("api-keys")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "List all API keys for the organization" })
  async listApiKeys(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listApiKeys(user.organizationId);
  }

  @ApiBearerAuth()
  @Delete("api-keys/:id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke an API key" })
  async revokeApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") keyId: string,
  ) {
    return this.authService.revokeApiKey(user.organizationId, keyId, user.id);
  }
}
