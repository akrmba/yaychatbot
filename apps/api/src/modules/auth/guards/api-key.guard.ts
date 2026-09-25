import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Only activate if no JWT user already attached and header looks like an API key
    if (request.user) return true;

    const authHeader: string | undefined = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer yay_")) return true; // Not an API key, let JWT guard handle it

    const rawKey = authHeader.slice(7); // strip "Bearer "
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash },
      include: {
        organization: {
          select: { id: true },
        },
      },
    });

    if (!apiKey) {
      throw new UnauthorizedException("Invalid API key");
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException("API key expired");
    }

    // Timing-safe comparison of the stored hash
    const storedBuf = Buffer.from(apiKey.keyHash, "hex");
    const computedBuf = Buffer.from(keyHash, "hex");
    if (!timingSafeEqual(storedBuf, computedBuf)) {
      throw new UnauthorizedException("Invalid API key");
    }

    // Attach a synthetic user to the request
    request.user = {
      id: `apikey:${apiKey.id}`,
      email: `apikey-${apiKey.name}`,
      name: apiKey.name,
      role: "ADMIN", // API keys get ADMIN-level access
      organizationId: apiKey.organizationId,
      supabaseId: null,
    };

    // Update lastUsedAt (fire-and-forget)
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return true;
  }
}
