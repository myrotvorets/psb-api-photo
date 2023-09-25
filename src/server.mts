import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, json } from 'express';
import * as knexpkg from 'knex';
import { Model } from 'objection';
import { installOpenApiValidator } from '@myrotvorets/oav-installer';
import { errorMiddleware, notFoundMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { createServer } from '@myrotvorets/create-server';
import morgan from 'morgan';

import { buildKnexConfig } from './knexfile.mjs';
import { environment } from './lib/environment.mjs';

import { photoController } from './controllers/photo.mjs';
import { monitoringController } from './controllers/monitoring.mjs';

// See https://github.com/knex/knex/issues/5358#issuecomment-1279979120
const { knex } = knexpkg.default;

export async function configureApp(app: express.Express): Promise<void> {
    const env = environment();

    await installOpenApiValidator(
        join(dirname(fileURLToPath(import.meta.url)), 'specs', 'photos.yaml'),
        app,
        env.NODE_ENV,
    );

    app.use('/', photoController());
    app.use('/', notFoundMiddleware);
    app.use(errorMiddleware);
}

/* c8 ignore start */
export function setupApp(): Express {
    const app = express();
    app.set('strict routing', true);
    app.set('x-powered-by', false);

    app.use(json());
    app.use(
        morgan(
            '[PSBAPI-photos] :req[X-Request-ID]\t:method\t:url\t:status :res[content-length]\t:date[iso]\t:response-time\t:total-time',
        ),
    );

    return app;
}

function setupKnex(): knexpkg.Knex {
    const db = knex(buildKnexConfig());
    Model.knex(db);
    return db;
}

export async function run(): Promise<void> {
    const [env, app, db] = [environment(), setupApp(), setupKnex()];

    app.use('/monitoring', monitoringController(db));

    await configureApp(app);

    const server = await createServer(app);
    server.listen(env.PORT);
}
/* c8 ignore end */
