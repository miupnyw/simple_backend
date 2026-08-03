import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  statusCode: number;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T> | T> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const statusCode: HttpStatus = response.statusCode;
    if (statusCode === HttpStatus.NO_CONTENT) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode,
        data,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
      })),
    );
  }
}
