import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type TransactionClient = Prisma.TransactionClient;
import { RegisterDto, LoginDto, CreateApiKeyDto } from "./dto/auth.dto";
import { AuthenticatedUser } from "./strategies/jwt.strategy";

@Injectable()
export class AuthService {
  private readonly supabase: SupabaseClient;
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const url = this.config.getOrThrow<string>("SUPABASE_URL");
    const anonKey = this.config.getOrThrow<string>("SUPABASE_ANON_KEY");
    const serviceKey = this.config.getOrThrow<string>(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    this.supabase = createClient(url, anonKey);
    this.supabaseAdmin = createClient(url, serviceKey);
  }

  async register(dto: RegisterDto) {
    // 1. Check if user already exists in our DB
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    // 2. Create Supabase auth user
    const { data: supabaseUser, error: signUpError } =
      await this.supabaseAdmin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });

    if (signUpError) {
      this.logger.error(`Supabase signup failed: ${signUpError.message}`);
      throw new ConflictException(
        signUpError.message || "Failed to create auth user",
      );
    }

    // 3. Create org + user in a transaction
    const slug = dto.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const result = await this.prisma.$transaction(async (tx: TransactionClient) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: `${slug}-${randomBytes(3).toString("hex")}`,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          role: "OWNER",
          organizationId: organization.id,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorId: user.id,
          action: "user.registered",
          resource: "User",
          resourceId: user.id,
        },
      });

      return { user, organization };
    });

    // 4. Sign in to get tokens
    const { data: session, error: signInError } =
      await this.supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (signInError) {
      this.logger.error(`Post-register sign-in failed: ${signInError.message}`);
    }

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      accessToken: session?.session?.access_token ?? null,
      refreshToken: session?.session?.refresh_token ?? null,
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, plan: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found in application");
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: user.organization,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async getProfile(currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, plan: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: user.organization,
    };
  }

  // ─── API Key Management ──────────────────────────────────────

  async createApiKey(orgId: string, dto: CreateApiKeyDto, actorId: string) {
    const rawKey = `yay_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        keyHash,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorId,
        action: "apikey.created",
        resource: "ApiKey",
        resourceId: apiKey.id,
      },
    });

    // Return the raw key ONLY on creation — it's never stored
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
    };
  }

  async listApiKeys(orgId: string) {
    return this.prisma.apiKey.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeApiKey(orgId: string, keyId: string, actorId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, organizationId: orgId },
    });

    if (!key) {
      throw new NotFoundException("API key not found");
    }

    await this.prisma.apiKey.delete({ where: { id: keyId } });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorId,
        action: "apikey.revoked",
        resource: "ApiKey",
        resourceId: keyId,
      },
    });

    return { deleted: true };
  }
}
