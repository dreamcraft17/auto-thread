import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || 'postgresql://threads:threads@localhost:5432/threads_automation',
    pool: { min: 2, max: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10) },
    migrations: { directory: './migrations', extension: 'ts' },
    seeds: { directory: './seeds', extension: 'ts' },
  },
};

export default config;
