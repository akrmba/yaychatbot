import { AuthenticatedUser } from "../modules/auth/strategies/jwt.strategy";

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}
