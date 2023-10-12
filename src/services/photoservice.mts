import type { RequestInfo, RequestInit, Response } from 'node-fetch';
import { CriminalAttachment } from '../models/criminalattachment.mjs';
import { Sync, SyncFlag } from '../models/sync.mjs';
import type { CriminalPhoto, PhotoServiceInterface, SyncEntry } from './photoserviceinterface.mjs';
import { ImageServiceInterface } from './imageserviceinterface.mjs';

export type { CriminalPhoto, SyncEntry };

export type FetchLike<
    Info extends RequestInfo = RequestInfo,
    Init extends RequestInit = RequestInit,
    Resp extends Response = Response,
> = (url: Info, init?: Init) => Promise<Resp>;

export class PhotoService implements PhotoServiceInterface {
    public constructor(
        private readonly baseURL: string,
        private readonly fetch: FetchLike,
        private readonly imageService: ImageServiceInterface,
    ) {}

    public async getCriminalIDs(after: number, count: number): Promise<number[]> {
        const rows = await CriminalAttachment.query()
            .modify(CriminalAttachment.modifiers.onlyImages)
            .modify(CriminalAttachment.modifiers.criminalsAfter, after)
            .limit(count);
        return rows.map((row) => row.id);
    }

    public async getCriminalPhotos(id: number): Promise<CriminalPhoto[]> {
        const rows = await CriminalAttachment.query()
            .modify(CriminalAttachment.modifiers.onlyImages)
            .modify(CriminalAttachment.modifiers.byId, id)
            .select('att_id', 'path', 'mime_type');

        return rows.map((row) => ({
            att_id: row.att_id,
            url: `${this.baseURL}${row.path}`,
            mime_type: row.mime_type,
        }));
    }

    public async getCriminalsToSync(after: number, count: number): Promise<number[]> {
        const rows = await Sync.query().modify(Sync.modifiers.getCriminalsToSync, after).limit(count);
        return rows.map((row) => row.criminal_id);
    }

    public markCriminalSynced(id: number): PromiseLike<number> {
        return Sync.query().modify(Sync.modifiers.findByCriminalId, id).delete();
    }

    public async downloadPhoto(attID: number): Promise<[ArrayBuffer, string] | [null, null]> {
        const entry = await CriminalAttachment.query()
            .modify(CriminalAttachment.modifiers.byAttachmentId, attID)
            .modify(CriminalAttachment.modifiers.onlyImages)
            .select('path', 'mime_type')
            .first();

        if (entry) {
            const url = new URL(`${this.baseURL}${entry.path}`);
            const response = await this.fetch(url.href);
            if (response.ok) {
                return [await response.arrayBuffer(), entry.mime_type];
            }
        }

        return [null, null];
    }

    public async downloadPhotoForFaceX(attID: number): Promise<Buffer | null> {
        const [photo] = await this.downloadPhoto(attID);
        return photo ? this.imageService.toFaceXFormat(photo) : null;
    }

    public async getPhotoToSync(): Promise<SyncEntry | null> {
        const row = await Sync.query().modify(Sync.modifiers.getPhotoToSync).first();
        if (row) {
            const result: SyncEntry = {
                id: row.id,
                att_id: row.att_id,
                suspect_id: row.criminal_id,
                path: row.path,
                flag: row.flag,
                image: '',
            };

            if (row.flag === SyncFlag.ADD_PHOTO) {
                const response = await this.fetch(`${this.baseURL}${row.path}`);
                if (response.ok) {
                    const image = await response.arrayBuffer();
                    const converted = await this.imageService.toFaceXFormat(image);
                    result.image = converted ? converted.toString('base64') : '';
                }
            }

            return result;
        }

        return null;
    }

    public setSyncStatus(id: number, success: boolean): PromiseLike<number> {
        if (success) {
            return Sync.query().deleteById(id);
        }

        return Sync.query()
            .findById(id)
            .update({
                flag: Sync.raw('flag + 2'),
            });
    }
}
