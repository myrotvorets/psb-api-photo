import type { RequestHandler } from 'express';
import { hrTime, hrTimeDuration, hrTimeToMilliseconds } from '@opentelemetry/core';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import { requestDurationHistogram } from '../lib/otel.mjs';

export const requestDurationMiddleware: RequestHandler = (req, res, next): void => {
    const start = hrTime();
    const recordDurarion = (): void => {
        res.removeListener('error', recordDurarion);
        res.removeListener('finish', recordDurarion);
        const end = hrTime();
        const duration = hrTimeDuration(start, end);
        requestDurationHistogram.record(hrTimeToMilliseconds(duration), {
            [SemanticAttributes.HTTP_METHOD]: req.method,
            [SemanticAttributes.HTTP_ROUTE]: (req.route as Record<'path', string> | undefined)?.path ?? '<unknown>',
            [SemanticAttributes.HTTP_STATUS_CODE]: res.statusCode,
        });
    };

    res.prependOnceListener('error', recordDurarion);
    res.prependOnceListener('finish', recordDurarion);
    next();
};
