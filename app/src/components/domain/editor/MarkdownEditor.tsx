import type { Note } from '@/context/NotesContext';
import { useNotes } from '@/context/NotesContext';
import MDEditor from '@uiw/react-md-editor';
import { Platform } from 'react-native';
import '@uiw/react-md-editor/markdown-editor.css';

interface MarkdownEditorProps {
  note: Note;
}

function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0] ?? '';
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled';
}

export function MarkdownEditor({ note }: MarkdownEditorProps) {
  const { updateNote } = useNotes();

  function handleChange(value?: string) {
    const content = value ?? '';
    const title = extractTitle(content);
    updateNote(note.id, { content, title });
  }

  if (Platform.OS !== 'web') {
    // TODO: replace with a native-compatible MD editor when targeting native
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full" data-color-mode="light">
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
