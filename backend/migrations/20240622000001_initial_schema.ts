import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).unique().notNullable();
    table.string('username', 100).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('threads_username', 100);
    table.text('threads_password_encrypted');
    table.text('threads_session_token');
    table.string('timezone', 50).defaultTo('UTC');
    table.jsonb('notification_preferences').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.boolean('is_active').defaultTo(true);
    table.integer('login_attempts').defaultTo(0);
    table.timestamp('locked_until');
  });

  await knex.schema.createTable('posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('caption').notNullable();
    table.specificType('media_urls', 'text[]').defaultTo('{}');
    table.timestamp('scheduled_time').notNullable();
    table.timestamp('published_time');
    table.string('status', 20).defaultTo('scheduled');
    table.integer('retry_count').defaultTo(0);
    table.text('last_error');
    table.string('threads_post_id', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
    table.index(['status']);
    table.index(['scheduled_time']);
    table.index(['user_id', 'status']);
  });

  await knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.string('job_type', 50);
    table.string('status', 20).defaultTo('pending');
    table.integer('attempt_number').defaultTo(1);
    table.timestamp('next_retry_time');
    table.text('error_message');
    table.jsonb('execution_logs').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['post_id']);
    table.index(['status']);
    table.index(['next_retry_time']);
  });

  await knex.schema.createTable('activity_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.uuid('post_id').references('id').inTable('posts');
    table.string('action', 50);
    table.jsonb('details');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
    table.index(['created_at']);
  });

  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('post_id').references('id').inTable('posts');
    table.string('type', 50).notNullable();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.boolean('read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'read']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('activity_logs');
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('posts');
  await knex.schema.dropTableIfExists('users');
}
