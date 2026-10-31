import { StyleSheet, Text, View } from 'react-native';

import { status } from '@/constants/theme';
import { daysBetween } from '@/lib/billing';
import { formatDay, toMonth } from '@/lib/dates';

type Props = {
  nextChargeOn: string;
  lastPaidOn: string | null;
  today: string;
};

export function ChargeStatus({ nextChargeOn, lastPaidOn, today }: Props) {
  const days = daysBetween(today, nextChargeOn);
  const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;

  if (days <= 7) return <StatusLabel kind="warn" label={label} />;
  if (lastPaidOn && toMonth(lastPaidOn) === toMonth(today)) {
    return <StatusLabel kind="ok" label={`Paid ${formatDay(lastPaidOn)}`} />;
  }
  return <StatusLabel kind="off" label={label} />;
}

function StatusLabel({ kind, label }: { kind: keyof typeof status; label: string }) {
  return (
    <View style={[styles.label, { backgroundColor: status[kind].background }]}>
      <Text style={[styles.text, { color: status[kind].text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
