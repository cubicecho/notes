import { useMutation, useQuery } from '@apollo/client/react';
import { createContext, useCallback, useContext } from 'react';
import { graphql } from '../__generated__/index.js';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';

// ---------------------------------------------------------------------------
// GraphQL operations
// ---------------------------------------------------------------------------

export const MY_NOTES = graphql(`
  query MyNotes {
    myNotes {
      id
      title
      content
      userId
      orgId
      updatedAt
      createdAt
    }
  }
`);

const ORG_NOTES = graphql(`
  query OrgNotes($orgId: String!) {
    note(where: { orgId: { eq: $orgId } }) {
      id
      title
      content
      userId
      orgId
      updatedAt
      createdAt
    }
  }
`);

const CREATE_NOTE = graphql(`
  mutation CreateNote($userId: String!, $orgId: String!) {
    createNote(values: { userId: $userId, orgId: $orgId, title: "Untitled", content: "" }) {
      id
      title
      content
      userId
      orgId
      updatedAt
      createdAt
    }
  }
`);

const UPDATE_NOTE = graphql(`
  mutation UpdateNote($where: NoteFilters!, $title: String, $content: String) {
    updateNotes(set: { title: $title, content: $content }, where: $where) {
      id
      title
      content
      updatedAt
    }
  }
`);

const DELETE_NOTE = graphql(`
  mutation DeleteNote($where: NoteFilters!) {
    deleteNotes(where: $where) {
      id
    }
  }
`);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  orgId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotesContextValue {
  notes: Note[];
  loading: boolean;
  createNote: (userId: string) => Promise<Note>;
  updateNote: (
    id: string,
    patch: Partial<Pick<Note, 'title' | 'content'>>,
  ) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refetch: () => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const { workspace } = useWorkspace();
  const { user, personalOrgId, loading: authLoading } = useAuth();

  const isOrg = workspace.type === 'org';

  // Don't fetch notes until auth has resolved and a user is present. The token
  // is loaded from storage asynchronously and Apollo reads it synchronously when
  // building the request; firing these queries early sends an unauthenticated
  // request that returns an empty list which never recovers. Once `user` is set,
  // skip flips to false and Apollo runs the query with the token attached.
  const authReady = !authLoading && !!user;

  const personalQuery = useQuery(MY_NOTES, {
    skip: isOrg || !authReady,
    fetchPolicy: 'cache-and-network',
  });

  const orgQuery = useQuery(ORG_NOTES, {
    skip: !isOrg || !authReady,
    variables: { orgId: isOrg ? workspace.id : '' },
    fetchPolicy: 'cache-and-network',
  });

  const [createNoteMut] = useMutation(CREATE_NOTE);
  const [updateNoteMut] = useMutation(UPDATE_NOTE);
  const [deleteNoteMut] = useMutation(DELETE_NOTE);

  const rawNotes = isOrg ? orgQuery.data?.note : personalQuery.data?.myNotes;
  // Surface auth loading as notes loading so consumers show a spinner (rather
  // than "No notes yet") while we wait for auth. A skipped query reports
  // loading:false, so this gap must be filled explicitly.
  const loading =
    authLoading || (isOrg ? orgQuery.loading : personalQuery.loading);

  const notes: Note[] = (rawNotes ?? []).map((n) => ({
    id: n.id,
    title: n.title ?? 'Untitled',
    content: n.content ?? '',
    userId: n.userId,
    orgId: n.orgId ?? null,
    createdAt: n.createdAt as string,
    updatedAt: n.updatedAt as string,
  }));

  const refetch = useCallback(() => {
    if (isOrg) orgQuery.refetch();
    else personalQuery.refetch();
  }, [isOrg, orgQuery, personalQuery]);

  const createNote = useCallback(
    async (userId: string): Promise<Note> => {
      // Every note lives in an org: the active org workspace, or the user's
      // personal org for personal notes.
      const orgId = isOrg ? workspace.id : personalOrgId;
      if (!orgId) {
        throw new Error('No org to create the note in');
      }
      const { data } = await createNoteMut({
        variables: { userId, orgId },
      });
      const n = data?.createNote;
      if (!n) throw new Error('Create note failed');
      refetch();
      return {
        id: n.id,
        title: n.title ?? 'Untitled',
        content: n.content ?? '',
        userId: n.userId,
        orgId: n.orgId ?? null,
        createdAt: n.createdAt as string,
        updatedAt: n.updatedAt as string,
      };
    },
    [isOrg, workspace, personalOrgId, createNoteMut, refetch],
  );

  const updateNote = useCallback(
    async (id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => {
      // Scope the update by the note's ownership so the server's CASL
      // permission check (which reads userId/orgId off the where clause) can
      // authorize it; this also constrains the DB update to the matching row.
      const note = notes.find((n) => n.id === id);
      const where = note?.orgId
        ? { id: { eq: id }, orgId: { eq: note.orgId } }
        : { id: { eq: id }, userId: { eq: note?.userId } };
      await updateNoteMut({ variables: { where, ...patch } });
    },
    [updateNoteMut, notes],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      // Scope the delete by the note's org so the server's CASL check (which
      // reads orgId off the where clause) can authorize it.
      const note = notes.find((n) => n.id === id);
      const where = note?.orgId
        ? { id: { eq: id }, orgId: { eq: note.orgId } }
        : { id: { eq: id } };
      await deleteNoteMut({ variables: { where } });
      refetch();
    },
    [deleteNoteMut, refetch, notes],
  );

  return (
    <NotesContext.Provider
      value={{ notes, loading, createNote, updateNote, deleteNote, refetch }}
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
