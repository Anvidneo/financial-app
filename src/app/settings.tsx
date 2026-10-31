import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { createBackup, restoreBackup } from '@/db/backup';
import { listAllExpenses } from '@/db/expenses';
import { getSetting, setSetting } from '@/db/settings';
import { toCsv } from '@/lib/csv';
import { formatDay, toDay } from '@/lib/dates';
import { readInstallExpiry } from '@/lib/install';
import { paymentLabel } from '@/lib/payment';
import { syncReminders } from '@/lib/reminders';

const LINK = 'financeapp://add?amount=[Amount]&merchant=[Merchant]&card=[Card]';
const STEPS = [
  'Open Shortcuts, then Automation, and tap the plus button.',
  'Choose Transaction, pick your Wallet cards, and select Run Immediately.',
  'Add URL Encode for Merchant and for Card, using Shortcut Input.',
  'Add Open URLs with the link below, using the encoded values and Amount.',
  'Make one real payment to test it. A manual run has no payment data.',
];

async function shareFile(name: string, contents: string) {
  const file = new File(Paths.cache, name);
  file.write(contents);
  await Share.share({ url: file.uri });
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [expiresOn, setExpiresOn] = useState<string | null>(null);

  useEffect(() => {
    getSetting(db, 'name').then((value) => setName(value ?? ''));
    readInstallExpiry().then(setExpiresOn);
  }, [db]);

  async function run(failure: string, task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      Alert.alert(failure, error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    run('Export failed', async () => {
      const expenses = await listAllExpenses(db);
      const rows = expenses.map((expense) => [
        expense.spentOn,
        expense.merchant,
        expense.amountCop,
        expense.categoryName,
        paymentLabel(expense.paymentMethod, expense.cardLabel) ?? '',
        expense.installments,
      ]);
      const header = ['Date', 'Merchant', 'Amount COP', 'Category', 'Paid with', 'Installments'];
      await shareFile(`movements-${toDay(new Date())}.csv`, toCsv([header, ...rows]));
    });
  }

  function backUp() {
    run('Backup failed', async () => {
      const name = `finance-backup-${toDay(new Date())}.json`;
      await shareFile(name, await createBackup(db));
    });
  }

  async function restore(uri: string) {
    await run('Restore failed', async () => {
      await restoreBackup(db, await new File(uri).text());
      await syncReminders(db);
      Alert.alert('Backup restored', 'Your data now matches the backup.');
    });
  }

  async function chooseBackup() {
    const result = await getDocumentAsync({ type: 'application/json', multiple: false });
    const uri = result.assets?.[0]?.uri;
    if (result.canceled || !uri) return;

    Alert.alert(
      'Replace all data?',
      'Everything in the app is replaced by this backup. This can\'t be undone.',
      [
        { text: 'Keep my data', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => restore(uri) },
      ],
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
      style={styles.screen}>
      <View style={styles.header}>
        <PressableScale
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.headerButton}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </PressableScale>
        <Text accessibilityRole="header" style={styles.title}>
          Settings
        </Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.card}>
        <View style={[styles.action, styles.divider]}>
          <Text style={styles.nameLabel}>Your name</Text>
          <TextInput
            accessibilityLabel="Your name"
            autoCapitalize="words"
            onChangeText={setName}
            onEndEditing={() => setSetting(db, 'name', name.trim())}
            placeholder="Add your name"
            placeholderTextColor={colors.muted}
            style={styles.nameInput}
            value={name}
          />
        </View>
        <Action
          disabled={false}
          divider={expiresOn !== null}
          label="Categories"
          onPress={() => router.push('/categories')}
        />
        {expiresOn && (
          <View style={styles.action}>
            <Text style={styles.nameLabel}>Reinstall by</Text>
            <Text style={styles.actionLabel}>{formatDay(expiresOn)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.section}>Backup</Text>
      <View style={styles.card}>
        <Action disabled={busy} label="Export movements as CSV" onPress={exportCsv} divider />
        <Action disabled={busy} label="Back up everything" onPress={backUp} divider />
        <Action disabled={busy} label="Restore from backup" onPress={chooseBackup} />
      </View>
      <Text style={styles.hint}>
        Your data lives only on this phone. Save a backup to Files or iCloud Drive every week.
      </Text>

      <Text style={styles.section}>Apple Pay Shortcut</Text>
      <View style={styles.steps}>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.step}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
      <View style={styles.link}>
        <Text selectable style={styles.linkText}>
          {LINK}
        </Text>
      </View>
    </ScrollView>
  );
}

function Action({
  disabled,
  divider = false,
  label,
  onPress,
}: {
  disabled: boolean;
  divider?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, divider && styles.divider]}>
      <Text style={styles.actionLabel}>{label}</Text>
      <SymbolView name="chevron.right" size={14} tintColor={colors.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  section: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  card: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  nameLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  nameInput: {
    flex: 1,
    minHeight: 48,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  steps: {
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  step: {
    flexDirection: 'row',
    gap: 10,
  },
  stepNumber: {
    width: 18,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  link: {
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  linkText: {
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
});
