import { CriminalAttachment } from '../models/criminalattachment.mjs';
import { Sync, SyncFlag } from '../models/sync.mjs';
import type { CriminalPhoto, PhotoServiceInterface, SyncEntry } from './photoserviceinterface.mjs';
import type { ImageServiceInterface } from './imageserviceinterface.mjs';
import type { DownloadServiceInterface } from './downloadserviceinterface.mjs';

export type { CriminalPhoto, SyncEntry };

interface PhotoServiceOptions {
    imageService: ImageServiceInterface;
    downloadService: DownloadServiceInterface;
}

export class PhotoService implements PhotoServiceInterface {
    private readonly imageService: ImageServiceInterface;
    private readonly downloadService: DownloadServiceInterface;

    public constructor({ imageService, downloadService }: PhotoServiceOptions) {
        this.imageService = imageService;
        this.downloadService = downloadService;
    }

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
            url: `${this.downloadService.baseURL}${row.path}`,
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

        return entry ? [await this.downloadService.download(entry.path), entry.mime_type] : [null, null];
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
                try {
                    const response = await this.downloadService.download(row.path);
                    const converted = await this.imageService.toFaceXFormat(response);
                    result.image = converted ? converted.toString('base64') : '';
                } catch {
                    // FIXME: ignore for now
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
