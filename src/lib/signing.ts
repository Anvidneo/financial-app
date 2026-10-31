const REMINDER_BYTES_CHUNK = 8192;

export function parseProfileExpiry(profile: string): Date | null {
  const date = profile.match(/<key>ExpirationDate<\/key>\s*<date>([^<]+)<\/date>/)?.[1];
  if (!date) return null;
  const expiry = new Date(date);
  return Number.isNaN(expiry.getTime()) ? null : expiry;
}

export function bytesToText(bytes: Uint8Array): string {
  let text = '';
  for (let start = 0; start < bytes.length; start += REMINDER_BYTES_CHUNK) {
    text += String.fromCharCode(...bytes.subarray(start, start + REMINDER_BYTES_CHUNK));
  }
  return text;
}
