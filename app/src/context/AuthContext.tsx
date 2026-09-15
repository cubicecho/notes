import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { graphql } from '../__generated__/index.js';
import { clearToken, getToken, loadToken, persistToken } from '../lib/auth';

const ME_QUERY = graphql(`
  query Me {
    me {
      id
      email
      personalOrg {
        id
      }
    }
  }
`);

const REQUEST_MAGIC_LINK = graphql(`
  mutation RequestMagicLink($email: String!) {
    requestMagicLink(email: $email) {
      success
      devLink
      token
      user {
        id
        email
      }
    }
  }
`);

const VERIFY_MAGIC_LINK = graphql(`
  mutation VerifyMagicLink($token: String!) {
    verifyMagicLink(token: $token) {
      token
      user {
        id
        email
      }
    }
  }
`);

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** The caller's personal org id — owns their personal notes. */
  personalOrgId: string | null;
  loading: boolean;
  /** Resolves `signedIn: true` when the server skipped the link (AUTH_MAGIC_LINK=false). */
  requestMagicLink: (
    email: string,
  ) => Promise<{ devLink?: string | null; signedIn: boolean }>;
  verifyMagicLink: (token: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const {
    data,
    loading: meLoading,
    refetch,
  } = useQuery(ME_QUERY, {
    skip: !tokenLoaded || !getToken(),
    fetchPolicy: 'network-only',
  });

  const [requestLink] = useMutation(REQUEST_MAGIC_LINK);
  const [verifyLink] = useMutation(VERIFY_MAGIC_LINK);

  // Load persisted token on mount
  useEffect(() => {
    loadToken().then(() => setTokenLoaded(true));
  }, []);

  // Sync user from me query
  useEffect(() => {
    if (data?.me) {
      setUser(data.me);
    }
  }, [data]);

  // Route guard — redirect to login when unauthenticated
  useEffect(() => {
    if (!tokenLoaded) return;

    const inAuthGroup = segments[0] === 'auth';
    const hasToken = !!getToken();

    if (!hasToken && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (hasToken && !meLoading && !data?.me) {
      // Token present but no user returned → stale token
      clearToken();
      router.replace('/auth/login');
    } else if (hasToken && data?.me && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [tokenLoaded, segments, data, meLoading]);

  const requestMagicLink = async (email: string) => {
    const { data } = await requestLink({ variables: { email } });
    const result = data?.requestMagicLink;
    if (result?.token && result.user) {
      await signIn(result.token, result.user);
      return { signedIn: true };
    }
    return { devLink: result?.devLink, signedIn: false };
  };

  const signIn = async (token: string, signedInUser: AuthUser) => {
    await persistToken(token);
    setUser(signedInUser);
    await refetch();
    router.replace('/(app)');
  };

  const verifyMagicLink = async (token: string) => {
    const { data } = await verifyLink({ variables: { token } });
    if (!data) throw new Error('Verification failed');
    await signIn(data.verifyMagicLink.token, data.verifyMagicLink.user);
  };

  const signOut = () => {
    clearToken();
    setUser(null);
    router.replace('/auth/login');
  };

  const loading = !tokenLoaded || meLoading;
  const personalOrgId = data?.me?.personalOrg?.id ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        personalOrgId,
        loading,
        requestMagicLink,
        verifyMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
