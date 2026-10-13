import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { financeClient } from "@/lib/financeApi";
import {
  csvCell,
  localDate,
  money,
  parseMoney,
  paymentMethods,
} from "@/lib/finance";
import {
  feeBalances,
  type FeePayment,
  type SchoolFee,
} from "@/lib/feeWorksheet";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Student {
  id: string;
  full_name: string;
  class_id: string | null;
}
interface Term {
  id: string;
  name: string;
}
const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const message = (error: unknown) =>
  error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Please try again.";
async function readAll<T>(
  table: string,
  columns: string,
  student?: string,
): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = financeClient
      .from(table)
      .select(columns)
      .order("id")
      .range(offset, offset + 499);
    if (student) query = query.eq("student_id", student);
    const { data, error } = await query;
    if (error) throw error;
    result.push(...(data as unknown as T[]));
    if (data.length < 500) return result;
  }
}

export function SchoolFeeWorksheet() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [recording, setRecording] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(localDate());
  const [method, setMethod] = useState("bank_transfer");
  const [receipt, setReceipt] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [saved, setSaved] = useState("");
  const lookup = useQuery({
    queryKey: ["fee-worksheet", "lookup", user?.id],
    queryFn: async () => {
      const [students, fees, terms] = await Promise.all([
        readAll<Student>("students", "id,full_name,class_id"),
        readAll<SchoolFee>("fee_structures", "id,name,amount,class_id,term_id"),
        readAll<Term>("terms", "id,name"),
      ]);
      return {
        students: students.sort((a, b) =>
          (a.full_name || "").localeCompare(b.full_name || ""),
        ),
        fees,
        terms,
      };
    },
  });
  const payments = useQuery({
    queryKey: ["fee-worksheet", "payments", user?.id, studentId],
    enabled: !!studentId,
    queryFn: () =>
      readAll<FeePayment>(
        "payments",
        "id,student_id,fee_structure_id,amount,payment_date,receipt_number,notes",
        studentId,
      ),
  });
  const student = lookup.data?.students.find((s) => s.id === studentId);
  const applicable = (lookup.data?.fees || []).filter(
    (f) =>
      (!f.class_id || f.class_id === student?.class_id) &&
      (termId === "all" || f.term_id === termId),
  );
  let calculationError = "";
  let rows: ReturnType<typeof feeBalances> = [];
  try {
    rows = feeBalances(applicable, payments.data || [], studentId);
  } catch (error) {
    calculationError = `A fee or payment has an invalid amount: ${message(error)}`;
  }
  const chosen = rows.filter((r) => selected.includes(r.id));
  const totals = chosen.reduce(
    (s, r) => ({
      charge: s.charge + r.charge,
      received: s.received + r.received,
      balance: s.balance + r.balance,
      credit: s.credit + r.credit,
    }),
    { charge: 0, received: 0, balance: 0, credit: 0 },
  );
  const active = rows.find((r) => r.id === recording);
  const termName = (id: string | null) =>
    lookup.data?.terms.find((t) => t.id === id)?.name ||
    (id ? "Unknown term" : "Not term-specific");
  const save = useMutation({
    mutationFn: async () => {
      if (!user || !student || !active)
        throw new Error("Select a student and fee.");
      if (!reason.trim()) throw new Error("Enter the reason for this payment.");
      if (!date || !receipt.trim())
        throw new Error("Enter a payment date and receipt reference.");
      const kobo = parseMoney(amount);
      if (kobo > active.balance)
        throw new Error(
          "The payment exceeds the remaining balance for this fee.",
        );
      const record = {
        id: paymentId,
        student_id: studentId,
        fee_structure_id: active.id,
        amount: kobo / 100,
        payment_date: date,
        payment_method: method,
        receipt_number: receipt.trim(),
        notes: reason.trim(),
        recorded_by: user.id,
      };
      const { error } = await financeClient.from("payments").insert(record);
      if (error) {
        // A retry after a lost response must not create a second receipt.
        if (error.code !== "23505") throw error;
        const existing = await financeClient
          .from("payments")
          .select(
            "id,student_id,fee_structure_id,amount,payment_date,payment_method,receipt_number,notes",
          )
          .eq("id", paymentId)
          .single();
        if (
          existing.error ||
          !existing.data ||
          Object.entries(record).some(
            ([key, value]) =>
              key !== "recorded_by" &&
              String(existing.data[key]) !== String(value),
          )
        )
          throw error;
      }
      return receipt.trim();
    },
    onSuccess: async (reference) => {
      setSaved(
        `Payment recorded. Receipt: ${reference}. It is also included in school income.`,
      );
      setRecording(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["fee-worksheet", "payments"],
        }),
        queryClient.invalidateQueries({ queryKey: ["all-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["school-finance"] }),
      ]);
    },
  });
  const exportWorksheet = () => {
    const data = [
      ["Itain-Bell Schools", "School fee calculation", student?.full_name],
      [
        "Fee",
        "Term",
        "Charge NGN",
        "Received NGN",
        "Balance NGN",
        "Credit NGN",
      ],
      ...chosen.map((r) => [
        r.name,
        termName(r.term_id),
        (r.charge / 100).toFixed(2),
        (r.received / 100).toFixed(2),
        (r.balance / 100).toFixed(2),
        (r.credit / 100).toFixed(2),
      ]),
      [
        "TOTAL",
        "",
        ...[totals.charge, totals.received, totals.balance, totals.credit].map(
          (v) => (v / 100).toFixed(2),
        ),
      ],
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + data.map((r) => r.map(csvCell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8;" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `school-fee-calculation-${localDate()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="worksheet-student">Student for fee calculation</Label>
          <select
            id="worksheet-student"
            className={selectClass}
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setSelected([]);
              setSaved("");
            }}
          >
            <option value="">Choose a student</option>
            {lookup.data?.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="worksheet-term">Fee term</Label>
          <select
            id="worksheet-term"
            className={selectClass}
            value={termId}
            onChange={(e) => {
              setTermId(e.target.value);
              setSelected([]);
            }}
          >
            <option value="all">All fee terms</option>
            {lookup.data?.terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {lookup.isLoading ? (
        <p role="status">Loading fee structures and students…</p>
      ) : lookup.error ? (
        <p role="alert">
          Could not load fee data: {message(lookup.error)}{" "}
          <Button variant="outline" onClick={() => lookup.refetch()}>
            Retry
          </Button>
        </p>
      ) : !student ? (
        <p className="rounded-xl border p-6 text-muted-foreground">
          Choose a student to calculate their school fee payments.
        </p>
      ) : payments.isLoading ? (
        <p role="status">Loading this student's payments…</p>
      ) : payments.error ? (
        <p role="alert">
          Could not load payments: {message(payments.error)}{" "}
          <Button variant="outline" onClick={() => payments.refetch()}>
            Retry
          </Button>
        </p>
      ) : calculationError ? (
        <p role="alert">{calculationError}</p>
      ) : (
        <>
          {saved && (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 p-3 text-emerald-800"
            >
              {saved}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!chosen.length}
              onClick={exportWorksheet}
            >
              <Download size={16} /> Export selected fees
            </Button>
            <Button
              variant="outline"
              disabled={!chosen.length}
              onClick={() => window.print()}
            >
              <Printer size={16} /> Print fee calculation
            </Button>
          </div>
          <section className="finance-print-area rounded-xl border bg-card p-4 sm:p-6 space-y-4">
            <header>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold">
                Itain-Bell Schools · Finance office
              </p>
              <h4 className="font-heading text-xl mt-2">
                School fee calculation
              </h4>
              <p>
                {student.full_name} · {localDate()}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Select the charges that apply. Balances use current fee rates
                and payments linked to each fee. This calculation is not an
                issued invoice; unallocated payments are shown separately below.
              </p>
            </header>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Selected charges", totals.charge],
                ["Payments received", totals.received],
                ["Remaining balance", totals.balance],
                ["Credit", totals.credit],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold break-words">
                    {money(Number(value))}
                  </p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                aria-label="School fee calculation table"
              >
                <thead className="bg-muted">
                  <tr>
                    {[
                      "Include",
                      "Fee / term",
                      "Current charge",
                      "Received",
                      "Balance",
                      "Credit",
                      "Payment",
                    ].map((h) => (
                      <th key={h} className="p-3 text-left whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b ${selected.includes(row.id) ? "" : "print:hidden"}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          aria-label={`Include ${row.name}`}
                          checked={selected.includes(row.id)}
                          onChange={(e) =>
                            setSelected((old) =>
                              e.target.checked
                                ? [...old, row.id]
                                : old.filter((id) => id !== row.id),
                            )
                          }
                        />
                      </td>
                      <td className="p-3 min-w-40">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {termName(row.term_id)}
                        </p>
                      </td>
                      {[row.charge, row.received, row.balance, row.credit].map(
                        (v, i) => (
                          <td key={i} className="p-3 whitespace-nowrap">
                            {money(v)}
                          </td>
                        ),
                      )}
                      <td className="p-3 print:hidden">
                        <Button
                          aria-label={`Record payment for ${row.name}`}
                          size="sm"
                          variant="outline"
                          disabled={
                            !row.balance ||
                            payments.isFetching ||
                            save.isPending
                          }
                          onClick={() => {
                            const id = crypto.randomUUID();
                            setPaymentId(id);
                            setRecording(row.id);
                            setAmount((row.balance / 100).toFixed(2));
                            setReason("");
                            setReceipt(
                              `IBS-PAY-${localDate().replace(/-/g, "")}-${id.slice(0, 8).toUpperCase()}`,
                            );
                            setDate(localDate());
                            save.reset();
                          }}
                        >
                          Record payment
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center">
                        No fee structures match this student's class and term.
                        Add them under Fee Structures.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Prepared by: {profile?.full_name || "Finance office"}. Fees
              without a term are shown only under “All fee terms”. Optional
              charges should be selected only when applicable.
            </p>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">
                Payment records and reasons
              </h4>
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm"
                  aria-label="Student payment records and reasons"
                >
                  <thead className="bg-muted">
                    <tr>
                      {["Date", "Receipt", "Fee", "Reason", "Amount"].map(
                        (h) => (
                          <th key={h} className="p-2 text-left">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(payments.data || [])
                      .filter(
                        (p) =>
                          termId === "all" ||
                          applicable.some((f) => f.id === p.fee_structure_id),
                      )
                      .sort((a, b) =>
                        b.payment_date.localeCompare(a.payment_date),
                      )
                      .map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="p-2 whitespace-nowrap">
                            {p.payment_date}
                          </td>
                          <td className="p-2">
                            {p.receipt_number || "Not recorded"}
                          </td>
                          <td className="p-2">
                            {lookup.data?.fees.find(
                              (f) => f.id === p.fee_structure_id,
                            )?.name || "Unallocated payment"}
                          </td>
                          <td className="p-2 min-w-40 whitespace-pre-wrap break-words">
                            {p.notes || "Reason not recorded"}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {money(Math.round(Number(p.amount) * 100))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!payments.data?.length && (
                  <p className="p-4 text-muted-foreground">
                    No payments recorded for this student.
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
      <Dialog
        open={!!recording}
        onOpenChange={(open) => {
          if (!open && !save.isPending) setRecording(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record school fee payment</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <p>
              {student?.full_name} · {active?.name}
            </p>
            <p className="text-sm">
              Remaining balance: {money(active?.balance || 0)}
            </p>
            <div>
              <Label htmlFor="worksheet-amount">Payment amount (NGN)</Label>
              <Input
                id="worksheet-amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="worksheet-reason">Reason for payment</Label>
              <Textarea
                id="worksheet-reason"
                required
                maxLength={3000}
                placeholder="e.g. First instalment of first-term tuition"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="worksheet-date">Payment date</Label>
                <Input
                  id="worksheet-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="worksheet-method">Payment method</Label>
                <select
                  id="worksheet-method"
                  className={selectClass}
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="worksheet-receipt">Receipt reference</Label>
              <Input
                id="worksheet-receipt"
                required
                maxLength={200}
                value={receipt}
                onChange={(e) => setReceipt(e.target.value)}
              />
            </div>
            {save.error && (
              <p role="alert" className="text-destructive">
                {message(save.error)}
              </p>
            )}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save fee payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
