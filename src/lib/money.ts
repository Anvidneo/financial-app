const MAX_DIGITS = 12;

export function formatCop(amount: number): string {
  const digits = Math.abs(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${amount < 0 ? '-' : ''}$${digits}`;
}

export function appendDigits(amount: number, digits: string): number {
  const next = `${amount}${digits}`.replace(/^0+(?=\d)/, '');
  return next.length > MAX_DIGITS ? amount : Number(next);
}

export function removeLastDigit(amount: number): number {
  return Math.floor(amount / 10);
}
