import { apolloClient } from '@/apollo-client';
import { AuthProvider } from '@/context/AuthContext';
import { NotesProvider } from '@/context/NotesContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ApolloProvider } from '@apollo/client/react';
import { Stack } from 'expo-router';
import '../src/index.css';
import '../global.css';

export default function RootLayout() {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotesProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </NotesProvider>
        </AuthProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}
