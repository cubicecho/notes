import { useCreateNote } from '@/components/domain/notes/useCreateNote';
import { LoadState } from '@/components/domain/query/load-state';
import { WorkspacePicker } from '@/components/domain/workspace/WorkspacePicker';
import { EmptyState } from '@/components/empty-state';
import { List } from '@/components/list';
import { ListItem } from '@/components/list-item';
import { PageLayout } from '@/components/page-layout';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from '@/components/ui/icons';
import { useNotes } from '@/context/NotesContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { noteEditedAgo, noteLabel, notePath } from '@/lib/notes';
import { Link } from 'expo-router';

/** Every note in the workspace, newest edit first as the server sends them. */
export default function NotesScreen() {
  const { notes, loading, error, refetch } = useNotes();
  const { workspace } = useWorkspace();
  const { create, creating, canCreate } = useCreateNote();

  const newNote = (
    <Button
      iconSlot={<Plus />}
      content="New note"
      loading={creating}
      disabled={!canCreate}
      onPress={() => void create()}
    />
  );

  return (
    <PageLayout
      title="Notes"
      description={
        workspace.type === 'org' ? workspace.name : 'Your personal notes'
      }
      actionSlot={newNote}
      headerContentSlot={<WorkspacePicker className="md:max-w-xs" />}
      contentSlot={
        <>
          <LoadState
            query={{
              loading,
              error,
              refetch,
              data: loading && notes.length === 0 ? undefined : notes,
            }}
            what="your notes"
            count={notes.length}
            emptySlot={
              <EmptyState
                iconSlot={<FileText />}
                title="No notes yet"
                description="A note's first line is its title."
                actionSlot={newNote}
              />
            }
          />
          <List
            label="Notes"
            contentSlot={notes.map((note) => (
              <ListItem
                key={note.id}
                title={noteLabel(note)}
                meta={noteEditedAgo(note)}
                linkSlot={<Link href={notePath(note.id)} />}
              />
            ))}
          />
        </>
      }
    />
  );
}
