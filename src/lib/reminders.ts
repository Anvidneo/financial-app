import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { listRecurring } from '@/db/recurring';
import { planReminders } from '@/lib/billing';
import { formatDay, toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';

const REMINDER_HOUR = 9;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function remindersAllowed(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

export async function requestReminders(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

// The permission prompt returns the app to active, which would otherwise overlap a save's sync
// and schedule every reminder twice. Syncs run one at a time.
let queue: Promise<void> = Promise.resolve();

export function syncReminders(db: SQLiteDatabase): Promise<void> {
  queue = queue.catch(() => undefined).then(() => replaceSchedule(db));
  return queue;
}

// Replaces the whole schedule, so edits, cancellations and passed charges never leave stale alerts.
async function replaceSchedule(db: SQLiteDatabase): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await remindersAllowed())) return;

  const now = new Date();
  const today = toDay(now);
  const recurring = await listRecurring(db, today);

  for (const reminder of planReminders(recurring, today)) {
    const [year, month, day] = reminder.remindOn.split('-').map(Number);
    const date = new Date(year, month - 1, day, REMINDER_HOUR);
    if (date <= now) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${reminder.name} charges ${formatDay(reminder.chargeDay)}`,
        body: `${formatCop(reminder.amountCop)}. Cancel it or fund the account.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
}
