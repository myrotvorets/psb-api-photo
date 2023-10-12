import { type NextFunction, type Request, type Response, Router } from 'express';
import { asyncWrapperMiddleware } from '@myrotvorets/express-async-middleware-wrapper';
import type { ErrorResponse } from '@myrotvorets/express-microservice-middlewares';
import type { CriminalPhoto, SyncEntry } from '../services/photoservice.mjs';
import type { LocalsWithContainer } from '../lib/container.mjs';

interface GetCriminalsParams extends Record<string, string> {
    after: string;
    count: string;
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
    const ids = await service.getCriminalIDs(+after, +count);
    res.json({ success: true, ids });
}

async function getCriminalsToSyncHandler(
    req: Request<GetCriminalsParams>,
    res: Response<CriminalsResponse, LocalsWithContainer>,
): Promise<void> {
    const { after, count } = req.params;
    const service = res.locals.container.resolve('photoService');
    const ids = await service.getCriminalsToSync(+after, +count);
    res.json({ success: true, ids });
}

interface GetCriminalPhotosParams extends Record<string, string> {
    id: string;
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
    const photos = await service.getCriminalPhotos(+id);
    res.json({ success: true, photos });
}

async function markCriminalSyncedHandler(
    req: Request<GetCriminalPhotosParams>,
    res: Response<never, LocalsWithContainer>,
): Promise<void> {
    const { id } = req.params;
    const service = res.locals.container.resolve('photoService');
    await service.markCriminalSynced(+id);
    res.status(204).end();
}

interface GetPhotoParams extends Record<string, string> {
    id: string;
}

async function getPhotoHandler(
    req: Request<GetPhotoParams>,
    res: Response<ArrayBuffer, LocalsWithContainer>,
    next: NextFunction,
): Promise<void> {
    const { id } = req.params;
    const service = res.locals.container.resolve('photoService');
    const [photo, mime] = await service.downloadPhoto(+id);
    if (photo === null) {
        next({
            success: false,
            status: 404,
            code: 'NOT_FOUND',
        } as ErrorResponse);
    } else {
        res.contentType(mime).send(photo);
    }
}

async function getFaceXPhotoHandler(
    req: Request<GetPhotoParams>,
    res: Response<Buffer, LocalsWithContainer>,
    next: NextFunction,
): Promise<void> {
    const { id } = req.params;
    const service = res.locals.container.resolve('photoService');
    const photo = await service.downloadPhotoForFaceX(+id);
    if (photo === null) {
        next({
            success: false,
            status: 404,
            code: 'NOT_FOUND',
        } as ErrorResponse);
    } else {
        res.contentType('image/jpeg').send(photo);
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
    const router = Router();
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
