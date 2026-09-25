import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

export interface ResponseEnvelope<T> {
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
