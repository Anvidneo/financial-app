import { addDays, addMonths, toMonth } from './dates.ts';

export type ReminderSource = {
  id: number;
  name: string;
  amountCop: number;
  billingDay: number;
  remindDays: number;
  remindersOn: boolean;
  after: string;
};

export type PlannedReminder = {
  recurringId: number;
  name: string;
  amountCop: number;
  chargeDay: string;
  remindOn: string;
};

// Day 31 falls on the last day of shorter months, as the New recurring screen promises.
export function chargeDayInMonth(month: string, billingDay: number): string {
  const [year, index] = month.split('-').map(Number);
  const lastDay = new Date(year, index, 0).getDate();
  return `${month}-${Math.min(billingDay, lastDay).toString().padStart(2, '0')}`;
}

export function nextCharge(billingDay: number, after: string): string {
  const charge = chargeDayInMonth(toMonth(after), billingDay);
  return charge > after ? charge : chargeDayInMonth(addMonths(toMonth(after), 1), billingDay);
}

export function chargesThrough(billingDay: number, after: string, through: string): string[] {
  const charges: string[] = [];
  let charge = nextCharge(billingDay, after);
  while (charge <= through) {
    charges.push(charge);
    charge = nextCharge(billingDay, charge);
  }
  return charges;
}

export function daysBetween(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonthIndex, toDay] = to.split('-').map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonthIndex - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      86_400_000,
  );
}

export function latestDay(...days: (string | null)[]): string {
  return days.filter((day): day is string => day !== null).sort().at(-1) ?? '';
}

// iOS keeps 64 pending notifications, so each charge plans only its next few reminders.
export function planReminders(
  sources: ReminderSource[],
  today: string,
  perCharge = 3,
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];

  for (const source of sources) {
    if (!source.remindersOn) continue;

    let charge = nextCharge(source.billingDay, source.after);
    for (let count = 0; count < perCharge; count += 1) {
      const remindOn = addDays(charge, -source.remindDays);
      if (remindOn >= today) {
        planned.push({
          recurringId: source.id,
          name: source.name,
          amountCop: source.amountCop,
          chargeDay: charge,
          remindOn,
        });
      }
      charge = nextCharge(source.billingDay, charge);
    }
  }

  return planned.sort((a, b) => a.remindOn.localeCompare(b.remindOn)).slice(0, 60);
}
