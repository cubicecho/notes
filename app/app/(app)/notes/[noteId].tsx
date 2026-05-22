import { MarkdownEditor } from '@/components/domain/editor/MarkdownEditor';
import { useNotes } from '@/context/NotesContext';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotePage() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const { notes } = useNotes();

  const note = notes.find((n) => n.id === noteId);

  if (!note) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground text-sm">Note not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MarkdownEditor note={note} />
    </View>
  );
}
