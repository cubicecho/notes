import { AppSidebar, Brand } from '@/components/domain/navigation/AppSidebar';
import { useCreateNote } from '@/components/domain/notes/useCreateNote';
import { AppBarItem } from '@/components/sidebar';
import { SidebarLayout } from '@/components/split-layout';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Settings } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';
import { Link, Slot, usePathname } from 'expo-router';
import { View } from 'react-native';

/**
 * The signed-in shell: the rail beside the current screen from `md` up, and a
 * bar over it on a phone, where the notes list is the Notes screen itself.
 */
export default function AppLayout() {
  const { loading } = useAuth();
  const pathname = usePathname();
  const { create, creating, canCreate } = useCreateNote();

  // Wait for auth (token load + me query) to resolve before rendering the app.
  // The route guard in AuthProvider redirects unauthenticated users to login;
  // gating here avoids briefly rendering the app shell with no user.
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner label="Signing in" className="size-6 text-foreground/60" />
      </View>
    );
  }

  return (
    <SidebarLayout
      className="h-full flex-1 bg-background"
      sidebarPosition="start"
      sidebarWidth="auto"
      // The sidebar draws its own rule.
      divider="none"
      sidebarHideBelow="md"
      sidebarSlot={<AppSidebar />}
      brandSlot={<Brand />}
      navLabel="Main"
      navSlot={[
        <Link key="notes" href="/" asChild>
          <AppBarItem
            label="Notes"
            iconSlot={<FileText />}
            active={pathname === '/' || pathname.startsWith('/notes/')}
          />
        </Link>,
        <Link key="settings" href="/settings" asChild>
          <AppBarItem
            label="Settings"
            iconSlot={<Settings />}
            active={pathname === '/settings'}
          />
        </Link>,
      ]}
      actionSlot={
        <Button
          size="icon-sm"
          aria-label="New note"
          iconSlot={<Plus />}
          loading={creating}
          disabled={!canCreate}
          onPress={() => void create()}
        />
      }
      contentSlot={
        // `role="main"` becomes a <main>. It does not scroll: each screen's
        // `PageLayout` scrolls under its pinned header and needs a height to divide.
        // biome-ignore lint/a11y/useSemanticElements: a React Native View, which has no <main>; the role renders one on the web.
        <View role="main" className="min-h-0 min-w-0 flex-1">
          <Slot />
        </View>
      }
    />
  );
}
