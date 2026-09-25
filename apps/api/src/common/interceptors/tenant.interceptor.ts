import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import {
  tenantStorage,
  TenantStore,
} from "../../common/context/tenant.context";
import { AuthenticatedUser } from "../../modules/auth/strategies/jwt.strategy";

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user?.organizationId) {
      // Public route or unauthenticated — run without tenant context
      return next.handle();
    }

    const store: TenantStore = {
      organizationId: user.organizationId,
      userId: user.id,
    };

    return new Observable((subscriber) => {
      tenantStorage.run(store, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
