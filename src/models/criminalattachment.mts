import type { Knex } from 'knex';

interface CriminalAttachment {
    id: number;
    att_id: number;
    path: string;
    mime_type: string;
}

interface ModelOptions {
    db: Knex<CriminalAttachment, CriminalAttachment[]>;
}

export class CriminalAttachmentModel {
    public static readonly tableName = 'criminal_attachments';

    private readonly db: Knex<CriminalAttachment, CriminalAttachment[]>;

    public constructor({ db }: ModelOptions) {
        this.db = db;
    }

    public criminalsAfter(n: number, count: number): Promise<Pick<CriminalAttachment, 'id'>[]> {
        return this.db(CriminalAttachmentModel.tableName)
            .distinct('id')
            .where('id', '>', n)
            .where('mime_type', 'LIKE', 'image/%')
            .orderBy('id', 'asc')
            .limit(count);
    }

    public byId(id: number): Promise<Pick<CriminalAttachment, 'att_id' | 'path' | 'mime_type'>[]> {
        return this.db(CriminalAttachmentModel.tableName)
            .select('att_id', 'path', 'mime_type')
            .where('id', id)
            .where('mime_type', 'LIKE', 'image/%')
            .orderBy('sort_order', 'asc');
    }

    public byAttachmentId(attId: number): Promise<Pick<CriminalAttachment, 'path' | 'mime_type'> | undefined> {
        return this.db(CriminalAttachmentModel.tableName)
            .select('path', 'mime_type')
            .where('att_id', attId)
            .where('mime_type', 'LIKE', 'image/%')
            .first();
    }
}

declare module 'knex/types/tables.js' {
    interface Tables {
        [CriminalAttachmentModel.tableName]: CriminalAttachment;
    }
}
