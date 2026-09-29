import { describe, expect, it } from "vitest";
import {
  csvCell,
  ledgerCsv,
  parseMoney,
  periodRange,
  type FinanceEntry,
} from "./finance";

describe("finance periods", () => {
  it("keeps a Monday–Sunday week together across calendar years", () => {
    expect(periodRange("week", "2027-01-01")).toEqual({
      start: "2026-12-28",
      end: "2027-01-03",
    });
    expect(periodRange("week", "2027-01-03")).toEqual({
      start: "2026-12-28",
      end: "2027-01-03",
    });
  });
  it("includes February 29 and the full selected calendar year", () => {
    expect(periodRange("month", "2028-02-18")).toEqual({
      start: "2028-02-01",
      end: "2028-02-29",
    });
    expect(periodRange("year", "2026-09-29")).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
  });
  it("rejects invalid dates instead of silently changing the report period", () => {
    expect(() => periodRange("month", "2026-02-30")).toThrow();
  });
});

describe("financial amounts", () => {
  it("preserves every kobo in item calculations", () => {
    expect(parseMoney("0.10") * 3 + parseMoney("1.01")).toBe(131);
    expect(parseMoney("1234567.89")).toBe(123456789);
  });
  it.each(["0", "-100", "1.001", "1e3", "1,000", "NaN", "", "99999999999"])(
    "rejects invalid amount %s",
    (value) => {
      expect(() => parseMoney(value)).toThrow();
    },
  );
});

describe("ledger export", () => {
  it("escapes quotes, newlines and spreadsheet formulas", () => {
    expect(csvCell('Receipt "A"\nB')).toBe('"Receipt ""A""\nB"');
    expect(csvCell(" =SUM(A1:A2)")).toBe('"\' =SUM(A1:A2)"');
  });
  it("keeps void records explicit and exports amounts in naira", () => {
    const csv = ledgerCsv([
      {
        id: "1",
        record_number: "IBS-FIN-000001",
        transaction_date: "2026-09-29",
        direction: "expense",
        amount_kobo: 123456,
        description: "Supplies",
        status: "void",
        void_reason: "Duplicate entry",
      } as FinanceEntry,
    ]);
    expect(csv).toContain('"1234.56"');
    expect(csv).toContain('"void","Duplicate entry"');
    expect(csv).toContain("Expense NGN");
  });
});
