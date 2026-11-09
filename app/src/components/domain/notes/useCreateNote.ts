import { useAuth } from '@/context/AuthContext';
import { useNotes } from '@/context/NotesContext';
import { notePath } from '@/lib/notes';
import { useRouter } from 'expo-router';
import { useState } from 'react';

/** Creates a note in the current workspace and opens it. */
export function useCreateNote() {
  const { createNote } = useNotes();
  const { user } = useAuth();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!user) {
      return;
    }
    setCreating(true);
    try {
      const note = await createNote(user.id);
      router.push(notePath(note.id));
    } finally {
      setCreating(false);
    }
  }

  return { create, creating, canCreate: user != null };
}
