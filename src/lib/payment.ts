export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'debit' | 'apple_pay';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'card', label: 'Credit card' },
  { value: 'debit', label: 'Debit card' },
  { value: 'apple_pay', label: 'Apple Pay' },
];

export function paymentLabel(
  method: PaymentMethod | null,
  cardLabel: string | null,
): string | null {
  if ((method === 'card' || method === 'debit') && cardLabel) return cardLabel;
  return PAYMENT_METHODS.find((option) => option.value === method)?.label ?? null;
}
