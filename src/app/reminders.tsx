import { router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { PageHeader, PageScreen } from '@/components/page';
import { LoadFailed } from '@/components/load-failed';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius, status } from '@/constants/theme';
import { listCards } from '@/db/cards';
import { listRecurring } from '@/db/recurring';
import { daysBetween } from '@/lib/billing';
import { formatDay, toDay } from '@/lib/dates';
import { readInstallExpiry } from '@/lib/install';
import { formatCop } from '@/lib/money';
import { remindersAllowed } from '@/lib/reminders';
import { useLoad } from '@/lib/use-load';

type Item = {
  key: string;
  title: string;
  detail: string;
  amountCop: number | null;
  day: string;
  href: Href;
};

function dayLabel(days: number): string {
  if (days <= 0) return days === 0 ? 'Today' : 'Overdue';
  return days === 1 ? 'Tomorrow' : `In ${days} days`;
}

export default function RemindersScreen() {
  const db = useSQLiteContext();
  const today = toDay(new Date());
  const [items, setItems] = useState<Item[]>([]);
  const [allowed, setAllowed] = useState(true);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      {
        const [recurring, cards, expiresOn] = await Promise.all([
          listRecurring(db, today),
          listCards(db, today),
          readInstallExpiry(),
        ]);
        const charges: Item[] = recurring.map((item) => ({
          key: `recurring-${item.id}`,
          title: `${item.name} charges ${formatDay(item.nextChargeOn)}`,
          detail: 'Cancel it or fund the account',
          amountCop: item.amountCop,
          day: item.nextChargeOn,
          href: `/recurring/${item.id}`,
        }));
        const payments: Item[] = cards
          .filter((card) => card.statement.balanceCop > 0)
          .map((card) => ({
            key: `card-${card.id}`,
            title: `${card.name} ${card.lastFour} payment`,
            detail: card.statement.minimumCop
              ? `Minimum ${formatCop(card.statement.minimumCop)}`
              : `Due ${formatDay(card.statement.dueOn)}`,
            amountCop: card.statement.balanceCop,
            day: card.statement.dueOn,
            href: `/card/${card.id}`,
          }));
        const install: Item[] = expiresOn
          ? [
              {
                key: 'install',
                title: 'Reinstall the app',
                detail: 'Run it from your Mac over this app',
                amountCop: null,
                day: expiresOn,
                href: '/settings',
              },
            ]
          : [];

        setItems([...charges, ...payments, ...install].sort((a, b) => a.day.localeCompare(b.day)));
        setAllowed(await remindersAllowed());
      }
    }, [db, today]),
  );

  if (failed) return <LoadFailed onRetry={retry} />;

  return (
    <PageScreen gap={14}>
      <PageHeader title="Reminders" />

      {!allowed && (
        <PressableScale
          accessibilityRole="button"
          onPress={() => Linking.openSettings()}
          style={styles.off}>
          <Text style={styles.rowName}>Reminders are off</Text>
          <Text style={styles.rowDetail}>
            Tap to turn on notifications in iPhone Settings. This list still works.
          </Text>
        </PressableScale>
      )}

      {items.length === 0 ? (
        <Text style={styles.nothing}>Nothing coming up.</Text>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => {
            const days = daysBetween(today, item.day);
            const tone = days <= 7 ? status.warn : status.off;
            return (
              <PressableScale
                key={item.key}
                accessibilityRole="button"
                onPress={() => router.push(item.href)}
                style={[styles.row, index < items.length - 1 && styles.divider]}>
                <View style={styles.rowText}>
                  <Text numberOfLines={2} style={styles.rowName}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowDetail}>{item.detail}</Text>
                </View>
                <View style={styles.rowEnd}>
                  {item.amountCop !== null && (
                    <Text style={styles.rowName}>{formatCop(item.amountCop)}</Text>
                  )}
                  <View style={[styles.label, { backgroundColor: tone.background }]}>
                    <Text style={[styles.labelText, { color: tone.text }]}>{dayLabel(days)}</Text>
                  </View>
                </View>
              </PressableScale>
            );
          })}
        </View>
      )}
    </PageScreen>
  );
}

const styles = StyleSheet.create({
  off: {
    gap: 2,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  nothing: {
    paddingVertical: 48,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  list: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowEnd: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  rowDetail: {
    fontSize: 12,
    color: colors.muted,
  },
  label: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
