import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { getEnv } from '../config/env.ts';
import * as schema from './schema.ts';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: Database | null = null;

export async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const env = getEnv();
  
  await mkdir(dirname(env.DATABASE_PATH), { recursive: true });

  const sqlite = new Database(env.DATABASE_PATH, { create: true });
  
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA foreign_keys = ON');
  
  sqliteInstance = sqlite;
  dbInstance = drizzle(sqlite, { schema });
  
  return dbInstance;
}

export async function closeDb() {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
  }
}

export function getSqliteInstance(): Database | null {
  return sqliteInstance;
}

export { schema };
