import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ErrorLink } from '@apollo/client/link/error';
import { getToken } from './lib/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

const httpLink = new HttpLink({
  uri: `${API_URL}/graphql`,
  fetch: (uri, options) => {
    const token = getToken();
    const headers = new Headers(options?.headers as HeadersInit | undefined);
    if (token) headers.set('authorization', `Bearer ${token}`);
    return fetch(uri as RequestInfo, { ...(options as RequestInit), headers });
  },
});

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    const needsAuth = error.errors.some(
      (e) =>
        e.message.includes('Not authenticated') || e.message === 'Forbidden',
    );
    if (needsAuth) console.warn('[Auth] unauthenticated GraphQL error');
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
