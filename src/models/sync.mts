import type { Knex } from 'knex';

export const enum SyncFlag {
    ADD_PHOTO = 0,
    DEL_PHOTO = 1,
    FAILED_ADD = 2,
    FAILED_DEL = 3,
}

interface Sync {
    id: number;
    att_id: number;
    criminal_id: number;
    path: string;
    flag: SyncFlag;
}

interface ModelOptions {
    db: Knex<Sync, Sync[]>;
}

interface StatsByFlag {
    flag: SyncFlag;
    count: number;
}

export class SyncModel {
    public static readonly tableName = 'criminal_attachments_log_n';

    private readonly db: Knex<Sync, Sync[]>;

    public constructor({ db }: ModelOptions) {
        this.db = db;
    }

    public getPhotoToSync(): Promise<Sync | undefined> {
        return this.db(SyncModel.tableName).where('flag', '<', SyncFlag.FAILED_ADD).orderBy('id').first();
    }

    public findByCriminalId(cid: number): Promise<Sync[]> {
        return this.db(SyncModel.tableName).where('criminal_id', cid);
    }

    public getCriminalsToSync(after: number, count: number): Promise<number[]> {
        return this.db(SyncModel.tableName)
            .distinct('criminal_id')
            .where('criminal_id', '>', after)
            .orderBy('criminal_id', 'asc')
            .limit(count)
            .pluck('criminal_id');
    }

    public markCriminalSynced(cid: number): Promise<number> {
        return this.db(SyncModel.tableName).where('criminal_id', cid).delete();
    }

    public markEntrySynced(id: number, success: boolean): Promise<number> {
        const qb = this.db(SyncModel.tableName).where('id', id);
        if (success) {
            return qb.delete();
        }

        return qb.update({
            flag: this.db.raw('flag + 2'),
        });
    }

    public statsByFlag(): Promise<StatsByFlag[]> {
        return this.db(SyncModel.tableName).select('flag').count({ count: '*' }).groupBy('flag');
    }

    public countQueuedSuspects(): Promise<number[]> {
        return this.db(SyncModel.tableName)
            .countDistinct({ count: 'criminal_id' })
            .where('flag', '<', SyncFlag.FAILED_ADD)
            .pluck('count');
    }
}

declare module 'knex/types/tables.js' {
    interface Tables {
        [SyncModel.tableName]: Sync;
    }
}
