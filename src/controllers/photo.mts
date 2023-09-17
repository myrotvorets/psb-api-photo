import { type NextFunction, type Request, type RequestHandler, type Response, Router } from 'express';
import { asyncWrapperMiddleware } from '@myrotvorets/express-async-middleware-wrapper';
import { ErrorResponse } from '@myrotvorets/express-microservice-middlewares';
import { environment } from '../lib/environment.mjs';
import { CriminalPhoto, PhotoService, SyncEntry } from '../services/photo.mjs';
import { fetch } from '../lib/fetch.mjs';

interface GetCriminalsParams extends Record<string, string> {
    after: string;
    count: string;
}

interface CriminalsResponse {
    success: true;
    ids: number[];
}

async function criminalsHandler(req: Request<GetCriminalsParams>, res: Response<CriminalsResponse>): Promise<void> {
    const { after, count } = req.params;
    const ids = await PhotoService.getCriminalIDs(+after, +count);
    res.json({ success: true, ids });
}

async function getCriminalsToSyncHandler(
    req: Request<GetCriminalsParams>,
    res: Response<CriminalsResponse>,
): Promise<void> {
    const { after, count } = req.params;
    const ids = await PhotoService.getCriminalsToSync(+after, +count);
    res.json({ success: true, ids });
}

interface GetCriminalPhotosParams extends Record<string, string> {
    id: string;
}

interface GetCriminalsPhotosResponse {
    success: true;
    photos: CriminalPhoto[];
}

function criminalPhotosHandler(service: PhotoService): RequestHandler<GetCriminalPhotosParams> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return async (req: Request<GetCriminalPhotosParams>, res: Response<GetCriminalsPhotosResponse>): Promise<void> => {
        const { id } = req.params;
        const photos = await service.getCriminalPhotos(+id);
        res.json({ success: true, photos });
    };
}

async function markCriminalSyncedHandler(req: Request<GetCriminalPhotosParams>, res: Response): Promise<void> {
    const { id } = req.params;
    await PhotoService.markCriminalSynced(+id);
    res.status(204).end();
}

interface GetPhotoParams extends Record<string, string> {
    id: string;
}

function getPhotoHandler(service: PhotoService): RequestHandler<GetPhotoParams> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return async (req: Request<GetPhotoParams>, res: Response, next: NextFunction): Promise<void> => {
        const { id } = req.params;
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
    };
}

function getFaceXPhotoHandler(service: PhotoService): RequestHandler<GetPhotoParams> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return async (req: Request<GetPhotoParams>, res: Response, next: NextFunction): Promise<void> => {
        const { id } = req.params;
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
    };
}

interface PhotoToSyncResponse {
    success: true;
    payload: SyncEntry;
}

function getPhotoToSyncHandler(service: PhotoService): RequestHandler {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return async (_req: Request, res: Response<PhotoToSyncResponse>): Promise<void> => {
        const entry = await service.getPhotoToSync();
        if (entry) {
            res.json({ success: true, payload: entry });
        } else {
            res.status(204).end();
        }
    };
}

interface SetSyncStatusParams extends Record<string, string> {
    id: string;
}

interface SetSyncStatusBody {
    success: boolean;
}

async function setSyncStatusHandler(
    req: Request<SetSyncStatusParams, unknown, SetSyncStatusBody>,
    res: Response,
): Promise<void> {
    const { id } = req.params;
    const { success } = req.body;
    await PhotoService.setSyncStatus(+id, success);
    res.status(204).end();
}

export function photoController(): Router {
    const env = environment();
    const router = Router();
    const service = new PhotoService(env.PHOTOS_BASE_URL, fetch);

    router.get('/suspects/:after/:count', asyncWrapperMiddleware(criminalsHandler));
    router.get('/suspects/:id', asyncWrapperMiddleware(criminalPhotosHandler(service) as RequestHandler));
    router.get('/sync/suspects/:after/:count', asyncWrapperMiddleware(getCriminalsToSyncHandler));
    router.delete('/sync/suspects/:id', asyncWrapperMiddleware(markCriminalSyncedHandler));
    router.get('/sync', asyncWrapperMiddleware(getPhotoToSyncHandler(service)));
    router.put('/sync/:id', asyncWrapperMiddleware(setSyncStatusHandler));
    router.get('/:id', asyncWrapperMiddleware(getPhotoHandler(service) as RequestHandler));
    router.get('/:id/facex', asyncWrapperMiddleware(getFaceXPhotoHandler(service) as RequestHandler));

    return router;
}
