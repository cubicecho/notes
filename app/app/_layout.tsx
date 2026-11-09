import { apolloClient } from '@/apollo-client';
import { OverlayHost } from '@/components/ui/overlay';
import {
  PaletteProvider,
  migrateThemePreference,
  useThemePreference,
} from '@/components/ui/theme-preference';
import { AuthProvider } from '@/context/AuthContext';
import { NotesProvider } from '@/context/NotesContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { ApolloProvider } from '@apollo/client/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import '../global.css';

// Where the theme choice persists on device. The web always uses localStorage.
const themeStorage = AsyncStorage;

// The app stored its theme under its own key before cubeui's picker. Bring a
// reader's choice across once, before the first render reads cubeui's key.
void migrateThemePreference(
  { theme: ['cubicecho_theme'] },
  { storage: themeStorage },
);

export default function RootLayout() {
  // `public/index.html` has already painted the right theme on the web; this
  // keeps it on every screen and repaints a `system` reader when the OS switches.
  useThemePreference({ storage: themeStorage });

  return (
    <PaletteProvider>
      {/* The layer tooltips are drawn in on device, over the screen rather than
          inside a `ScrollView` that would clip them. */}
      <OverlayHost>
        <ApolloProvider client={apolloClient}>
          <AuthProvider>
            <WorkspaceProvider>
              <NotesProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
              </NotesProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ApolloProvider>
      </OverlayHost>
    </PaletteProvider>
  );
}
