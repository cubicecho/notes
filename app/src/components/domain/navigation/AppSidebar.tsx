import { EmptyState } from '@/components/empty-state';
import { useCreateNote } from '@/components/domain/notes/useCreateNote';
import { LoadState } from '@/components/domain/query/load-state';
import { WorkspacePicker } from '@/components/domain/workspace/WorkspacePicker';
import { Sidebar, SidebarItem, SidebarSection } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Plus, Settings } from '@/components/ui/icons';
import { useAuth } from '@/context/AuthContext';
import { useNotes } from '@/context/NotesContext';
import { noteLabel, notePath } from '@/lib/notes';
import { Link, usePathname } from 'expo-router';
import { Text } from 'react-native';

/** The app's name, at the top of the rail and at the start of the phone's bar. */
export function Brand() {
  return (
    <Link href="/" className="px-1 font-semibold text-foreground text-lg">
      Notes
    </Link>
  );
}

/** The rail: the workspace, its notes, and settings and sign out at the bottom. */
export function AppSidebar() {
  const pathname = usePathname();
  const { notes, loading, error, refetch } = useNotes();
  const { user, signOut } = useAuth();
  const { create, creating, canCreate } = useCreateNote();

  return (
    <Sidebar
      label="Notes"
      headerClassName="flex-col items-stretch gap-3"
      headerSlot={
        <>
          <Brand />
          <WorkspacePicker />
        </>
      }
      contentSlot={
        <SidebarSection
          as="nav"
          title="Notes"
          actionSlot={
            <Button
              variant="outline"
              size="icon-xs"
              aria-label="New note"
              iconSlot={<Plus />}
              loading={creating}
              disabled={!canCreate}
              onPress={() => void create()}
            />
          }
          status={
            <LoadState
              compact
              query={{
                loading,
                error,
                refetch,
                data: loading && notes.length === 0 ? undefined : notes,
              }}
              what="your notes"
              count={notes.length}
              className="px-2"
              emptySlot={
                <EmptyState
                  compact
                  title="No notes yet."
                  className="px-2"
                />
              }
            />
          }
          contentSlot={notes.map((note) => (
            <Link key={note.id} href={notePath(note.id)} asChild>
              <SidebarItem
                label={noteLabel(note)}
                active={pathname === notePath(note.id)}
              />
            </Link>
          ))}
        />
      }
      footerSlot={
        <>
          {user ? (
            <Text
              numberOfLines={1}
              className="px-4 pb-1 text-foreground/60 text-xs"
            >
              {user.email}
            </Text>
          ) : null}
          <Link href="/settings" asChild>
            <SidebarItem
              label="Settings"
              iconSlot={<Settings />}
              active={pathname === '/settings'}
            />
          </Link>
          <SidebarItem
            label="Sign out"
            iconSlot={<LogOut />}
            onPress={signOut}
          />
        </>
      }
    />
  );
}
