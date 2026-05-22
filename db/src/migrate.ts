import { db } from './index.ts';

await db;
console.log('Migrations complete');
process.exit(0);
