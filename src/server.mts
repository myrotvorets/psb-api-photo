import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, type Request, type Response, json } from 'express';
import { installOpenApiValidator } from '@myrotvorets/oav-installer';
import { errorMiddleware, notFoundMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { createServer, getTracer, recordErrorToSpan } from '@myrotvorets/otel-utils';
import {
    type LoggerFromRequestFunction,
    errorLoggerHook,
    requestDurationMiddleware,
    requestLoggerMiddleware,
} from '@myrotvorets/express-otel-middlewares';

import { type LocalsWithContainer, initializeContainer, scopedContainerMiddleware } from './lib/container.mjs';
import { requestDurationHistogram } from './lib/otel.mjs';

import { photoController } from './controllers/photo.mjs';
import { monitoringController } from './controllers/monitoring.mjs';
import { initAsyncMetrics } from './lib/metrics.mjs';

const loggerFromRequest: LoggerFromRequestFunction = (req: Request) =>
    (req.res as Response<never, LocalsWithContainer> | undefined)?.locals.container.resolve('logger');

export function configureApp(app: Express): ReturnType<typeof initializeContainer> {
    return getTracer().startActiveSpan('configureApp', (span): ReturnType<typeof initializeContainer> => {
        try {
            const container = initializeContainer();
            const env = container.resolve('environment');
            const base = dirname(fileURLToPath(import.meta.url));
            const db = container.resolve('db');

            app.use(
                requestDurationMiddleware(requestDurationHistogram),
                scopedContainerMiddleware,
                requestLoggerMiddleware('photos', loggerFromRequest),
                json(),
            );

            app.use('/monitoring', monitoringController(db));

            app.use(
                installOpenApiValidator(join(base, 'specs', 'photos-private.yaml'), env.NODE_ENV),
                photoController(),
                notFoundMiddleware,
                errorMiddleware({
                    beforeSendHook: errorLoggerHook(loggerFromRequest),
                }),
            );

            initAsyncMetrics(container.cradle);
            return container;
        } /* c8 ignore start */ catch (e) {
            recordErrorToSpan(e, span);
            throw e;
        } /* c8 ignore stop */ finally {
            span.end();
        }
    });
}

export function createApp(): Express {
    const app = express();
    app.set('strict routing', true);
    app.set('case sensitive routing', true);
    app.set('x-powered-by', false);
    app.set('trust proxy', true);
    return app;
}

export async function run(): Promise<void> {
    const app = createApp();
    configureApp(app);
    await createServer(app);
}
