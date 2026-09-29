export type FinancePeriod = "week" | "month" | "year" | "custom";
export type FinanceDirection = "income" | "expense";

export const incomeCategories = [
  "School fees",
  "Event income",
  "Donations",
  "Grants",
  "Transport",
  "Uniforms and books",
  "Other income",
];
export const expenseCategories = [
  "Salaries and wages",
  "Teaching supplies",
  "Utilities",
  "Maintenance",
  "Food and catering",
  "Transport",
  "Event costs",
  "Equipment",
  "Rent",
  "Other expenses",
];
export const paymentMethods = [
  "cash",
  "bank_transfer",
  "pos",
  "cheque",
  "online",
];

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function periodRange(
  period: Exclude<FinancePeriod, "custom">,
  anchor: string,
) {
  const date = new Date(`${anchor}T12:00:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(anchor) ||
    Number.isNaN(date.getTime()) ||
    localDate(date) !== anchor
  )
    throw new Error("Choose a valid date.");
  const start = new Date(date);
  const end = new Date(date);
  if (period === "week") {
    start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (period === "month") {
    start.setDate(1);
    end.setMonth(date.getMonth() + 1, 0);
  } else {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }
  return { start: localDate(start), end: localDate(end) };
}

// Parse decimal strings as integer kobo, avoiding floating-point rounding.
export function parseMoney(value: string): number {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value.trim()))
    throw new Error("Enter a positive amount with up to two decimal places.");
  const [whole, fraction = ""] = value.trim().split(".");
  const kobo = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (kobo <= 0 || !Number.isSafeInteger(kobo))
    throw new Error("Amount must be greater than zero.");
  return kobo;
}

export function money(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
}

export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export interface FinanceEntry {
  id: string;
  record_number: string;
  transaction_date: string;
  direction: FinanceDirection;
  amount_kobo: number;
  category: string;
  description: string;
  counterparty: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  event_id: string | null;
  event_name: string | null;
  document_path: string | null;
  status: "posted" | "void";
  void_reason: string | null;
  source_payment_id: string | null;
  recorded_by: string | null;
  recorded_by_name: string;
  created_at: string;
  line_items: { description: string; quantity: number; unit_kobo: number }[];
}

export interface FinanceReport {
  income_kobo: number;
  expense_kobo: number;
  net_kobo: number;
  count: number;
  entries: FinanceEntry[];
  total_entries: number;
  monthly: {
    month: string;
    income_kobo: number;
    expense_kobo: number;
    net_kobo: number;
  }[];
  categories: {
    category: string;
    direction: FinanceDirection;
    amount_kobo: number;
  }[];
  events: {
    event_id: string | null;
    event_name: string;
    income_kobo: number;
    expense_kobo: number;
    net_kobo: number;
  }[];
}

export function ledgerCsv(entries: FinanceEntry[]) {
  const rows: unknown[][] = [
    [
      "Record",
      "Date",
      "Type",
      "Category",
      "Description",
      "Payer / payee",
      "Income NGN",
      "Expense NGN",
      "Event",
      "Method",
      "Reference",
      "Status",
      "Void reason",
      "Recorded by",
      "Recorded at",
      "Notes",
    ],
  ];
  for (const e of entries)
    rows.push([
      e.record_number,
      e.transaction_date,
      e.direction,
      e.category,
      e.description,
      e.counterparty,
      e.direction === "income" ? (e.amount_kobo / 100).toFixed(2) : "",
      e.direction === "expense" ? (e.amount_kobo / 100).toFixed(2) : "",
      e.event_name || "General school",
      e.payment_method,
      e.reference,
      e.status,
      e.void_reason,
      e.recorded_by_name,
      e.created_at,
      e.notes,
    ]);
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
