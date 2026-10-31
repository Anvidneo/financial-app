import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { postDueCharges } from '@/db/recurring';
import { migrate } from '@/db/schema';
import { toDay } from '@/lib/dates';
import { syncReminders } from '@/lib/reminders';

function ChargeSync({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const syncing = useRef(false);

  useEffect(() => {
    async function sync() {
      if (syncing.current) return;
      syncing.current = true;
      try {
        await postDueCharges(db, toDay(new Date()));
        await syncReminders(db);
      } finally {
        syncing.current = false;
      }
    }

    sync().finally(() => setReady(true));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [db]);

  return ready ? children : null;
}

// Side insets are zero on most iPhones, but foldables keep the camera and clock in a side column.
function Screens() {
  const insets = useSafeAreaInsets();
  const sides = { paddingLeft: insets.left, paddingRight: insets.right };

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background, ...sides },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="new-expense" options={{ presentation: 'modal' }} />
      <Stack.Screen name="expense/[id]" />
      <Stack.Screen name="accounts/index" />
      <Stack.Screen name="accounts/form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="categories" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="category/form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="card/pay" options={{ presentation: 'modal' }} />
      <Stack.Screen name="reminders" />
      <Stack.Screen
        name="welcome"
        options={{
          animation: 'none',
          gestureEnabled: false,
          contentStyle: { backgroundColor: colors.pocket, ...sides },
        }}
      />
      <Stack.Screen name="settings" />
      <Stack.Screen name="add" options={{ animation: 'none' }} />
      <Stack.Screen name="quick/[id]" options={{ animation: 'none' }} />
      <Stack.Screen name="card/form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="card/[id]" />
      <Stack.Screen name="recurring/form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="recurring/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="finance.db" onInit={migrate}>
      <StatusBar style="dark" />
      <ChargeSync>
        <Screens />
      </ChargeSync>
    </SQLiteProvider>
  );
}
