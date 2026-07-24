import knex, { Knex } from 'knex';
import { env } from './env';

export const db: Knex = knex({
  client: 'postgresql',
  connection: env.databaseUrl,
  pool: { min: 2, max: env.databasePoolSize },
});

export default db;
