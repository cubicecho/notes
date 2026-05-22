import type { Note } from '@/context/NotesContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Pressable, Text } from 'react-native';

interface NoteItemProps {
  note: Note;
  isActive: boolean;
  onPress: () => void;
}

export function NoteItem({ note, isActive, onPress }: NoteItemProps) {
  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), {
    addSuffix: true,
  });

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-col px-3 py-2.5 rounded-md cursor-pointer',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-muted text-foreground',
      )}
    >
      <Text
        numberOfLines={1}
        className={cn(
          'text-sm font-medium',
          isActive ? 'text-accent-foreground' : 'text-foreground',
        )}
      >
        {note.title || 'Untitled'}
      </Text>
      <Text className="text-xs text-muted-foreground mt-0.5">{timeAgo}</Text>
    </Pressable>
  );
}
