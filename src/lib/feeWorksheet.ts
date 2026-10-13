import { parseMoney } from "./finance";

export interface SchoolFee {
  id: string;
  name: string;
  amount: number | string;
  class_id: string | null;
  term_id: string | null;
}
export interface FeePayment {
  id: string;
  student_id: string;
  fee_structure_id: string | null;
  amount: number | string;
  payment_date: string;
  receipt_number: string | null;
  notes: string | null;
}

export function feeBalances(
  fees: SchoolFee[],
  payments: FeePayment[],
  studentId: string,
) {
  const paid = new Map<string, number>();
  for (const payment of payments) {
    if (payment.student_id !== studentId || !payment.fee_structure_id) continue;
    const amount =
      Number(payment.amount) === 0 ? 0 : parseMoney(String(payment.amount));
    paid.set(
      payment.fee_structure_id,
      (paid.get(payment.fee_structure_id) || 0) + amount,
    );
  }
  return fees.map((fee) => {
    const charge =
      Number(fee.amount) === 0 ? 0 : parseMoney(String(fee.amount));
    const received = paid.get(fee.id) || 0;
    return {
      ...fee,
      charge,
      received,
      balance: Math.max(0, charge - received),
      credit: Math.max(0, received - charge),
    };
  });
}
