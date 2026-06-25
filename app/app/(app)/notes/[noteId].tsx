import { MarkdownEditor } from '@/components/domain/editor/MarkdownEditor';
import { useNotes } from '@/context/NotesContext';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotePage() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const { notes, loading } = useNotes();

  const note = notes.find((n) => n.id === noteId);

  // On first view (deep link / web refresh) the notes query is still in flight,
  // so `note` is undefined even though it exists. Wait for the fetch before
  // deciding the note is missing, otherwise we flash "Note not found."
  if (!note && loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground text-sm">Loading…</Text>
      </View>
    );
  }

  if (!note) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground text-sm">Note not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MarkdownEditor key={note.id} note={note} />
    </View>
  );
}
