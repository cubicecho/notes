import { NotesList } from '@/components/domain/sidebar/NotesList';
import { Slot } from 'expo-router';
import { Platform } from 'react-native';

function WebLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="w-64 flex-shrink-0 border-r border-border overflow-y-auto flex flex-col">
        <NotesList />
      </aside>
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <Slot />
      </main>
    </div>
  );
}

function NativeLayout() {
  return <Slot />;
}

export default function AppLayout() {
  if (Platform.OS === 'web') return <WebLayout />;
  return <NativeLayout />;
}
