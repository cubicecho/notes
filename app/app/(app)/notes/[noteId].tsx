import { MarkdownEditor } from '@/components/domain/editor/MarkdownEditor';
import { LoadState } from '@/components/domain/query/load-state';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from '@/components/ui/icons';
import { useNotes } from '@/context/NotesContext';
import { Link, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

export default function NotePage() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const { notes, loading, error, refetch } = useNotes();

  const note = notes.find((n) => n.id === noteId);

  // On first view (deep link / web refresh) the notes query is still in flight,
  // so `note` is undefined even though it exists. Wait for the fetch before
  // deciding the note is missing, otherwise we flash "Note not found."
  if (!note) {
    return (
      <View className="flex-1 justify-center bg-background p-4">
        <LoadState
          query={{
            loading,
            error,
            refetch,
            data: loading ? undefined : notes,
          }}
          what="this note"
          record={note}
          notFoundLabel="Note not found"
          description="It may have been deleted, or it is in another workspace."
          actionSlot={
            <Button
              variant="outline"
              iconSlot={<ArrowLeft />}
              content="Back to notes"
              linkSlot={<Link href="/" />}
            />
          }
        />
      </View>
    );
  }

  return (
    <View className="min-h-0 flex-1">
      <MarkdownEditor key={note.id} note={note} />
    </View>
  );
}
