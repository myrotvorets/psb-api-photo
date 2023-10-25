import { requestLogger } from '@myrotvorets/express-request-logger';
import type { NextFunction, Request, Response } from 'express';
import type { LocalsWithContainer } from '../lib/container.mjs';

export const loggerMiddleware =
    process.env['NODE_ENV'] !== 'test' /* c8 ignore start */
        ? requestLogger<never, never, never, never, LocalsWithContainer>({
              format: '[photos] :remote-addr :method :url :status :res[content-length] :date[iso] :total-time',
              beforeLogHook: (err, _req, res, line, tokens): string => {
                  const { status } = tokens;
                  const message = `Status: ${status} len: ${tokens['res[content-length]']} time: ${tokens['total-time']}`;
                  const logger = res.locals.container.resolve('logger');
                  if (+(status ?? '') >= 500 || err) {
                      logger.error(message);
                  } else if (+(status ?? '') >= 400) {
                      logger.warning(message);
                  } else {
                      logger.info(message);
                  }

                  return line;
              },
          })
        : /* c8 ignore stop */
          (_req: Request, _res: Response, next: NextFunction): void => next();
