import { File, Paths } from 'expo-file-system';

import { daysBetween } from '@/lib/billing';
import { toDay } from '@/lib/dates';
import { bytesToText, parseProfileExpiry } from '@/lib/signing';

export const WARNING_DAYS = 3;

// A reinstall can reuse a profile that is days old, so this reads the real date from the app.
export async function readInstallExpiry(): Promise<string | null> {
  try {
    const profile = new File(Paths.bundle, 'embedded.mobileprovision');
    if (!profile.exists) return null;
    const expiry = parseProfileExpiry(bytesToText(await profile.bytes()));
    return expiry ? toDay(expiry) : null;
  } catch {
    return null;
  }
}

export function installDaysLeft(expiresOn: string, today: string): number {
  return daysBetween(today, expiresOn);
}
