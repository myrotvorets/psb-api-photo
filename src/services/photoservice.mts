import { SyncFlag, type SyncModel } from '../models/sync.mjs';
import type { CriminalPhoto, DbSyncStats, PhotoServiceInterface, SyncEntry } from './photoserviceinterface.mjs';
import type { ImageServiceInterface } from './imageserviceinterface.mjs';
import type { DownloadServiceInterface } from './downloadserviceinterface.mjs';
import type { CriminalAttachmentModel } from '../models/criminalattachment.mjs';

export type { CriminalPhoto, SyncEntry, DbSyncStats };

interface PhotoServiceOptions {
    imageService: ImageServiceInterface;
    downloadService: DownloadServiceInterface;
    criminalAttachmentModel: CriminalAttachmentModel;
    syncModel: SyncModel;
}

export class PhotoService implements PhotoServiceInterface {
    private readonly imageService: ImageServiceInterface;
    private readonly downloadService: DownloadServiceInterface;
    private readonly criminalAttachmentModel: CriminalAttachmentModel;
    private readonly syncModel: SyncModel;

    public constructor({ imageService, downloadService, criminalAttachmentModel, syncModel }: PhotoServiceOptions) {
        this.imageService = imageService;
        this.downloadService = downloadService;
        this.criminalAttachmentModel = criminalAttachmentModel;
        this.syncModel = syncModel;
    }

    public async getCriminalIDs(after: number, count: number): Promise<number[]> {
        const rows = await this.criminalAttachmentModel.criminalsAfter(after, count);
        return rows.map((row) => row.id);
    }

    public async getCriminalPhotos(id: number): Promise<CriminalPhoto[]> {
        const rows = await this.criminalAttachmentModel.byId(id);
        return rows.map((row) => ({
            att_id: row.att_id,
            url: `${this.downloadService.baseURL}${row.path}`,
            mime_type: row.mime_type,
        }));
    }

    public async getCriminalsToSync(after: number, count: number): Promise<number[]> {
        return this.syncModel.getCriminalsToSync(after, count);
    }

    public markCriminalSynced(id: number): Promise<number> {
        return this.syncModel.markCriminalSynced(id);
    }

    public async downloadPhoto(attID: number): Promise<[Buffer, string] | [null, null]> {
        const entry = await this.criminalAttachmentModel.byAttachmentId(attID);
        return entry ? [await this.downloadService.download(entry.path), entry.mime_type] : [null, null];
    }

    public async downloadPhotoForFaceX(attID: number): Promise<Buffer | null> {
        const [photo] = await this.downloadPhoto(attID);
        return photo ? this.imageService.toFaceXFormat(photo) : null;
    }

    public async getPhotoToSync(): Promise<SyncEntry | null> {
        const row = await this.syncModel.getPhotoToSync();
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
        return this.syncModel.markEntrySynced(id, success);
    }

    public async getDbSyncStats(): Promise<DbSyncStats> {
        const stats = await this.syncModel.statsByFlag();
        const count = await this.syncModel.countQueuedSuspects();

        const map: Record<number, number> = {};
        for (const row of stats) {
            map[row.flag] = row.count;
        }

        return {
            photos_to_add: map[SyncFlag.ADD_PHOTO] ?? 0,
            photos_to_del: map[SyncFlag.DEL_PHOTO] ?? 0,
            photos_add_failed: map[SyncFlag.FAILED_ADD] ?? 0,
            photos_del_failed: map[SyncFlag.FAILED_DEL] ?? 0,
            suspects: count[0] ?? 0,
        };
    }
}
