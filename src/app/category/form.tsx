import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  DangerButton,
  FieldInput,
  FormGroup,
  FormHeader,
  FormScreen,
  SaveButton,
} from '@/components/form';
import { CategoryTile } from '@/components/category-tile';
import { LoadFailed } from '@/components/load-failed';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import {
  addCategory,
  countCategoryUses,
  deleteCategory,
  getCategory,
  updateCategory,
} from '@/db/expenses';
import { runAction } from '@/lib/report';
import { useLoad } from '@/lib/use-load';

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
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICONS[0]);
  const [palette, setPalette] = useState(PALETTE[0]);
  const [uses, setUses] = useState(0);
  const [saving, setSaving] = useState(false);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      if (id === null) return;
      const [category, count] = await Promise.all([getCategory(db, id), countCategoryUses(db, id)]);
      setUses(count);
      if (!category) return;
      setName(category.name);
      setIcon(category.icon);
      setPalette({ color: category.color, tint: category.tint });
    }, [db, id]),
    { onFocus: false },
  );

  if (failed) return <LoadFailed onRetry={retry} />;
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
        onPress: () =>
          runAction('Category not deleted', async () => {
            await deleteCategory(db, id);
            router.dismissTo('/categories');
          }),
      },
    ]);
  }

  return (
    <FormScreen>
      <FormHeader>{id === null ? 'New category' : 'Edit category'}</FormHeader>

      <View style={styles.preview}>
        <CategoryTile icon={icon} color={palette.color} tint={palette.tint} />
      </View>

      <FormGroup>
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <FieldInput
            accessibilityLabel="Name"
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Pets, education"
            value={name}
          />
        </View>
      </FormGroup>

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

      <SaveButton disabled={!canSave} label="Save category" onPress={save} />

      {id !== null && uses === 0 && (
        <DangerButton label="Delete category" onPress={confirmDelete} />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
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
});
