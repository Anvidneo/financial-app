import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { addAccount, deleteAccount, getAccount, updateAccount } from '@/db/accounts';
import { formatCop } from '@/lib/money';

export default function AccountFormScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const [name, setName] = useState('');
  const [balanceCop, setBalanceCop] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === null) return;

    getAccount(db, id).then((account) => {
      if (!account) return;
      setName(account.name);
      setBalanceCop(account.balanceCop);
    });
  }, [db, id]);

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (id === null) {
        await addAccount(db, name, balanceCop);
      } else {
        await updateAccount(db, id, name, balanceCop);
      }
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Account not saved', 'Nothing changed. Try saving again.');
    }
  }

  function confirmDelete() {
    if (id === null) return;
    Alert.alert(`Delete ${name}?`, 'Your expenses stay as they are.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAccount(db, id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      style={styles.screen}>
      <View style={styles.header}>
        <PressableScale
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.close}>
          <SymbolView name="xmark" size={16} tintColor={colors.ink} />
        </PressableScale>
        <Text accessibilityRole="header" style={styles.title}>
          {id === null ? 'New account' : 'Edit account'}
        </Text>
        <View style={styles.close} />
      </View>

      <View style={styles.form}>
        <View style={[styles.field, styles.fieldDivider]}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            accessibilityLabel="Name"
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Savings account"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={name}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Balance</Text>
          <TextInput
            accessibilityLabel="Balance"
            keyboardType="number-pad"
            onChangeText={(text) => setBalanceCop(Number(text.replace(/\D/g, '').slice(0, 12)))}
            placeholder="$0"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={balanceCop > 0 ? formatCop(balanceCop) : ''}
          />
        </View>
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={save}
        style={[styles.save, !canSave && styles.saveDisabled]}>
        <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save account</Text>
      </PressableScale>

      {id !== null && (
        <PressableScale accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
          <Text style={styles.deleteLabel}>Delete account</Text>
        </PressableScale>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
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
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
  },
  fieldDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  input: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    minHeight: 48,
  },
  save: {
    height: 56,
    marginTop: 8,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: {
    backgroundColor: colors.control,
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  saveLabelDisabled: {
    color: colors.muted,
  },
  delete: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
