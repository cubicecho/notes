import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

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
      <View className="flex-1 items-center justify-center bg-background gap-3">
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground">Signing you in…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-background px-6 gap-4">
      <Text className="text-destructive text-center">{errorMsg}</Text>
      <TouchableOpacity
        onPress={() => router.replace('/auth/login')}
        className="rounded-md bg-primary px-4 py-2"
      >
        <Text className="text-primary-foreground font-medium">
          Back to login
        </Text>
      </TouchableOpacity>
    </View>
  );
}
