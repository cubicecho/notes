import type { Note } from '@/context/NotesContext';
import { useNotes } from '@/context/NotesContext';
import MDEditor from '@uiw/react-md-editor';
import { useCallback, useEffect, useRef } from 'react';
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
  const pendingRef = useRef<{ content: string; title: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (!pendingRef.current) return;
    const { content, title } = pendingRef.current;
    pendingRef.current = null;
    updateNote(note.id, { content, title });
  }, [note.id, updateNote]);

  // Save when navigating away (component unmount)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, [flush]);

  function handleChange(value?: string) {
    const content = value ?? '';
    const title = extractTitle(content);
    pendingRef.current = { content, title };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  if (Platform.OS !== 'web') {
    // TODO: replace with a native-compatible MD editor when targeting native
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full" data-color-mode="auto">
      <MDEditor
        value={note.content}
        onChange={handleChange}
        height="100%"
        preview="live"
        visibleDragbar={false}
        style={{ flex: 1, borderRadius: 0, border: 'none' }}
      />
    </div>
  );
}
