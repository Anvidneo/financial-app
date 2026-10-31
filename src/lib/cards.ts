import { chargeDayInMonth, nextCharge } from './billing.ts';
import { toMonth } from './dates.ts';

export type CardCycle = {
  cutOffDay: number;
  paymentDay: number;
  limitCop: number;
};

export type CardPurchase = {
  id: number;
  merchant: string;
  amountCop: number;
  installments: number;
  spentOn: string;
  interestRate?: number;
};

export type Installment = {
  number: number;
  count: number;
  amountCop: number;
  capitalCop: number;
  cutOffOn: string;
  dueOn: string;
};

export type StatementItem = Installment & {
  purchaseId: number;
  merchant: string;
  spentOn: string;
};

export type StatementRecord = {
  cutOffOn: string;
  minimumCop: number | null;
  paidOn: string | null;
  paidCop?: number;
};

export type Statement = {
  cutOffOn: string;
  dueOn: string;
  totalCop: number;
  paidCop: number;
  balanceCop: number;
  minimumCop: number | null;
  closed: boolean;
  items: StatementItem[];
};

export type CardSummary = {
  statement: Statement;
  usedCop: number;
  availableCop: number;
};

// A purchase made on the cut-off day still belongs to that statement.
export function cutOffFor(day: string, cutOffDay: number): string {
  const cutOff = chargeDayInMonth(toMonth(day), cutOffDay);
  return cutOff >= day ? cutOff : nextCharge(cutOffDay, cutOff);
}

export function dueFor(cutOffOn: string, paymentDay: number): string {
  return nextCharge(paymentDay, cutOffOn);
}

// The first installment absorbs the remainder, so the parts always add up to the purchase.
export function splitInstallments(amountCop: number, count: number): number[] {
  const share = Math.floor(amountCop / count);
  const amounts = Array<number>(count).fill(share);
  amounts[0] = amountCop - share * (count - 1);
  return amounts;
}

export function buildSchedule(
  amountCop: number,
  count: number,
  spentOn: string,
  cycle: Pick<CardCycle, 'cutOffDay' | 'paymentDay'>,
  monthlyRate = 0,
): Installment[] {
  let cutOffOn = cutOffFor(spentOn, cycle.cutOffDay);
  let remainingCop = amountCop;

  return splitInstallments(amountCop, count).map((capitalCop, index) => {
    // Each month's interest is charged on what is still owed.
    const interestCop = count > 1 ? Math.round((remainingCop * monthlyRate) / 100) : 0;
    remainingCop -= capitalCop;
    const installment = {
      number: index + 1,
      count,
      amountCop: capitalCop + interestCop,
      capitalCop,
      cutOffOn,
      dueOn: dueFor(cutOffOn, cycle.paymentDay),
    };
    cutOffOn = nextCharge(cycle.cutOffDay, cutOffOn);
    return installment;
  });
}

// Shows the oldest closed statement still unpaid, otherwise the cycle that is open today.
export function summarizeCard(
  cycle: CardCycle,
  purchases: CardPurchase[],
  records: StatementRecord[],
  today: string,
): CardSummary {
  const paid = new Set(
    records.filter((record) => record.paidOn !== null).map((record) => record.cutOffOn),
  );
  const items = purchases
    .flatMap((purchase) =>
      buildSchedule(
        purchase.amountCop,
        purchase.installments,
        purchase.spentOn,
        cycle,
        purchase.interestRate,
      ).map((installment) => ({
        ...installment,
        purchaseId: purchase.id,
        merchant: purchase.merchant,
        spentOn: purchase.spentOn,
      })),
    )
    .sort((a, b) => a.spentOn.localeCompare(b.spentOn));

  const unpaid = items.filter((item) => !paid.has(item.cutOffOn));
  const partialCop = records
    .filter((record) => record.paidOn === null)
    .reduce((sum, record) => sum + (record.paidCop ?? 0), 0);
  const usedCop = Math.max(
    unpaid.reduce((sum, item) => sum + item.capitalCop, 0) - partialCop,
    0,
  );
  const oldestClosed = unpaid
    .map((item) => item.cutOffOn)
    .filter((cutOffOn) => cutOffOn < today)
    .sort()[0];
  const cutOffOn = oldestClosed ?? cutOffFor(today, cycle.cutOffDay);
  const statementItems = unpaid.filter((item) => item.cutOffOn === cutOffOn);
  const record = records.find((row) => row.cutOffOn === cutOffOn);
  const totalCop = statementItems.reduce((sum, item) => sum + item.amountCop, 0);
  const paidCop = record?.paidCop ?? 0;

  return {
    statement: {
      cutOffOn,
      dueOn: dueFor(cutOffOn, cycle.paymentDay),
      totalCop,
      paidCop,
      balanceCop: Math.max(totalCop - paidCop, 0),
      minimumCop: record?.minimumCop ?? null,
      closed: cutOffOn < today,
      items: statementItems,
    },
    usedCop,
    availableCop: cycle.limitCop - usedCop,
  };
}

export function parseRate(text: string): number {
  const rate = Number(text.replace(',', '.'));
  return Number.isFinite(rate) && rate >= 0 ? rate : 0;
}
