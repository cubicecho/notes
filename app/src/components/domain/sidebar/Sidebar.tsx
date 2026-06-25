import { View } from 'react-native';
import { NotesList } from './NotesList';
import { WorkspacePicker } from './WorkspacePicker';

export function Sidebar() {
  return (
    <View className="flex-1 flex-col">
      <WorkspacePicker />
      <NotesList />
    </View>
  );
}

