import type { Note } from '@/context/NotesContext';
import { formatDistanceToNow } from 'date-fns';

/** Where a note is edited. */
export function notePath(id: string): `/notes/${string}` {
  return `/notes/${id}`;
}

/** A note's name in a list: its title, or "Untitled" before it has one. */
export function noteLabel(note: Note): string {
  return note.title.trim() || 'Untitled';
}

/** "Edited 3 minutes ago", for a list row's meta. */
export function noteEditedAgo(note: Note): string {
  return `Edited ${formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}`;
}
