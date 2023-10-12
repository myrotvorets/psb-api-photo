import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const exists: boolean = await knex.schema.hasTable('criminal_attachments');
    if (!exists) {
        await knex.schema.createTable('criminal_attachments', function (table: Knex.CreateTableBuilder): void {
            table.bigInteger('id').unsigned().notNullable();
            table.bigInteger('att_id').unsigned().notNullable().unique({ indexName: 'idx_criminal_atts_att_id' });
            table.string('path', 4096).notNullable();
            table.string('mime_type', 100).notNullable();
            table.integer('sort_order').unsigned().notNullable();

            table.index(['id', 'sort_order'], 'idx_criminal_atts_id_order');
            table.primary(['id', 'att_id']);
        });
    }
}

export function down(knex: Knex): Promise<unknown> {
    if (process.env['NODE_ENV'] !== 'test') {
        throw new Error(`Refusing to run this in ${process.env['NODE_ENV']} environment`);
    }

    return knex.schema.dropTableIfExists('criminal_attachments');
}
