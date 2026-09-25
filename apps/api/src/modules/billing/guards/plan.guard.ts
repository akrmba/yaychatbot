import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Plan } from "@prisma/client";
import { AuthenticatedUser } from "../../auth/strategies/jwt.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { PLAN_CONFIGS } from "../billing.constants";

export const REQUIRED_PLAN_KEY = "requiredPlan";

/** Restrict a route to organizations on a minimum plan tier. */
export const RequiresPlan = (...plans: Plan[]) =>
  SetMetadata(REQUIRED_PLAN_KEY, plans);

const PLAN_RANK: Record<Plan, number> = {
  [Plan.FREE]: 0,
  [Plan.STARTER]: 1,
  [Plan.GROWTH]: 2,
  [Plan.SCALE]: 3,
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlans = this.reflector.getAllAndOverride<Plan[]>(
      REQUIRED_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPlans || requiredPlans.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user?.organizationId) {
      throw new ForbiddenException("No organization context");
    }

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: { plan: true },
    });

    const orgRank = PLAN_RANK[org.plan];
    const minRequired = Math.min(...requiredPlans.map((p) => PLAN_RANK[p]));

    if (orgRank < minRequired) {
      const planNames = requiredPlans.join(" or ");
      throw new ForbiddenException(
        `This feature requires the ${planNames} plan. Your current plan is ${org.plan}.`,
      );
    }

    return true;
  }
}
