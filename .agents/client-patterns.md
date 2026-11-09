# Client Patterns — CubicEcho Notes

## Expo Router

File-based routing under `app/app/`. Groups use `(name)` directories.

```
app/_layout.tsx          ← Root layout (providers)
app/index.tsx            ← Redirect to /(app)
app/(app)/_layout.tsx    ← Web sidebar + native Slot
app/(app)/index.tsx      ← Empty state
app/(app)/notes/[noteId].tsx  ← Note editor
```

Navigation always uses Expo Router hooks — never direct `window.location`:

```tsx
import { useRouter, useLocalSearchParams, useSegments } from 'expo-router';

const router = useRouter();
router.push('/(app)/notes/some-id');

const { noteId } = useLocalSearchParams<{ noteId: string }>();
```

## App Shell

`(app)/_layout.tsx` is cubeui's `SidebarLayout` with `sidebarHideBelow="md"`:
from `md` up the rail (`components/domain/navigation/AppSidebar.tsx` — brand,
workspace picker, the notes, Settings and Sign out) sits beside the screen; on
a phone an `AppBar` with Notes / Settings links and a New note button stands in
for it, and the Notes screen (`(app)/index.tsx`) is the list. Each screen is a
`PageLayout` (or the editor, which fills the pane).

## NotesContext

All note CRUD lives in `src/context/NotesContext.tsx`. Backed by the GraphQL
server via Apollo (`useQuery`/`useMutation`), scoped to the active workspace:
the personal workspace queries `myNotes` (the user's personal org), an org
workspace queries `note(where: { orgId })`. CRUD calls are `async`. Import the
hook anywhere inside `<NotesProvider>`:

```tsx
import { useNotes } from '@/context/NotesContext';

const { notes, loading, createNote, updateNote, deleteNote } = useNotes();

// Create a new note and navigate to it. Pass the author userId; the note's org
// is chosen automatically (active org workspace, or the user's personal org).
const note = await createNote(user.id);
router.push(`/(app)/notes/${note.id}`);

// Update content (title is auto-extracted from first heading)
await updateNote(note.id, { content: '# Hello\n\nWorld' });

// Delete
await deleteNote(note.id);
```

Mutations scope their `where` clause by `orgId` so the server's CASL check
(which reads `orgId` off the where clause) can authorize them. Queries skip
until auth has resolved (`!authLoading && user`) so the request carries a token.

## Note Interface

```typescript
interface Note {
  id: string;
  title: string;        // extracted from first heading or first line
  content: string;      // raw Markdown
  userId: string;       // author
  orgId?: string | null; // owning org (personal org for personal notes)
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601 — updated on every content change
}
```

## MarkdownEditor

`src/components/domain/editor/MarkdownEditor.tsx` wraps `@uiw/react-md-editor`.

- Web only (`Platform.OS !== 'web'` returns null)
- Split pane by default (`preview="live"`)
- Title is extracted from the first `# Heading` or first line of content
- On every change, calls `updateNote(id, { content, title })`

```tsx
<MarkdownEditor note={note} />
```

**TODO:** Add a WYSIWYG mode toggle (see `.agents/todo.md`).

## NativeWind / Tailwind

NativeWind 5 (`5.0.0-rc.0`, pinned exactly) over `react-native-css`
`3.1.0-rc.0`, with Tailwind 4 through `postcss.config.mjs`. There is no
`tailwind.config`: the theme is `cubeui-tokens.css` (from `@cubeui/tokens`,
generated — never edit it), imported by `global.css`. `app/patches/` holds
cubeui's `react-native-css` patch, applied by the app's `postinstall`; without
it opacity classes draw black on device.

```tsx
<View className="flex-1 bg-background" />
<Text className="text-sm text-foreground/60" />
```

Theme: cubeui's `ThemePicker` / `useThemePreference` (stored under
`cubeui-theme`; the old `cubicecho_theme` key is migrated). `public/index.html`
paints the stored theme before the bundle loads.

## Apollo Client

Configured in `src/apollo-client.ts`. Points at `http://localhost:4000/graphql`.
`NotesContext` reads and writes through it (`myNotes`/`note` queries,
`createNote`/`updateNotes`/`deleteNotes` mutations).

Auth flows through `AuthContext` (magic-link login). The bearer token is loaded
from storage asynchronously, so queries that depend on it skip until auth
resolves. `AuthContext` also exposes `personalOrgId` (from `me { personalOrg { id } }`),
which `NotesContext` uses as the target org for personal notes.

## cubeui components

The app installs from cubeui's native registry (`app/components.json`):
`npx shadcn@latest add @cubeui/<item>` from `app/`. Shells land in
`src/components/*.tsx`, primitives in `src/components/ui/`, helpers in
`src/lib/`. They are registry copies: do not edit them (biome skips them) —
reinstall to update. App code lives in `src/components/domain/`. No cubeui
component takes children; the body is `contentSlot`.

- `domain/query/load-state.tsx` — cubeui's `LoadState` over an Apollo result.

## CSS Imports in Expo Router

`global.css` is imported once, in `app/_layout.tsx`.
