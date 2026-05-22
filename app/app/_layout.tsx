import { apolloClient } from '@/apollo-client';
import { AuthProvider } from '@/context/AuthContext';
import { NotesProvider } from '@/context/NotesContext';
import { ApolloProvider } from '@apollo/client/react';
import { Stack } from 'expo-router';
import '../src/index.css';
import '../global.css';

export default function RootLayout() {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <NotesProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </NotesProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
