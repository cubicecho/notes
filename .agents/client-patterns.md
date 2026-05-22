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

## Platform-Specific Layout

The `(app)/_layout.tsx` renders different layouts per platform:

```tsx
if (Platform.OS === 'web') return <WebLayout />;
return <NativeLayout />;
```

`WebLayout` uses raw `<div>` / `<aside>` / `<main>` with Tailwind classes.
`NativeLayout` uses `<Slot />` only (sidebar nav TBD for native).

## NotesContext

All note CRUD lives in `src/context/NotesContext.tsx`. Backed by localStorage
on web. Import the hook anywhere inside `<NotesProvider>`:

```tsx
import { useNotes } from '@/context/NotesContext';

const { notes, createNote, updateNote, deleteNote } = useNotes();

// Create a new note and navigate to it
const note = createNote();           // returns the new Note with id
router.push(`/(app)/notes/${note.id}`);

// Update content (title is auto-extracted from first heading)
updateNote(note.id, { content: '# Hello\n\nWorld' });

// Delete
deleteNote(note.id);
```

localStorage key: `cubicecho_notes` — stores `Note[]` as JSON.

## Note Interface

```typescript
interface Note {
  id: string;           // crypto.randomUUID()
  title: string;        // extracted from first heading or first line
  content: string;      // raw Markdown
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

Use Tailwind utility classes on all React Native components via NativeWind.
CSS custom properties (shadcn theme vars) are defined in `src/index.css`.

```tsx
<View className="flex-1 bg-background text-foreground" />
<Text className="text-sm text-muted-foreground" />
```

Dark mode: add `dark` class to `<html>` (web). NativeWind handles native.

## Apollo Client

Configured in `src/apollo-client.ts`. Points at `http://localhost:4000/graphql`.
For MVP, the client does **not** query the server — all data comes from
`NotesContext` + localStorage. The Apollo setup is ready for when the server is
wired up.

Auth token is the `DEMO_USER_ID` constant (no login flow in MVP).

## shadcn UI Components

Primitives live in `src/components/ui/`. Currently:

- `button.tsx` — `<Button variant="ghost" size="icon">…</Button>`

Add new components by copying the shadcn recipe into `src/components/ui/` and
adapting `Pressable`/`Text` for React Native Web.

## CSS Imports in Expo Router

Import CSS files in the layout that needs them, not in every component:

```tsx
// app/_layout.tsx
import '../src/index.css';
import '../global.css';
```
