# TODO — CubicEcho Notes

Open features, known issues, and deferred work. Read before starting new features.

---

## In Progress

(none)

---

## Deferred Features

### 1 — WYSIWYG editor mode
The editor currently uses split-pane only (`preview="live"` from `@uiw/react-md-editor`).
Add a toolbar toggle to switch between split-pane and a WYSIWYG/rich-text mode.
Candidate library: MDXEditor (heavier bundle but full WYSIWYG support).

### 2 — Real GraphQL server wiring
The server and DB are scaffolded. Wire up:
- `myNotes` query (list notes for current user)
- `myCreateNote` mutation
- `myUpdateNote` mutation
- `myDeleteNote` mutation
Replace localStorage persistence in `NotesContext` with Apollo cache.

### 3 — Auth (magic-link + JWT)
No login flow in MVP. Follow auto-cal's pattern:
- `requestMagicLink` / `verifyMagicLink` public mutations
- JWT (jose) for token signing
- Auth guard in root layout redirecting to `/auth/login` when no token

### 4 — Electron wrapper
See `electron/README.md`. Main work:
- Electron main process loads `app/dist/` in BrowserWindow
- IPC bridge: `readNoteFromDisk`, `writeNoteToDisk`, `listNotes`
- Replace `NotesContext` storage layer with IPC calls when running in Electron

### 5 — Note search / filter
Add a search input above the sidebar list. Filter by title + content client-side.

### 6 — Keyboard shortcuts
- `Cmd+N` / `Ctrl+N` — create new note
- `Cmd+Delete` / `Ctrl+Backspace` — delete selected note

### 7 — Note deletion with confirmation
Current `deleteNote()` is immediate. Add a confirm dialog (shadcn AlertDialog)
before deleting.

### 8 — Mobile native editor
`MarkdownEditor` returns `null` on native (`Platform.OS !== 'web'`). Add a
React Native-compatible editor (e.g. a styled `TextInput` with live preview in
a `ScrollView`) for the native path.

### 9 — Note sorting options
Currently sorted by `updatedAt` desc. Add a sort control (newest, oldest, A-Z).

### 10 — Export to file
Add a "Download .md" button in the editor toolbar (web only) using a Blob URL.

---

## Known Issues

- `MarkdownEditor` imports `@uiw/react-md-editor/markdown-editor.css` which
  may require `babel-plugin-transform-require-ignore` or a Metro config tweak
  to avoid bundling errors on native. Not a concern until native editor is needed.
