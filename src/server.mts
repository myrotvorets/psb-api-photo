import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, json } from 'express';
import { installOpenApiValidator } from '@myrotvorets/oav-installer';
import { errorMiddleware, notFoundMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { createServer } from '@myrotvorets/create-server';
import { recordErrorToSpan } from '@myrotvorets/opentelemetry-configurator';

import { initializeContainer, scopedContainerMiddleware } from './lib/container.mjs';
import { configurator } from './lib/otel.mjs';

import { requestDurationMiddleware } from './middleware/duration.mjs';
import { loggerMiddleware } from './middleware/logger.mjs';

import { photoController } from './controllers/photo.mjs';
import { monitoringController } from './controllers/monitoring.mjs';
import { initAsyncMetrics } from './lib/metrics.mjs';

export function configureApp(app: Express): Promise<ReturnType<typeof initializeContainer>> {
    return configurator
        .tracer()
        .startActiveSpan('configureApp', async (span): Promise<ReturnType<typeof initializeContainer>> => {
            try {
                const container = initializeContainer();
                const env = container.resolve('environment');
                const base = dirname(fileURLToPath(import.meta.url));
                const db = container.resolve('db');

                app.use(requestDurationMiddleware, scopedContainerMiddleware, loggerMiddleware, json());
                app.use('/monitoring', monitoringController(db));

                await installOpenApiValidator(join(base, 'specs', 'photos.yaml'), app, env.NODE_ENV);

                app.use(photoController(), notFoundMiddleware, errorMiddleware);

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
    app.set('x-powered-by', false);
    app.set('trust proxy', true);
    return app;
}

export async function run(): Promise<void> {
    const app = createApp();
    const container = await configureApp(app);
    const env = container.resolve('environment');

    const server = await createServer(app);
    server.listen(env.PORT);
}
