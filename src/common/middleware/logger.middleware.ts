import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      this.logger.log({
        method,
        url: originalUrl,
        statusCode: res.statusCode,
        responseTime: Date.now() - start,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
    });

    next();
  }
}
