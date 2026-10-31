import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

type Props = {
  onDigits: (digits: string) => void;
  onDelete: () => void;
};

export function Keypad({ onDigits, onDelete }: Props) {
  return (
    <View style={styles.grid}>
      {ROWS.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map((key) => (
            <DigitKey key={key} digits={key} onPress={onDigits} />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        <DigitKey digits="000" onPress={onDigits} />
        <DigitKey digits="0" onPress={onDigits} />
        <PressableScale
          accessibilityLabel="Delete digit"
          accessibilityRole="button"
          onPress={onDelete}
          style={[styles.key, styles.delete]}>
          <SymbolView name="delete.left" size={22} tintColor={colors.ink} />
        </PressableScale>
      </View>
    </View>
  );
}

function DigitKey({ digits, onPress }: { digits: string; onPress: (digits: string) => void }) {
  return (
    <PressableScale accessibilityRole="button" onPress={() => onPress(digits)} style={styles.key}>
      <Text style={styles.label}>{digits}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  key: {
    flex: 1,
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
