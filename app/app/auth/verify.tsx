import { CenteredCardLayout } from '@/components/centered-card-layout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

export default function VerifyScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { verifyMagicLink } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('No token provided.');
      setStatus('error');
      return;
    }

    verifyMagicLink(token).catch((e) => {
      setErrorMsg(e instanceof Error ? e.message : 'Verification failed.');
      setStatus('error');
    });
  }, [token]);

  if (status === 'verifying') {
    return (
      <CenteredCardLayout
        level={1}
        title="Signing you in…"
        contentSlot={<Spinner label="Signing you in" className="size-6" />}
      />
    );
  }

  return (
    <CenteredCardLayout
      level={1}
      title="That link didn't work"
      description={errorMsg}
      footerActionsSlot={
        <Button
          content="Back to sign in"
          onPress={() => router.replace('/auth/login')}
        />
      }
    />
  );
}
