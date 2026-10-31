import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { listCards } from '@/db/cards';
import { listRecurring } from '@/db/recurring';
import { planReminders } from '@/lib/billing';
import { addDays, formatDay, toDay } from '@/lib/dates';
import { readInstallExpiry, WARNING_DAYS } from '@/lib/install';
import { formatCop } from '@/lib/money';

const REMINDER_HOUR = 9;
const CARD_REMIND_DAYS = 3;

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
    await schedule(
      reminder.remindOn,
      now,
      `${reminder.name} charges ${formatDay(reminder.chargeDay)}`,
      `${formatCop(reminder.amountCop)}. Cancel it or fund the account.`,
    );
  }

  for (const card of await listCards(db, today)) {
    const { balanceCop, dueOn } = card.statement;
    if (balanceCop === 0) continue;

    await schedule(
      addDays(dueOn, -CARD_REMIND_DAYS),
      now,
      `${card.name} ${card.lastFour} payment due ${formatDay(dueOn)}`,
      `${formatCop(balanceCop)} on this statement.`,
    );
  }

  const expiresOn = await readInstallExpiry();
  if (expiresOn) {
    await schedule(
      addDays(expiresOn, -WARNING_DAYS),
      now,
      `Reinstall Finance by ${formatDay(expiresOn)}`,
      'Back up first, then run the install from your Mac over this app.',
    );
  }
}

async function schedule(remindOn: string, now: Date, title: string, body: string): Promise<void> {
  const [year, month, day] = remindOn.split('-').map(Number);
  const date = new Date(year, month - 1, day, REMINDER_HOUR);
  if (date <= now) return;

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}
