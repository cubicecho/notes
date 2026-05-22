import type { DB } from '@cubicecho/notes-db';

export interface Context {
  db: DB;
  userId?: string;
}
