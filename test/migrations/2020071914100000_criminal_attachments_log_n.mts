import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const exists: boolean = await knex.schema.hasTable('criminal_attachments');
    if (!exists) {
        await knex.schema.createTable('criminal_attachments_log_n', function (table: Knex.CreateTableBuilder): void {
            table.bigIncrements('id').unsigned().notNullable();
            table.bigInteger('criminal_id').unsigned().notNullable();
            table.bigInteger('att_id').unsigned().notNullable();
            table.string('path', 4096).notNullable();
            table.integer('flag').unsigned().notNullable();
            table.integer('dt').unsigned().notNullable();

            table.index(['dt'], 'idx_sync_n_dt');
            table.index(['criminal_id'], 'idx_sync_n_criminal_id');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error(`Refusing to run this in ${process.env.NODE_ENV} environment`);
    }

    await knex.schema.dropTableIfExists('criminal_attachments_log_n');
}
