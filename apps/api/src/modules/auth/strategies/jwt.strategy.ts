import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../../prisma/prisma.service";

export interface SupabaseJwtPayload {
  sub: string; // Supabase user id
  email: string;
  aud: string;
  role: string; // Supabase role (e.g. "authenticated")
  app_metadata?: {
    organization_id?: string;
  };
  user_metadata?: {
    name?: string;
  };
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string; // UserRole from Prisma
  organizationId: string;
  supabaseId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.getOrThrow<string>("SUPABASE_JWT_SECRET");
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ["HS256"],
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException("Invalid token claims");
    }

    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user) {
      this.logger.warn(`JWT valid but no DB user for email=${payload.email}`);
      throw new UnauthorizedException("User not found");
    }

    // Update last login (fire-and-forget)
    this.prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => {});

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      supabaseId: payload.sub,
    };
  }
}
