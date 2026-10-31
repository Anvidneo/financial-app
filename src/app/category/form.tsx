import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import {
  addCategory,
  countCategoryUses,
  deleteCategory,
  getCategory,
  updateCategory,
} from '@/db/expenses';

const PALETTE = [
  { color: '#1C7A43', tint: '#E3F6E9' },
  { color: '#2F6FED', tint: '#E6F0FD' },
  { color: '#A76A00', tint: '#FFF4DE' },
  { color: '#7A3FD1', tint: '#F1E9FD' },
  { color: '#C93A3A', tint: '#FDECEC' },
  { color: '#11707A', tint: '#E2F4F4' },
];
const ICONS: SFSymbol[] = [
  'bag',
  'bolt',
  'car',
  'play.circle',
  'house',
  'heart',
  'fork.knife',
  'airplane',
  'book',
  'pawprint',
  'gift',
  'tshirt',
];

export default function CategoryFormScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICONS[0]);
  const [palette, setPalette] = useState(PALETTE[0]);
  const [uses, setUses] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === null) return;

    getCategory(db, id).then((category) => {
      if (!category) return;
      setName(category.name);
      setIcon(category.icon);
      setPalette({ color: category.color, tint: category.tint });
    });
    countCategoryUses(db, id).then(setUses);
  }, [db, id]);

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const input = { name, icon, ...palette };
    try {
      if (id === null) {
        await addCategory(db, input);
      } else {
        await updateCategory(db, id, input);
      }
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Category not saved', 'That name may already exist. Try another one.');
    }
  }

  function confirmDelete() {
    if (id === null) return;
    Alert.alert(`Delete ${name}?`, 'It has no movements, so nothing else changes.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(db, id);
          router.dismissTo('/categories');
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
          {id === null ? 'New category' : 'Edit category'}
        </Text>
        <View style={styles.close} />
      </View>

      <View style={styles.preview}>
        <CategoryTile icon={icon} color={palette.color} tint={palette.tint} />
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            accessibilityLabel="Name"
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Pets, education"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={name}
          />
        </View>
      </View>

      <Text style={styles.section}>Color</Text>
      <View style={styles.options}>
        {PALETTE.map((option) => (
          <PressableScale
            key={option.color}
            accessibilityLabel={`Color ${option.color}`}
            accessibilityRole="button"
            accessibilityState={{ selected: palette.color === option.color }}
            onPress={() => setPalette(option)}
            style={[styles.option, palette.color === option.color && styles.selected]}>
            <View style={[styles.swatch, { backgroundColor: option.color }]} />
          </PressableScale>
        ))}
      </View>

      <Text style={styles.section}>Icon</Text>
      <View style={styles.options}>
        {ICONS.map((option) => (
          <PressableScale
            key={option}
            accessibilityLabel={`Icon ${option}`}
            accessibilityRole="button"
            accessibilityState={{ selected: icon === option }}
            onPress={() => setIcon(option)}
            style={[styles.option, icon === option && styles.selected]}>
            <SymbolView name={option} size={20} tintColor={colors.ink} />
          </PressableScale>
        ))}
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={save}
        style={[styles.save, !canSave && styles.saveDisabled]}>
        <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save category</Text>
      </PressableScale>

      {id !== null && uses === 0 && (
        <PressableScale accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
          <Text style={styles.deleteLabel}>Delete category</Text>
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
  preview: {
    alignItems: 'center',
  },
  form: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
  },
  input: {
    flex: 1,
    minHeight: 48,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  section: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    width: 48,
    height: 48,
    borderRadius: radius.tile,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderColor: colors.ink,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
