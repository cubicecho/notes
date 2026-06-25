import type { Note } from '@/context/NotesContext';
import { useNotes } from '@/context/NotesContext';
import MDEditor from '@uiw/react-md-editor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import '@uiw/react-md-editor/markdown-editor.css';

const SAVE_DELAY_MS = 1500;

interface MarkdownEditorProps {
  note: Note;
}

function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0] ?? '';
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled';
}

export function MarkdownEditor({ note }: MarkdownEditorProps) {
  const { updateNote } = useNotes();

  // The editor owns its text while mounted; note.content only seeds it. Binding
  // the editor directly to server content would revert each keystroke (and jump
  // the cursor) every time the debounced save round-trips back through the cache.
  const [value, setValue] = useState(note.content);

  const pendingRef = useRef<{ content: string; title: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hold the latest save logic in a ref so the unmount handler stays stable and
  // doesn't re-run (and save) whenever updateNote's identity changes.
  const flushRef = useRef<() => void>(() => {});
  flushRef.current = () => {
    if (!pendingRef.current) return;
    const { content, title } = pendingRef.current;
    pendingRef.current = null;
    updateNote(note.id, { content, title });
  };

  const handleChange = useCallback((next?: string) => {
    const content = next ?? '';
    setValue(content);
    pendingRef.current = { content, title: extractTitle(content) };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flushRef.current(), SAVE_DELAY_MS);
  }, []);

  // Flush any pending edit when navigating away (component unmount).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flushRef.current();
    };
  }, []);

  if (Platform.OS !== 'web') {
    // TODO: replace with a native-compatible MD editor when targeting native
    return null;
  }

  return (
    // Anchor to the viewport (minus the h-12 navbar) so the editor fills the
    // page. A percentage height would collapse here: expo-router's <Slot/>
    // screen wrapper between <main> and this component has no definite height
    // for `height:100%` to resolve against.
    <div
      className="md-editor-fill flex flex-col"
      data-color-mode="auto"
      style={{ height: 'calc(100vh - 3rem)' }}
    >
      <MDEditor
        value={value}
        onChange={handleChange}
        height="100%"
        preview="live"
        visibleDragbar={false}
        style={{ flex: 1, borderRadius: 0, border: 'none' }}
      />
    </div>
  );
}
