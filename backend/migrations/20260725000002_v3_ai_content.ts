import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('generated_captions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('topic', 500).notNullable();
    table.string('tone', 50).defaultTo('casual');
    table.string('length_pref', 20).defaultTo('medium');
    table.text('generated_text').notNullable();
    table.string('provider', 50);
    table.integer('tokens_used').defaultTo(0);
    table.integer('cost_cents').defaultTo(0);
    table.integer('generation_time_ms');
    table.boolean('is_approved').defaultTo(false);
    table.jsonb('validation').defaultTo('{}');
    table.timestamp('used_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'created_at']);
  });

  await knex.schema.createTable('brand_guidelines', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.text('voice_description');
    table.text('example_caption');
    table.string('tone_preference', 100);
    table.string('hashtag_defaults', 500);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('posting_heatmap', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('day_of_week', 3).notNullable();
    table.integer('hour_of_day').notNullable();
    table.integer('total_engagement').defaultTo(0);
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['day_of_week', 'hour_of_day']);
  });

  await knex('brand_guidelines').insert({
    name: 'DN Tech Default',
    voice_description:
      'Casual but professional, tech-forward, generous with knowledge sharing, innovation-focused. Not meme-y. Speak like a builder sharing real lessons.',
    example_caption:
      '🚀 Just shipped a feature that saves our team 2 hours/day. The irony: we built it because we were tired of the busywork. What would you automate first? #dntech #buildinpublic #product',
    tone_preference: 'casual',
    hashtag_defaults: '#dntech #threads #buildinpublic',
    is_active: true,
  });

  // Seed reasonable default peak windows (Threads evening engagement heuristic)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rows: Array<{ day_of_week: string; hour_of_day: number; total_engagement: number }> = [];
  for (const day of days) {
    for (let hour = 0; hour < 24; hour++) {
      let score = 5;
      if (hour >= 14 && hour <= 20) score = 40 + (hour === 18 || hour === 19 ? 30 : 0);
      if (day === 'Wed' || day === 'Thu') score += 10;
      rows.push({ day_of_week: day, hour_of_day: hour, total_engagement: score });
    }
  }
  await knex('posting_heatmap').insert(rows);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('posting_heatmap');
  await knex.schema.dropTableIfExists('brand_guidelines');
  await knex.schema.dropTableIfExists('generated_captions');
}
