import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNotes } from '@/context/NotesContext';
import { useRouter, useSegments } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { NoteItem } from './NoteItem';

export function NotesList() {
  const { notes, loading, createNote } = useNotes();
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const activeNoteId = segments[segments.length - 1];

  async function handleCreate() {
    if (!user) return;
    const note = await createNote(user.id);
    router.push(`/(app)/notes/${note.id}`);
  }

  function handleSelect(id: string) {
    router.push(`/(app)/notes/${id}`);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <View className="flex-1 flex-col">
      <View className="flex-row items-center justify-between px-3 py-2.5 border-b border-border">
        <Text className="text-sm font-semibold text-foreground">Notes</Text>
        <Button
          variant="ghost"
          size="icon"
          onPress={handleCreate}
          disabled={!user}
        >
          <Text className="text-lg leading-none text-muted-foreground">+</Text>
        </Button>
      </View>

      <ScrollView className="flex-1">
        {loading ? (
          <View className="px-3 py-6 items-center">
            <Text className="text-sm text-muted-foreground">Loading…</Text>
          </View>
        ) : notes.length === 0 ? (
          <View className="px-3 py-6 items-center">
            <Text className="text-sm text-muted-foreground text-center">
              No notes yet.{'\n'}Press + to create one.
            </Text>
          </View>
        ) : (
          <View className="px-1 py-1 gap-0.5">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isActive={activeNoteId === note.id}
                onPress={() => handleSelect(note.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
