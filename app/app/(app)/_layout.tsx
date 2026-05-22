import { NotesList } from '@/components/domain/sidebar/NotesList';
import { useAuth } from '@/context/AuthContext';
import { Link, Slot } from 'expo-router';
import { Platform, Text, View } from 'react-native';

function Navbar() {
  const { user } = useAuth();

  return (
    <View className="flex-row items-center justify-between px-4 h-12 border-b border-border bg-background shrink-0">
      <Text className="text-sm font-semibold text-foreground">
        CubicEcho Notes
      </Text>
      <View className="flex-row items-center gap-3">
        {user && (
          <Text className="text-xs text-muted-foreground hidden md:block">
            {user.email}
          </Text>
        )}
        <Link href="/(app)/settings">
          <Text className="text-sm text-muted-foreground hover:text-foreground">
            Settings
          </Text>
        </Link>
      </View>
    </View>
  );
}

function WebLayout() {
  return (
    <View className="flex h-screen overflow-hidden bg-background text-foreground flex-col">
      <Navbar />
      <View className="flex-1 flex-row overflow-hidden">
        <aside className="w-64 flex-shrink-0 border-r border-border overflow-y-auto flex flex-col">
          <NotesList />
        </aside>
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          <Slot />
        </main>
      </View>
    </View>
  );
}

function NativeLayout() {
  return (
    <View className="flex-1 flex-col">
      <Navbar />
      <Slot />
    </View>
  );
}

export default function AppLayout() {
  if (Platform.OS === 'web') return <WebLayout />;
  return <NativeLayout />;
}
