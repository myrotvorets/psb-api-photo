import { requestLogger } from '@myrotvorets/express-request-logger';
import type { NextFunction, Request, Response } from 'express';
import type { LocalsWithContainer } from '../lib/container.mjs';

export const loggerMiddleware =
    process.env.NODE_ENV !== 'test'
        ? requestLogger<never, never, never, never, LocalsWithContainer>({
              format: '[PSBAPI-photos] :req[X-Request-ID]\t:method\t:url\t:status :res[content-length]\t:date[iso]\t:total-time',
              beforeLogHook: (err, _req, res, line, tokens): string => {
                  const message = `Status: ${tokens.status} len: ${tokens['res[content-length]']} time: ${tokens['total-time']}`;
                  const logger = res.locals.container.resolve('logger');
                  if (+(tokens.status ?? '') >= 500 || err) {
                      logger.error(message);
                  } else if (+(tokens.status ?? '') >= 400) {
                      logger.warning(message);
                  } else {
                      logger.info(message);
                  }

                  return line;
              },
          })
        : (_req: Request, _res: Response, next: NextFunction): void => next();
