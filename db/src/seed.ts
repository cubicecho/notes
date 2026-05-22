import type { DB } from './index.ts';
import { notes, users } from './schema.ts';

const DEMO_USER_ID =
  process.env.DEMO_USER_ID ?? '00000000-0000-0000-0000-000000000001';

export async function seedDemoUser(db: DB) {
  await db
    .insert(users)
    .values({ id: DEMO_USER_ID, email: 'demo@example.com' })
    .onConflictDoNothing();
}

export async function seedDemoData(db: DB) {
  await seedDemoUser(db);

  await db
    .insert(notes)
    .values([
      {
        userId: DEMO_USER_ID,
        title: 'Welcome to Notes',
        content:
          '# Welcome to Notes\n\nThis is your first note. Edit it or create a new one from the sidebar.',
      },
      {
        userId: DEMO_USER_ID,
        title: 'Markdown cheatsheet',
        content:
          '# Markdown Cheatsheet\n\n## Headings\n\n# H1\n## H2\n### H3\n\n## Emphasis\n\n**bold** _italic_ ~~strikethrough~~\n\n## Lists\n\n- item one\n- item two\n  - nested\n\n1. first\n2. second\n\n## Code\n\n`inline code`\n\n```js\nconsole.log("block code");\n```\n\n## Links\n\n[example](https://example.com)\n',
      },
    ])
    .onConflictDoNothing();
}
