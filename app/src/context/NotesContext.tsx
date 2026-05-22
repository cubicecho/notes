import { useMutation, useQuery } from '@apollo/client/react';
import { createContext, useCallback, useContext } from 'react';
import { graphql } from '../__generated__/index.js';
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
  mutation CreateNote($userId: String!, $orgId: String) {
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
  mutation UpdateNote($id: String!, $title: String, $content: String) {
    updateNotes(
      set: { title: $title, content: $content }
      where: { id: { eq: $id } }
    ) {
      id
      title
      content
      updatedAt
    }
  }
`);

const DELETE_NOTE = graphql(`
  mutation DeleteNote($id: String!) {
    deleteNotes(where: { id: { eq: $id } }) {
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

  const isOrg = workspace.type === 'org';

  const personalQuery = useQuery(MY_NOTES, {
    skip: isOrg,
    fetchPolicy: 'cache-and-network',
  });

  const orgQuery = useQuery(ORG_NOTES, {
    skip: !isOrg,
    variables: { orgId: isOrg ? workspace.id : '' },
    fetchPolicy: 'cache-and-network',
  });

  const [createNoteMut] = useMutation(CREATE_NOTE);
  const [updateNoteMut] = useMutation(UPDATE_NOTE);
  const [deleteNoteMut] = useMutation(DELETE_NOTE);

  const rawNotes = isOrg ? orgQuery.data?.note : personalQuery.data?.myNotes;
  const loading = isOrg ? orgQuery.loading : personalQuery.loading;

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
      const orgId = isOrg ? workspace.id : undefined;
      const { data } = await createNoteMut({
        variables: { userId, orgId: orgId ?? null },
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
    [isOrg, workspace, createNoteMut, refetch],
  );

  const updateNote = useCallback(
    async (id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => {
      await updateNoteMut({ variables: { id, ...patch } });
    },
    [updateNoteMut],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      await deleteNoteMut({ variables: { id } });
      refetch();
    },
    [deleteNoteMut, refetch],
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
