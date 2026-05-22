import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const { requestMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [devLink, setDevLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) return;
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

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="w-full max-w-sm gap-6">
        <View className="gap-1">
          <Text className="text-2xl font-semibold text-foreground">
            Sign in
          </Text>
          <Text className="text-muted-foreground">
            Enter your email and we&apos;ll send a magic link.
          </Text>
        </View>

        {status !== 'sent' ? (
          <View className="gap-3">
            <TextInput
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              editable={status !== 'sending'}
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={status === 'sending' || !email.trim()}
              className="items-center justify-center rounded-md bg-primary px-4 py-2.5 disabled:opacity-50"
            >
              {status === 'sending' ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-medium text-primary-foreground">
                  Send magic link
                </Text>
              )}
            </TouchableOpacity>

            {status === 'error' && (
              <Text className="text-destructive text-sm">{errorMsg}</Text>
            )}
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-foreground">
              Check your email for a magic link. It expires in 15 minutes.
            </Text>

            {/* DEV BYPASS — not shown in production */}
            {devLink && (
              <View className="gap-2 rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950 p-3">
                <Text className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  DEV MODE — bypass email:
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL(devLink)}>
                  <Text className="text-xs text-blue-600 dark:text-blue-400 underline break-all">
                    {devLink}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={() => setStatus('idle')}>
              <Text className="text-sm text-muted-foreground underline">
                Use a different email
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
