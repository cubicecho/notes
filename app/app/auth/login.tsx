import { CenteredCardLayout } from '@/components/centered-card-layout';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { Linking } from 'react-native';

export default function LoginScreen() {
  const { requestMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [devLink, setDevLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      return;
    }
    setStatus('sending');
    setErrorMsg('');
    try {
      const result = await requestMagicLink(email.trim());
      setDevLink(result.devLink ?? null);
      setStatus('sent');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <CenteredCardLayout
        level={1}
        title="Check your email"
        description={`We sent a sign-in link to ${email.trim()}. It expires in 15 minutes.`}
        contentSlot={
          // DEV BYPASS — the server only returns a link outside production.
          devLink ? (
            <Alert
              variant="warning"
              title="Dev mode: skip the email"
              description="Outside production the server hands back the link instead of emailing it."
              actionSlot={
                <Button
                  variant="outline"
                  size="sm"
                  content="Open link"
                  onPress={() => void Linking.openURL(devLink)}
                />
              }
            />
          ) : null
        }
        footerActionsSlot={
          <Button
            variant="ghost"
            content="Use a different email"
            onPress={() => setStatus('idle')}
          />
        }
      />
    );
  }

  return (
    <CenteredCardLayout
      level={1}
      title="Sign in"
      description="Enter your email and we'll send a magic link."
      contentSlot={
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            onSubmitEditing={handleSubmit}
            disabled={status === 'sending'}
            aria-invalid={status === 'error'}
          />
          {status === 'error' ? <FieldError>{errorMsg}</FieldError> : null}
        </Field>
      }
      footerActionsSlot={
        <Button
          content="Send magic link"
          loading={status === 'sending'}
          loadingLabel="Sending…"
          disabled={!email.trim()}
          onPress={handleSubmit}
        />
      }
    />
  );
}
