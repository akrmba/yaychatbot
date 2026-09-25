import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { ApiKeyGuard } from "./guards/api-key.guard";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    ApiKeyGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, ApiKeyGuard],
})
export class AuthModule {}
