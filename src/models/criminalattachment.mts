import { Model, type Modifier, type QueryBuilder } from 'objection';

type CriminalAttachmentModifiers = Record<
    'onlyImages' | 'criminalsAfter' | 'byId' | 'byAttachmentId',
    Modifier<QueryBuilder<CriminalAttachment>>
>;

export class CriminalAttachment extends Model {
    public id!: number;
    public att_id!: number;
    public path!: string;
    public mime_type!: string;

    public static override tableName = 'criminal_attachments';

    public static override modifiers: CriminalAttachmentModifiers = {
        onlyImages(builder): void {
            const { ref } = CriminalAttachment;
            void builder.where(ref('mime_type'), 'LIKE', 'image/%');
        },
        criminalsAfter(builder, n: number): void {
            const { ref } = CriminalAttachment;
            const idColumn = ref('id');
            void builder.distinct(idColumn).where(idColumn, '>', n).orderBy(idColumn, 'ASC');
        },
        byId(builder, id: number): void {
            const { ref } = CriminalAttachment;
            void builder.where(ref('id'), id).orderBy(ref('sort_order'), 'ASC');
        },
        byAttachmentId(builder, attId: number): void {
            const { ref } = CriminalAttachment;
            void builder.where(ref('att_id'), attId);
        },
    } as const;
}
