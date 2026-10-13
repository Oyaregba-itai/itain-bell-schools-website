import { describe, expect, it } from "vitest";
import { feeBalances, type FeePayment, type SchoolFee } from "./feeWorksheet";

const fee: SchoolFee = {
  id: "tuition",
  name: "Tuition",
  amount: "500.50",
  class_id: "class-one",
  term_id: "term-one",
};
const payment = (
  id: string,
  amount: string,
  feeId: string | null = fee.id,
  student = "student-one",
): FeePayment => ({
  id,
  amount,
  student_id: student,
  fee_structure_id: feeId,
  notes: "Instalment",
  receipt_number: id,
  payment_date: "2026-10-13",
});
describe("school fee worksheet", () => {
  it("calculates exact balances after multiple instalments", () => {
    const [row] = feeBalances(
      [fee],
      [payment("p1", "100.10"), payment("p2", "200.20")],
      "student-one",
    );
    expect(row).toMatchObject({
      charge: 50050,
      received: 30030,
      balance: 20020,
      credit: 0,
    });
  });
  it("does not assign other pupils' or unallocated payments to a fee", () => {
    const [row] = feeBalances(
      [fee],
      [
        payment("p1", "100.10", null),
        payment("p2", "200.20", fee.id, "student-two"),
      ],
      "student-one",
    );
    expect(row.received).toBe(0);
    expect(row.balance).toBe(50050);
  });
  it("separates credit from outstanding fees instead of hiding debt", () => {
    const rows = feeBalances(
      [fee, { ...fee, id: "books", amount: "200.00" }],
      [payment("p1", "600.00")],
      "student-one",
    );
    expect(rows[0]).toMatchObject({ balance: 0, credit: 9950 });
    expect(rows[1]).toMatchObject({ balance: 20000, credit: 0 });
  });
  it("handles settled and zero-rated fees without inventing balances", () => {
    expect(
      feeBalances([fee], [payment("p1", "500.50")], "student-one")[0].balance,
    ).toBe(0);
    expect(
      feeBalances([{ ...fee, amount: 0 }], [], "student-one")[0].charge,
    ).toBe(0);
  });
  it("surfaces malformed amounts rather than displaying incorrect totals", () => {
    expect(() =>
      feeBalances([fee], [payment("p1", "100.123")], "student-one"),
    ).toThrow();
  });
});
