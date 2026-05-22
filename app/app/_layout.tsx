import { apolloClient } from '@/apollo-client';
import { NotesProvider } from '@/context/NotesContext';
import { ApolloProvider } from '@apollo/client/react';
import { Stack } from 'expo-router';
import '../src/index.css';
import '../global.css';

export default function RootLayout() {
  return (
    <ApolloProvider client={apolloClient}>
      <NotesProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </NotesProvider>
    </ApolloProvider>
  );
}
