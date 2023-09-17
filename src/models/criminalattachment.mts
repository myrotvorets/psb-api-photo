import { Model, type Modifiers, type QueryBuilder } from 'objection';

export class CriminalAttachment extends Model {
    public id!: number;
    public att_id!: number;
    public path!: string;
    public mime_type!: string;

    public static tableName = 'criminal_attachments';

    public static modifiers: Modifiers<QueryBuilder<Model>> = {
        onlyImages(builder): void {
            const { ref } = CriminalAttachment;
            // eslint-disable-next-line no-void
            void builder.where(ref('mime_type'), 'LIKE', 'image/%');
        },
        criminalsAfter(builder, n: number): void {
            const { ref } = CriminalAttachment;
            const idColumn = ref('id');
            // eslint-disable-next-line no-void
            void builder.distinct(idColumn).where(idColumn, '>', n).orderBy(idColumn, 'ASC');
        },
        byId(builder, id: number): void {
            const { ref } = CriminalAttachment;
            // eslint-disable-next-line no-void
            void builder.where(ref('id'), id).orderBy(ref('sort_order'), 'ASC');
        },
        byAttachmentId(builder, attId: number): void {
            const { ref } = CriminalAttachment;
            // eslint-disable-next-line no-void
            void builder.where(ref('att_id'), attId);
        },
    };
}
