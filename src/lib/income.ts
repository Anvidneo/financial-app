export type IncomeKind = 'salary' | 'work' | 'refund' | 'gift' | 'other';

export const INCOME_KINDS: {
  value: IncomeKind;
  label: string;
  icon: string;
}[] = [
  { value: 'salary', label: 'Salary', icon: 'briefcase' },
  { value: 'work', label: 'Extra work', icon: 'hammer' },
  { value: 'refund', label: 'Refund', icon: 'arrow.uturn.backward' },
  { value: 'gift', label: 'Gift', icon: 'gift' },
  { value: 'other', label: 'Other', icon: 'plus.circle' },
];

export function incomeKind(value: string) {
  return INCOME_KINDS.find((kind) => kind.value === value) ?? INCOME_KINDS[INCOME_KINDS.length - 1];
}
