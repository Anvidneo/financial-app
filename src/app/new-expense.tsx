import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { Keypad } from '@/components/keypad';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { addExpense, listCategories, type Category } from '@/db/expenses';
import { addDays, formatRelativeDay, toDay } from '@/lib/dates';
import { appendDigits, formatCop, removeLastDigit } from '@/lib/money';

export default function NewExpenseScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const today = toDay(new Date());
  const [amountCop, setAmountCop] = useState(0);
  const [merchant, setMerchant] = useState('');
  const [spentOn, setSpentOn] = useState(today);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCategories(db).then((rows) => {
      setCategories(rows);
      setCategoryId(rows[0]?.id ?? null);
    });
  }, [db]);

  const canSave = amountCop > 0 && merchant.trim().length > 0 && categoryId !== null && !saving;

  async function save() {
    if (!canSave || categoryId === null) return;
    setSaving(true);
    try {
      await addExpense(db, { merchant, amountCop, categoryId, spentOn });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Expense not saved', 'Nothing changed. Try saving again.');
    }
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <PressableScale
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.close}>
          <SymbolView name="xmark" size={16} tintColor={colors.ink} />
        </PressableScale>
        <Text accessibilityRole="header" style={styles.title}>
          New expense
        </Text>
        <View style={styles.close} />
      </View>

      <View style={styles.amount}>
        <Text accessibilityLiveRegion="polite" style={styles.amountValue}>
          {formatCop(amountCop)}
        </Text>
        <Text style={styles.amountHint}>Colombian pesos</Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.field, styles.fieldDivider]}>
          <Text style={styles.fieldLabel}>Merchant</Text>
          <TextInput
            accessibilityLabel="Merchant"
            autoCapitalize="words"
            onChangeText={setMerchant}
            placeholder="Where you paid"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
            value={merchant}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date</Text>
          <View style={styles.dateControls}>
            <PressableScale
              accessibilityLabel="Previous day"
              accessibilityRole="button"
              onPress={() => setSpentOn(addDays(spentOn, -1))}
              style={styles.dayButton}>
              <SymbolView name="chevron.left" size={14} tintColor={colors.muted} />
            </PressableScale>
            <Text style={styles.dateValue}>{formatRelativeDay(spentOn, today)}</Text>
            <PressableScale
              accessibilityLabel="Next day"
              accessibilityRole="button"
              accessibilityState={{ disabled: spentOn === today }}
              disabled={spentOn === today}
              onPress={() => setSpentOn(addDays(spentOn, 1))}
              style={styles.dayButton}>
              <SymbolView
                name="chevron.right"
                size={14}
                tintColor={spentOn === today ? colors.control : colors.muted}
              />
            </PressableScale>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroller}>
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.spacer} />

      <Keypad
        onDigits={(digits) => setAmountCop(appendDigits(amountCop, digits))}
        onDelete={() => setAmountCop(removeLastDigit(amountCop))}
      />

      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={save}
        style={[styles.save, !canSave && styles.saveDisabled]}>
        <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save expense</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
  amount: {
    alignItems: 'center',
    gap: 2,
  },
  amountValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  amountHint: {
    fontSize: 13,
    color: colors.muted,
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
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -14,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    minWidth: 76,
    textAlign: 'center',
  },
  dayButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroller: {
    flexGrow: 0,
    marginHorizontal: -20,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 20,
  },
  spacer: {
    flex: 1,
  },
  save: {
    height: 56,
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
});
