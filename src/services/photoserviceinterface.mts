import type { SyncFlag } from '../models/sync.mjs';

export interface CriminalPhoto {
    att_id: number;
    mime_type: string;
    url: string;
}

export interface SyncEntry {
    id: number;
    att_id: number;
    suspect_id: number;
    path: string;
    flag: SyncFlag;
    image: string;
}

export interface PhotoServiceInterface {
    getCriminalIDs(after: number, count: number): Promise<number[]>;
    getCriminalPhotos(id: number): Promise<CriminalPhoto[]>;
    getCriminalsToSync(after: number, count: number): Promise<number[]>;
    markCriminalSynced(id: number): PromiseLike<number>;
    downloadPhoto(attID: number): Promise<[photo: ArrayBuffer, mime: string] | [photo: null, mime: null]>;
    downloadPhotoForFaceX(attID: number): Promise<Buffer | null>;
    getPhotoToSync(): Promise<SyncEntry | null>;
    setSyncStatus(id: number, success: boolean): PromiseLike<number>;
}
