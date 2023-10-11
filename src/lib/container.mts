import { AwilixContainer, asFunction, asValue, createContainer } from 'awilix';
import type { NextFunction, Request, Response } from 'express';
import * as knexpkg from 'knex';
import { Model } from 'objection';
import { FetchLike, PhotoService } from '../services/photo.mjs';
import { environment } from './environment.mjs';
import { configurator } from './otel.mjs';
import { fetch } from './fetch.mjs';
import { buildKnexConfig } from '../knexfile.mjs';

export interface Container {
    photoService: PhotoService;
    environment: ReturnType<typeof environment>;
    logger: ReturnType<(typeof configurator)['logger']>;
    meter: ReturnType<(typeof configurator)['meter']>;
    fetch: FetchLike;
    db: knexpkg.Knex;
}

export interface RequestContainer {
    req: Request;
}

export const container = createContainer<Container>();

function createEnvironment(): ReturnType<typeof environment> {
    return environment(true);
}

function createLogger({ req }: RequestContainer): ReturnType<(typeof configurator)['logger']> {
    const logger = configurator.logger();
    logger.clearAttributes();
    logger.setAttribute('ip', req.ip);
    logger.setAttribute('request', `${req.method} ${req.url}`);
    return logger;
}

function createMeter(): ReturnType<(typeof configurator)['meter']> {
    return configurator.meter();
}

function createPhotoService({ environment, fetch }: Container): PhotoService {
    return new PhotoService(environment.PHOTOS_BASE_URL, fetch);
}

function createDatabase(): knexpkg.Knex {
    const { knex } = knexpkg.default;
    const db = knex(buildKnexConfig());
    Model.knex(db);
    return db;
}

export type LocalsWithContainer = Record<'container', AwilixContainer<RequestContainer & Container>>;

export function initializeContainer(): typeof container {
    container.register({
        photoService: asFunction(createPhotoService).singleton(),
        environment: asFunction(createEnvironment).singleton(),
        logger: asFunction(createLogger).scoped(),
        meter: asFunction(createMeter).singleton(),
        fetch: asValue(fetch),
        db: asFunction(createDatabase).singleton(),
    });

    return container;
}

export function scopedContainerMiddleware(
    req: Request,
    res: Response<unknown, LocalsWithContainer>,
    next: NextFunction,
): void {
    res.locals.container = container.createScope<RequestContainer>();
    res.locals.container.register({
        req: asValue(req),
    });

    next();
}
