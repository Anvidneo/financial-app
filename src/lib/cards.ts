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
};

export type Installment = {
  number: number;
  count: number;
  amountCop: number;
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
};

export type Statement = {
  cutOffOn: string;
  dueOn: string;
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
): Installment[] {
  let cutOffOn = cutOffFor(spentOn, cycle.cutOffDay);

  return splitInstallments(amountCop, count).map((installmentCop, index) => {
    const installment = {
      number: index + 1,
      count,
      amountCop: installmentCop,
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
      buildSchedule(purchase.amountCop, purchase.installments, purchase.spentOn, cycle).map(
        (installment) => ({
          ...installment,
          purchaseId: purchase.id,
          merchant: purchase.merchant,
          spentOn: purchase.spentOn,
        }),
      ),
    )
    .sort((a, b) => a.spentOn.localeCompare(b.spentOn));

  const unpaid = items.filter((item) => !paid.has(item.cutOffOn));
  const usedCop = unpaid.reduce((sum, item) => sum + item.amountCop, 0);
  const oldestClosed = unpaid
    .map((item) => item.cutOffOn)
    .filter((cutOffOn) => cutOffOn < today)
    .sort()[0];
  const cutOffOn = oldestClosed ?? cutOffFor(today, cycle.cutOffDay);
  const statementItems = unpaid.filter((item) => item.cutOffOn === cutOffOn);

  return {
    statement: {
      cutOffOn,
      dueOn: dueFor(cutOffOn, cycle.paymentDay),
      balanceCop: statementItems.reduce((sum, item) => sum + item.amountCop, 0),
      minimumCop: records.find((record) => record.cutOffOn === cutOffOn)?.minimumCop ?? null,
      closed: cutOffOn < today,
      items: statementItems,
    },
    usedCop,
    availableCop: cycle.limitCop - usedCop,
  };
}
