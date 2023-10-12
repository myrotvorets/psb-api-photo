import { Model, type Modifier, type QueryBuilder } from 'objection';

export const enum SyncFlag {
    ADD_PHOTO = 0,
    DEL_PHOTO = 1,
    FAILED_ADD = 2,
    FAILED_DEL = 3,
}

type SyncModifiers = Record<'getPhotoToSync' | 'findByCriminalId' | 'getCriminalsToSync', Modifier<QueryBuilder<Sync>>>;

export class Sync extends Model {
    public id!: number;
    public att_id!: number;
    public criminal_id!: number;
    public path!: string;
    public flag!: SyncFlag;

    public static override tableName = 'criminal_attachments_log_n';

    public static override modifiers: SyncModifiers = {
        getPhotoToSync(builder): void {
            const { ref } = Sync;
            void builder.where(ref('flag'), '<', SyncFlag.FAILED_ADD).orderBy(ref('id')).limit(1);
        },
        findByCriminalId(builder, cid: number): void {
            const { ref } = Sync;
            void builder.where(ref('criminal_id'), cid);
        },
        getCriminalsToSync(builder, after: number): void {
            const { ref } = Sync;
            const cidField = ref('criminal_id');
            void builder.distinct(cidField).where(cidField, '>', after).orderBy(cidField, 'asc');
        },
    };
}
