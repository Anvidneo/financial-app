const MAX_DIGITS = 12;

export function formatCop(amount: number): string {
  const plain = Math.abs(amount).toString();
  let digits = '';
  for (let index = 0; index < plain.length; index += 1) {
    if (index > 0 && (plain.length - index) % 3 === 0) digits += '.';
    digits += plain[index];
  }
  return `${amount < 0 ? '-' : ''}$${digits}`;
}

export function appendDigits(amount: number, digits: string): number {
  const next = `${amount}${digits}`.replace(/^0+(?=\d)/, '');
  return next.length > MAX_DIGITS ? amount : Number(next);
}

export function removeLastDigit(amount: number): number {
  return Math.floor(amount / 10);
}
