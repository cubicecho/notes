import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNotes } from '@/context/NotesContext';
import { type Workspace, useWorkspace } from '@/context/WorkspaceContext';
import { useQuery } from '@apollo/client/react';
import { useRouter, useSegments } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { graphql } from '../../../__generated__/index.js';
import { NoteItem } from './NoteItem';

const MY_ORGS_SIDEBAR = graphql(`
  query SidebarMyOrgs {
    myOrgs {
      id
      name
    }
  }
`);

function WorkspacePicker() {
  const { workspace, setWorkspace } = useWorkspace();
  const { data } = useQuery(MY_ORGS_SIDEBAR);
  const orgs = data?.myOrgs ?? [];

  const options: Array<{ label: string; value: Workspace }> = [
    { label: 'Personal', value: { type: 'personal' } },
    ...orgs.map((o) => ({
      label: o.name,
      value: { type: 'org' as const, id: o.id, name: o.name },
    })),
  ];

  const activeLabel =
    workspace.type === 'personal'
      ? 'Personal'
      : (orgs.find((o) => o.id === workspace.id)?.name ?? 'Org');

  return (
    <View className="px-3 py-2 border-b border-border">
      <Text className="text-xs text-muted-foreground mb-1">Workspace</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row gap-1"
      >
        {options.map((opt) => {
          const isActive =
            opt.value.type === workspace.type &&
            (opt.value.type === 'personal' ||
              (opt.value.type === 'org' &&
                opt.value.id === (workspace as { id: string }).id));
          return (
            <Button
              key={opt.label}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onPress={() => setWorkspace(opt.value)}
            >
              <Text
                className={
                  isActive
                    ? 'text-primary-foreground text-xs'
                    : 'text-foreground text-xs'
                }
              >
                {opt.label}
              </Text>
            </Button>
          );
        })}
      </ScrollView>
    </View>
  );
}

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

  return (
    <View className="flex-1 flex-col">
      <WorkspacePicker />

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
