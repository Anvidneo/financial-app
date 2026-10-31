import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { setSetting } from '@/db/settings';

export default function WelcomeScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');

  async function start() {
    await setSetting(db, 'name', name.trim());
    await setSetting(db, 'welcomed', '1');
    router.replace('/');
  }

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 24 }]}>
      <Text accessibilityRole="header" style={styles.title}>
        Your money stays on this phone.
      </Text>
      <Text style={styles.text}>No accounts, no servers, no bank logins.</Text>

      <TextInput
        accessibilityLabel="Your name"
        autoCapitalize="words"
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor="#B9CCC5"
        style={styles.input}
        value={name}
      />

      <View style={styles.spacer} />

      <PressableScale accessibilityRole="button" onPress={start} style={styles.start}>
        <Text style={styles.startLabel}>Get started</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.pocket,
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.surface,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: '#B9CCC5',
  },
  input: {
    height: 56,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    backgroundColor: '#2A4C43',
    fontSize: 16,
    color: colors.surface,
  },
  spacer: {
    flex: 1,
  },
  start: {
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
});
