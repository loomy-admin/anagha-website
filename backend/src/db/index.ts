import 'dotenv/config';
import { Pool, type QueryResultRow } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const connectionString = String(process.env.DATABASE_URL || '').trim();
if (!connectionString) {
  console.error(
    '[db] DATABASE_URL is not set. Add it on Cloud Run → Edit & deploy → Variables. The process will still listen on PORT.',
  );
}

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://127.0.0.1:9/unset',
  max: 10,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });

/** Tagged-template SQL helper (same interpolation style as the old Neon HTTP client). */
export async function sql<T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const params: unknown[] = [];
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  }
  const result = await pool.query<T>(text, params);
  return result.rows;
}
