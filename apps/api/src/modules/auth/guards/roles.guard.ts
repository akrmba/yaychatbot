import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../../../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../strategies/jwt.strategy";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator → allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException("No user context");
    }

    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        `Role '${user.role}' is not authorized. Required: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
