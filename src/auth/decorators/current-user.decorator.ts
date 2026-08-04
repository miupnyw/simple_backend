import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayloadWithRefreshToken } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadWithRefreshToken => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: JwtPayloadWithRefreshToken }>();
    return request.user;
  },
);
