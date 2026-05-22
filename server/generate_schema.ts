import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '@cubicecho/notes-db';
import { printSchema } from 'graphql';
import { buildAppSchema } from './src/schema/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, 'src/__generated__/schema.graphql');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, printSchema(buildAppSchema(db)));
console.log('schema.graphql written');
