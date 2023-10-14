import { type NextFunction, type Request, type Response, Router } from 'express';
import { asyncWrapperMiddleware } from '@myrotvorets/express-async-middleware-wrapper';
import { type ErrorResponse, numberParamHandler } from '@myrotvorets/express-microservice-middlewares';
import type { CriminalPhoto, SyncEntry } from '../services/photoservice.mjs';
import type { LocalsWithContainer } from '../lib/container.mjs';
import { HttpError } from '../lib/httperror.mjs';

function attachmentNotFound(id: number): ErrorResponse {
    return {
        success: false,
        status: 404,
        code: 'NOT_FOUND',
        message: `Attachment ${id} not found`,
    };
}

function handleHttpError(err: unknown, next: NextFunction, container: LocalsWithContainer['container']): void {
    const e = err instanceof Error ? err : new Error(err?.toString());
    const logger = container.resolve('logger');
    if (e instanceof HttpError) {
        const payload: ErrorResponse = {
            success: false,
            status: e.code === 404 ? e.code : 502,
            code: e.code === 404 ? 'NOT_FOUND' : 'BAD_GATEWAY',
            message: e.message,
        };

        if (e.code !== 404) {
            logger.error(e.message);
        }

        next(payload);
    } else {
        logger.error(e.message);
        next(e);
    }
}

interface GetCriminalsParams {
    after: number;
    count: number;
}

interface CriminalsResponse {
    success: true;
    ids: number[];
}

async function criminalsHandler(
    req: Request<GetCriminalsParams>,
    res: Response<CriminalsResponse, LocalsWithContainer>,
): Promise<void> {
    const { after, count } = req.params;
    const service = res.locals.container.resolve('photoService');
    const ids = await service.getCriminalIDs(after, count);
    res.json({ success: true, ids });
}

async function getCriminalsToSyncHandler(
    req: Request<GetCriminalsParams>,
    res: Response<CriminalsResponse, LocalsWithContainer>,
): Promise<void> {
    const { after, count } = req.params;
    const service = res.locals.container.resolve('photoService');
    const ids = await service.getCriminalsToSync(after, count);
    res.json({ success: true, ids });
}

interface GetCriminalPhotosParams {
    id: number;
}

interface GetCriminalsPhotosResponse {
    success: true;
    photos: CriminalPhoto[];
}

async function criminalPhotosHandler(
    req: Request<GetCriminalPhotosParams>,
    res: Response<GetCriminalsPhotosResponse, LocalsWithContainer>,
): Promise<void> {
    const { id } = req.params;

    const service = res.locals.container.resolve('photoService');
    const photos = await service.getCriminalPhotos(id);
    res.json({ success: true, photos });
}

async function markCriminalSyncedHandler(
    req: Request<GetCriminalPhotosParams>,
    res: Response<never, LocalsWithContainer>,
): Promise<void> {
    const { id } = req.params;
    const service = res.locals.container.resolve('photoService');
    await service.markCriminalSynced(id);
    res.status(204).end();
}

interface GetPhotoParams {
    id: number;
}

async function getPhotoHandler(
    req: Request<GetPhotoParams>,
    res: Response<Buffer, LocalsWithContainer>,
    next: NextFunction,
): Promise<void> {
    const { id } = req.params;
    const service = res.locals.container.resolve('photoService');

    try {
        const [photo, mime] = await service.downloadPhoto(id);
        if (photo === null) {
            next(attachmentNotFound(id));
        } else {
            res.contentType(mime).send(Buffer.from(photo));
        }
    } catch (err) {
        handleHttpError(err, next, res.locals.container);
    }
}

async function getFaceXPhotoHandler(
    req: Request<GetPhotoParams>,
    res: Response<Buffer, LocalsWithContainer>,
    next: NextFunction,
): Promise<void> {
    const { id } = req.params;
    const service = res.locals.container.resolve('photoService');

    try {
        const photo = await service.downloadPhotoForFaceX(id);
        if (photo === null) {
            next(attachmentNotFound(id));
        } else {
            res.contentType('image/jpeg').send(photo);
        }
    } catch (err) {
        handleHttpError(err, next, res.locals.container);
    }
}

interface PhotoToSyncResponse {
    success: true;
    payload: SyncEntry;
}

async function getPhotoToSyncHandler(
    _req: Request,
    res: Response<PhotoToSyncResponse, LocalsWithContainer>,
): Promise<void> {
    const service = res.locals.container.resolve('photoService');
    const entry = await service.getPhotoToSync();
    if (entry) {
        res.json({ success: true, payload: entry });
    } else {
        res.status(204).end();
    }
}

interface SetSyncStatusParams extends Record<string, string> {
    id: string;
}

interface SetSyncStatusBody {
    success: boolean;
}

async function setSyncStatusHandler(
    req: Request<SetSyncStatusParams, unknown, SetSyncStatusBody>,
    res: Response<never, LocalsWithContainer>,
): Promise<void> {
    const { id } = req.params;
    const { success } = req.body;
    const service = res.locals.container.resolve('photoService');
    await service.setSyncStatus(+id, success);
    res.status(204).end();
}

export function photoController(): Router {
    const router = Router({
        caseSensitive: true,
        strict: true,
    });

    router.param('after', numberParamHandler);
    router.param('count', numberParamHandler);
    router.param('id', numberParamHandler);

    router.get('/suspects/:after/:count', asyncWrapperMiddleware(criminalsHandler));
    router.get('/suspects/:id', asyncWrapperMiddleware(criminalPhotosHandler));
    router.get('/sync/suspects/:after/:count', asyncWrapperMiddleware(getCriminalsToSyncHandler));
    router.delete('/sync/suspects/:id', asyncWrapperMiddleware(markCriminalSyncedHandler));
    router.get('/sync', asyncWrapperMiddleware(getPhotoToSyncHandler));
    router.put('/sync/:id', asyncWrapperMiddleware(setSyncStatusHandler));
    router.get('/:id', asyncWrapperMiddleware(getPhotoHandler));
    router.get('/:id/facex', asyncWrapperMiddleware(getFaceXPhotoHandler));
    return router;
}
