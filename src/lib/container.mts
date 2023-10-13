import { AwilixContainer, asClass, asFunction, asValue, createContainer } from 'awilix';
import type { NextFunction, Request, Response } from 'express';
import * as knexpkg from 'knex';
import { Logger, Meter, getLogger, getMeter } from '@myrotvorets/otel-utils';
import type { DownloadServiceInterface } from '../services/downloadserviceinterface.mjs';
import type { ImageServiceInterface } from '../services/imageserviceinterface.mjs';
import type { PhotoServiceInterface } from '../services/photoserviceinterface.mjs';
import { DownloadService } from '../services/downloadservice.mjs';
import { ImageService } from '../services/imageservice.mjs';
import { PhotoService } from '../services/photoservice.mjs';
import { CriminalAttachmentModel } from '../models/criminalattachment.mjs';
import { SyncModel } from '../models/sync.mjs';
import { environment } from './environment.mjs';
import { fetch } from './fetch.mjs';
import { buildKnexConfig } from '../knexfile.mjs';

export interface Container {
    photoService: PhotoServiceInterface;
    imageService: ImageServiceInterface;
    downloadService: DownloadServiceInterface;
    criminalAttachmentModel: CriminalAttachmentModel;
    syncModel: SyncModel;
    environment: ReturnType<typeof environment>;
    logger: Logger;
    meter: Meter;
    db: knexpkg.Knex;
}

export interface RequestContainer {
    req: Request;
}

export const container = createContainer<Container>();

function createEnvironment(): ReturnType<typeof environment> {
    return environment(true);
}

function createLogger({ req }: RequestContainer): Logger {
    const logger = getLogger();
    logger.clearAttributes();
    logger.setAttribute('ip', req.ip);
    logger.setAttribute('request', `${req.method} ${req.url}`);
    return logger;
}

function createDownloadService({ environment }: Container): DownloadServiceInterface {
    return new DownloadService(environment.PHOTOS_BASE_URL, fetch);
}

function createDatabase(): knexpkg.Knex {
    const { knex } = knexpkg.default;
    return knex(buildKnexConfig());
}

export type LocalsWithContainer = Record<'container', AwilixContainer<RequestContainer & Container>>;

export function initializeContainer(): typeof container {
    container.register({
        photoService: asClass(PhotoService).singleton(),
        imageService: asClass(ImageService).singleton(),
        downloadService: asFunction(createDownloadService).singleton(),
        criminalAttachmentModel: asClass(CriminalAttachmentModel).singleton(),
        syncModel: asClass(SyncModel).singleton(),
        environment: asFunction(createEnvironment).singleton(),
        logger: asFunction(createLogger).scoped(),
        meter: asFunction(getMeter).singleton(),
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
