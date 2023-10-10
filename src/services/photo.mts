import sharp, { type Metadata, type Sharp } from 'sharp';
import type { RequestInfo, RequestInit, Response } from 'node-fetch';
import type { QueryBuilder } from 'objection';
import { CriminalAttachment } from '../models/criminalattachment.mjs';
import { Sync, SyncFlag } from '../models/sync.mjs';

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

export type FetchLike<
    Info extends RequestInfo = RequestInfo,
    Init extends RequestInit = RequestInit,
    Resp extends Response = Response,
> = (url: Info, init?: Init) => Promise<Resp>;

export class PhotoService {
    public constructor(
        private readonly baseURL: string,
        private readonly fetch: FetchLike,
    ) {}

    public static async getCriminalIDs(after: number, count: number): Promise<number[]> {
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

    public static async getCriminalsToSync(after: number, count: number): Promise<number[]> {
        const rows = await Sync.query().modify(Sync.modifiers.getCriminalsToSync, after).limit(count);
        return rows.map((row) => row.criminal_id);
    }

    public static markCriminalSynced(id: number): QueryBuilder<Sync, number> {
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
        return photo ? PhotoService.toFaceXFormat(photo) : null;
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
                    const converted = await PhotoService.toFaceXFormat(image);
                    result.image = converted ? converted.toString('base64') : '';
                }
            }

            return result;
        }

        return null;
    }

    public static setSyncStatus(id: number, success: boolean): QueryBuilder<Sync, number> {
        if (success) {
            return Sync.query().deleteById(id);
        }

        return Sync.query()
            .findById(id)
            .update({
                flag: Sync.raw('flag + 2'),
            });
    }

    protected static async toFaceXFormat(photo: ArrayBuffer): Promise<Buffer | null> {
        let img: Sharp;
        let metadata: Metadata;

        try {
            img = sharp(photo, { failOnError: false, sequentialRead: true });
            metadata = await img.metadata();
        } catch {
            return null;
        }

        const isJPEG = metadata.format === 'jpeg';
        const sf = metadata.chromaSubsampling;
        const isProgressive = !!metadata.isProgressive;
        const flag = !isJPEG || sf !== '4:2:0' || isProgressive;
        if (flag) {
            img.jpeg({
                progressive: false,
                chromaSubsampling: '4:2:0',
            });
        }

        return img.toBuffer();
    }
}
