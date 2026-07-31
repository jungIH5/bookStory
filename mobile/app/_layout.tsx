import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useUserStore } from '@/store/useUserStore';
import { useDiveStore } from '@/store/useDiveStore';
import FloatingTimerWidget from '@/components/FloatingTimerWidget';
import TimerCompleteModal from '@/components/TimerCompleteModal';
import PendingTimeConfirmModal from '@/components/PendingTimeConfirmModal';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: '(tabs)' };

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { token, loadUser } = useUserStore();
  const { fetchActiveDiveRoom, fetchPendingTimeConfirmations } = useDiveStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadUser().finally(() => {
      setReady(true);
      SplashScreen.hideAsync();
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchActiveDiveRoom();
    fetchPendingTimeConfirmations();
    const iv = setInterval(fetchActiveDiveRoom, 30000);
    return () => clearInterval(iv);
  }, [token]);

  if (!ready) return null;

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="recommendations" options={{ headerShown: false }} />
        <Stack.Screen name="dive-room/create" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="dive-room/[id]" options={{ headerShown: false }} />
      </Stack>
      <FloatingTimerWidget />
      <TimerCompleteModal />
      <PendingTimeConfirmModal />
    </>
  );
}
