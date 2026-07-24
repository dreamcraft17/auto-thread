import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key', 100).unique().notNullable();
    table.text('value');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
  });

  await knex('settings').insert({ key: 'live_publish_enabled', value: 'false' });

  await knex.schema.createTable('publish_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.string('mode', 10).notNullable(); // live | dry-run
    table.string('status', 10).notNullable(); // pending | success | fail
    table.text('error_msg');
    table.string('threads_url', 500);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['post_id']);
    table.index(['user_id']);
    table.index(['timestamp']);
  });

  await knex.schema.createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 100).notNullable();
    table.jsonb('details').defaultTo('{}');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.index(['user_id']);
    table.index(['timestamp']);
  });

  await knex.schema.alterTable('posts', (table) => {
    table.integer('media_count').defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('posts', (table) => {
    table.dropColumn('media_count');
  });
  await knex.schema.dropTableIfExists('audit_log');
  await knex.schema.dropTableIfExists('publish_history');
  await knex.schema.dropTableIfExists('settings');
}
