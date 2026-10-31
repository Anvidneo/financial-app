import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'];

type Props = {
  onDigits: (digits: string) => void;
  onDelete: () => void;
};

export function Keypad({ onDigits, onDelete }: Props) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <PressableScale
          key={key}
          accessibilityRole="button"
          onPress={() => onDigits(key)}
          style={styles.key}>
          <Text style={styles.label}>{key}</Text>
        </PressableScale>
      ))}
      <PressableScale
        accessibilityLabel="Delete digit"
        accessibilityRole="button"
        onPress={onDelete}
        style={[styles.key, styles.delete]}>
        <SymbolView name="delete.left" size={22} tintColor={colors.ink} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  key: {
    flexBasis: '32%',
    flexGrow: 1,
    height: 52,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delete: {
    backgroundColor: colors.control,
  },
  label: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.ink,
  },
});
