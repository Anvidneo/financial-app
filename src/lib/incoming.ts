// Shortcuts sends amounts in the phone's region format, such as $128.400, 128,400.00 or 128400.
export function parseAmount(text: string | undefined): number {
  const cleaned = (text ?? '').replace(/[^\d.,]/g, '');
  const decimals = cleaned.match(/^(.*\d)[.,](\d{1,2})$/);
  const whole = decimals ? decimals[1] : cleaned;
  return Number(whole.replace(/\D/g, '').slice(0, 12)) || 0;
}

export function lastFourDigits(text: string | undefined): string | null {
  return (text ?? '').match(/(\d{4})(?!.*\d)/)?.[1] ?? null;
}

// Banks word their messages differently, so this only looks for an amount and "en <merchant>".
export function parseBankMessage(text: string | undefined): { amountCop: number; merchant: string } {
  const message = text ?? '';
  const amount = message.match(/\$\s?([\d.,]+\d)/)?.[1];
  const merchant = message.match(/\ben\s+([^\n.,]+?)(?:\s+(?:el|por|con|a las)\b|[.,\n]|$)/i)?.[1];
  return { amountCop: parseAmount(amount), merchant: merchant?.trim() ?? '' };
}
