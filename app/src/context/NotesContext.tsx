import { storage } from '@/lib/storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';

const STORAGE_KEY = 'cubicecho_notes';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

type Action =
  | { type: 'LOAD'; notes: Note[] }
  | { type: 'CREATE'; note: Note }
  | {
      type: 'UPDATE';
      id: string;
      patch: Partial<Pick<Note, 'title' | 'content'>>;
    }
  | { type: 'DELETE'; id: string };

function reducer(state: Note[], action: Action): Note[] {
  switch (action.type) {
    case 'LOAD':
      return action.notes;
    case 'CREATE':
      return [action.note, ...state];
    case 'UPDATE':
      return state.map((n) =>
        n.id === action.id
          ? { ...n, ...action.patch, updatedAt: new Date().toISOString() }
          : n,
      );
    case 'DELETE':
      return state.filter((n) => n.id !== action.id);
  }
}

interface NotesContextValue {
  notes: Note[];
  createNote: () => Note;
  updateNote: (
    id: string,
    patch: Partial<Pick<Note, 'title' | 'content'>>,
  ) => void;
  deleteNote: (id: string) => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        dispatch({ type: 'LOAD', notes: JSON.parse(raw) as Note[] });
      } catch {
        // corrupt data — start fresh
      }
    }
  }, []);

  useEffect(() => {
    storage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const createNote = useCallback((): Note => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'CREATE', note });
    return note;
  }, []);

  const updateNote = useCallback(
    (id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => {
      dispatch({ type: 'UPDATE', id, patch });
    },
    [],
  );

  const deleteNote = useCallback((id: string) => {
    dispatch({ type: 'DELETE', id });
  }, []);

  return (
    <NotesContext.Provider
      value={{ notes, createNote, updateNote, deleteNote }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used inside <NotesProvider>');
  return ctx;
}
