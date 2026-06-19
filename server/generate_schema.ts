import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '@cubicecho/notes-db';
import { printSchema } from 'graphql';
import { buildBaseSchema } from './src/schema/base.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, 'src/__generated__/schema.graphql');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, printSchema(buildBaseSchema(db)));
console.log('schema.graphql written');
