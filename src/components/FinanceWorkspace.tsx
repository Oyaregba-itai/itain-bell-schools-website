import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { StudentFeesView } from "@/components/StudentFeesView";
import {
  fetchFinanceEvents,
  fetchFinanceReport,
  financeClient,
} from "@/lib/financeApi";
import {
  expenseCategories,
  incomeCategories,
  ledgerCsv,
  localDate,
  money,
  parseMoney,
  paymentMethods,
  periodRange,
  type FinanceDirection,
  type FinanceEntry,
  type FinancePeriod,
  type FinanceReport,
} from "@/lib/finance";
import "./finance.css";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "Please try again.";

export function FinanceWorkspace() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"ledger" | "reports" | "fees">("ledger");
  const [period, setPeriod] = useState<FinancePeriod>("month");
  const [anchor, setAnchor] = useState(localDate());
  const [customStart, setCustomStart] = useState(localDate());
  const [customEnd, setCustomEnd] = useState(localDate());
  const [event, setEvent] = useState("all");
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState<FinanceDirection | null>(null);
  const [selected, setSelected] = useState<FinanceEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const range =
    period === "custom"
      ? { start: customStart, end: customEnd }
      : periodRange(period, anchor);
  const validRange = !!range.start && !!range.end && range.start <= range.end;
  const access = useQuery({
    queryKey: ["finance-access", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await financeClient.rpc(
        "can_manage_school_finance",
      );
      if (error) throw error;
      return data === true;
    },
  });
  const events = useQuery({
    queryKey: ["finance-events", user?.id],
    queryFn: fetchFinanceEvents,
    enabled: access.data === true,
  });
  const report = useQuery({
    queryKey: ["school-finance", user?.id, range.start, range.end, event, page],
    queryFn: () => fetchFinanceReport(range.start, range.end, event, page * 50),
    enabled: access.data === true && validRange,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["school-finance"] });
    queryClient.invalidateQueries({ queryKey: ["all-payments"] });
  };
  const eventName =
    event === "all"
      ? "All school activities"
      : event === "none"
        ? "General school (no event)"
        : events.data?.find((e) => e.id === event)?.title || "Selected event";

  const exportCsv = async () => {
    setExporting(true);
    try {
      const entries: FinanceEntry[] = [];
      for (let offset = 0; ; offset += 1000) {
        const batch = await fetchFinanceReport(
          range.start,
          range.end,
          event,
          offset,
          1000,
        );
        entries.push(...batch.entries);
        if (entries.length >= batch.total_entries || batch.entries.length === 0)
          break;
      }
      const url = URL.createObjectURL(
        new Blob([ledgerCsv(entries)], { type: "text/csv;charset=utf-8;" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `Itain-Bell-finance-${range.start}-to-${range.end}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast({
        title: "Export failed",
        description: errorText(error),
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (access.isLoading)
    return (
      <p role="status" className="p-8 text-muted-foreground">
        Loading finance workspace…
      </p>
    );
  if (access.error)
    return (
      <div role="alert" className="rounded-xl border p-6 space-y-3">
        <h3 className="font-heading text-xl">
          Finance workspace is not available yet
        </h3>
        <p>
          The school finance database update needs to be installed, or the
          connection needs to be restored. No records have been changed.
        </p>
        <p className="text-sm text-muted-foreground">
          {errorText(access.error)}
        </p>
        <Button variant="outline" onClick={() => access.refetch()}>
          Try again
        </Button>
      </div>
    );
  if (!access.data)
    return (
      <p role="alert" className="p-8">
        This workspace is available to the school administrators and authorised
        finance staff.
      </p>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Banknote className="text-primary" />
            <h2 className="font-heading text-2xl">School finances</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Income, spending and financial reports for Itain-Bell Schools.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAdding("expense")}>
            <ArrowUpRight size={16} /> Record spending
          </Button>
          <Button onClick={() => setAdding("income")}>
            <Plus size={16} /> Record income
          </Button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Finance sections"
      >
        {(
          [
            ["ledger", "Transaction register"],
            ["reports", "Reports"],
            ["fees", "Student fees"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            role="tab"
            aria-selected={tab === id}
            variant={tab === id ? "default" : "outline"}
            onClick={() => {
              setTab(id);
              refresh();
            }}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="ghost"
          onClick={() => {
            setPeriod("year");
            setPage(0);
            setTab("reports");
          }}
        >
          Annual profit &amp; loss
        </Button>
      </div>

      {tab === "fees" ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-primary/5 p-4 text-sm">
            Student payments recorded here automatically appear once in the
            school transaction register. Use “Record income” for other receipts.
          </p>
          <StudentFeesView />
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-card p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="finance-period">Period</Label>
              <select
                id="finance-period"
                className={selectClass}
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value as FinancePeriod);
                  setPage(0);
                }}
              >
                <option value="week">Week (Monday–Sunday)</option>
                <option value="month">Month</option>
                <option value="year">Year (January–December)</option>
                <option value="custom">Custom dates</option>
              </select>
            </div>
            {period === "custom" ? (
              <>
                <div>
                  <Label htmlFor="finance-start">From</Label>
                  <Input
                    id="finance-start"
                    type="date"
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="finance-end">To</Label>
                  <Input
                    id="finance-end"
                    type="date"
                    value={customEnd}
                    onChange={(e) => {
                      setCustomEnd(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="finance-date">
                  {period === "year"
                    ? "Choose year"
                    : period === "month"
                      ? "Choose month"
                      : "Date in week"}
                </Label>
                <Input
                  id="finance-date"
                  type={
                    period === "year"
                      ? "number"
                      : period === "month"
                        ? "month"
                        : "date"
                  }
                  min={period === "year" ? "2000" : undefined}
                  max={period === "year" ? "2100" : undefined}
                  value={
                    period === "year"
                      ? anchor.slice(0, 4)
                      : period === "month"
                        ? anchor.slice(0, 7)
                        : anchor
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    if (
                      period === "year" &&
                      (!/^\d{4}$/.test(v) || +v < 2000 || +v > 2100)
                    )
                      return;
                    setAnchor(
                      period === "year"
                        ? `${v}-01-01`
                        : period === "month"
                          ? `${v}-01`
                          : v,
                    );
                    setPage(0);
                  }}
                />
              </div>
            )}
            <div>
              <Label htmlFor="finance-event-filter">School event</Label>
              <select
                id="finance-event-filter"
                className={selectClass}
                value={event}
                onChange={(e) => {
                  setEvent(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All school activities</option>
                <option value="none">General school (no event)</option>
                {events.data?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                    {e.start_date ? ` (${e.start_date})` : ""}
                  </option>
                ))}
              </select>
              {events.error && (
                <p role="alert" className="text-xs text-destructive">
                  Events could not load.{" "}
                  <button
                    className="underline"
                    onClick={() => events.refetch()}
                  >
                    Retry
                  </button>
                </p>
              )}
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                title="Refresh records"
                aria-label="Refresh records"
                onClick={refresh}
              >
                <RefreshCw size={16} />
              </Button>
              <Button
                variant="outline"
                disabled={
                  !report.data || report.isFetching || exporting || !validRange
                }
                onClick={exportCsv}
              >
                <Download size={16} /> {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            </div>
          </div>
          {!validRange ? (
            <p role="alert" className="text-destructive">
              Choose a start date on or before the end date.
            </p>
          ) : report.isLoading ? (
            <p role="status" className="p-8 text-muted-foreground">
              Calculating school finances…
            </p>
          ) : report.error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 p-5"
            >
              <p>Could not load financial records: {errorText(report.error)}</p>
              <Button variant="outline" onClick={() => report.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            report.data && (
              <>
                <p className="text-sm text-muted-foreground">
                  {dateLabel(range.start)} – {dateLabel(range.end)} ·{" "}
                  {eventName} · {report.data.count} posted records
                  {report.isFetching ? " · Updating…" : ""}
                </p>
                <FinanceTotals report={report.data} />
                {tab === "ledger" ? (
                  <>
                    <div className="rounded-xl border bg-card overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            {[
                              "Record / date",
                              "Details",
                              "Event",
                              "Income",
                              "Spending",
                              "Status",
                              "",
                            ].map((h, i) => (
                              <th
                                className="p-3 text-left font-medium whitespace-nowrap"
                                key={i}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {report.data.entries.map((entry) => (
                            <tr
                              key={entry.id}
                              className={`border-t ${entry.status === "void" ? "text-muted-foreground bg-muted/30" : ""}`}
                            >
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-mono text-xs">
                                  {entry.record_number}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {dateLabel(entry.transaction_date)}
                                </div>
                              </td>
                              <td className="p-3 min-w-48">
                                <p className="font-medium">
                                  {entry.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.counterparty} · {entry.category}
                                </p>
                                {entry.source_payment_id && (
                                  <span className="text-xs text-primary">
                                    Student fee receipt
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                {entry.event_name || "General school"}
                              </td>
                              <td className="p-3 text-emerald-700 whitespace-nowrap">
                                {entry.direction === "income"
                                  ? money(entry.amount_kobo)
                                  : "—"}
                              </td>
                              <td className="p-3 text-rose-700 whitespace-nowrap">
                                {entry.direction === "expense"
                                  ? money(entry.amount_kobo)
                                  : "—"}
                              </td>
                              <td className="p-3 capitalize">{entry.status}</td>
                              <td className="p-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelected(entry)}
                                >
                                  View record
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {!report.data.entries.length && (
                            <tr>
                              <td
                                colSpan={7}
                                className="p-10 text-center text-muted-foreground"
                              >
                                No financial records for these dates and event.
                                Record income or spending to get started.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center gap-3 text-sm">
                      <p>
                        {report.data.total_entries} records including voids.
                        Voids are excluded from totals.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 0 || report.isFetching}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          <ChevronLeft size={14} /> Previous
                        </Button>
                        <span className="py-2">Page {page + 1}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            (page + 1) * 50 >= report.data.total_entries ||
                            report.isFetching
                          }
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <FinanceStatement
                    report={report.data}
                    start={range.start}
                    end={range.end}
                    eventName={eventName}
                    annual={period === "year"}
                    preparedBy={profile?.full_name || "Finance office"}
                  />
                )}
              </>
            )
          )}
        </>
      )}
      <Dialog
        open={adding !== null}
        onOpenChange={(open) => !open && setAdding(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {adding === "expense"
                ? "Record school spending"
                : "Record money received"}
            </DialogTitle>
          </DialogHeader>
          {adding && (
            <FinanceEntryForm
              key={adding}
              direction={adding}
              events={events.data || []}
              onSaved={() => {
                setAdding(null);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Financial record</DialogTitle>
          </DialogHeader>
          {selected && (
            <FinanceRecord
              entry={selected}
              onVoided={() => {
                setSelected(null);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinanceTotals({ report }: { report: FinanceReport }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        {
          label: "Money received",
          amount: report.income_kobo,
          icon: ArrowDownLeft,
          color: "text-emerald-700",
        },
        {
          label: "Money spent",
          amount: report.expense_kobo,
          icon: ArrowUpRight,
          color: "text-rose-700",
        },
        {
          label:
            report.net_kobo < 0 ? "Net loss / deficit" : "Net profit / surplus",
          amount: report.net_kobo,
          icon: Banknote,
          color: report.net_kobo < 0 ? "text-rose-700" : "text-primary",
        },
      ].map((item) => (
        <div key={item.label} className="rounded-xl border bg-card p-5">
          <item.icon size={20} className={item.color} />
          <p className="mt-3 text-sm text-muted-foreground">{item.label}</p>
          <p className={`mt-1 font-heading text-2xl break-words ${item.color}`}>
            {money(item.amount)}
          </p>
        </div>
      ))}
    </div>
  );
}

function FinanceStatement({
  report,
  start,
  end,
  eventName,
  annual,
  preparedBy,
}: {
  report: FinanceReport;
  start: string;
  end: string;
  eventName: string;
  annual: boolean;
  preparedBy: string;
}) {
  const months = [];
  for (
    let date = new Date(`${start.slice(0, 7)}-01T12:00:00`);
    localDate(date).slice(0, 7) <= end.slice(0, 7);
    date.setMonth(date.getMonth() + 1)
  ) {
    const key = localDate(date).slice(0, 7);
    months.push(
      report.monthly.find((m) => m.month === key) || {
        month: key,
        income_kobo: 0,
        expense_kobo: 0,
        net_kobo: 0,
      },
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer size={16} /> Print / save PDF
        </Button>
      </div>
      <section className="finance-print-area rounded-xl border bg-card p-5 sm:p-8 space-y-6">
        <header className="border-b pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Itain-Bell Schools · Finance office
          </p>
          <h3 className="font-heading text-2xl mt-2">
            {annual
              ? "Annual profit & loss statement"
              : "Income & expenditure statement"}
          </h3>
          <p className="mt-2">
            {dateLabel(start)} – {dateLabel(end)}
          </p>
          <p className="text-sm text-muted-foreground">
            {eventName} · Currency: Nigerian naira (NGN)
          </p>
        </header>
        <FinanceTotals report={report} />
        <p className="text-sm text-muted-foreground">
          Cash basis: money received minus money paid during this period. Unpaid
          fees and unpaid bills are excluded. Void records are excluded.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {(["income", "expense"] as const).map((direction) => (
            <div key={direction}>
              <h4 className="font-semibold mb-2">
                {direction === "income"
                  ? "Income by category"
                  : "Spending by category"}
              </h4>
              <table className="w-full text-sm">
                <tbody>
                  {report.categories
                    .filter((c) => c.direction === direction)
                    .map((c) => (
                      <tr className="border-b" key={c.category}>
                        <td className="py-2">{c.category}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          {money(c.amount_kobo)}
                        </td>
                      </tr>
                    ))}
                  <tr className="font-semibold">
                    <td className="py-3">Total</td>
                    <td className="py-3 text-right">
                      {money(
                        direction === "income"
                          ? report.income_kobo
                          : report.expense_kobo,
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <StatementTable
          title="Monthly breakdown"
          rows={months.map((m) => ({
            label: new Date(`${m.month}-01T12:00:00`).toLocaleDateString(
              "en-GB",
              { month: "long", year: "numeric" },
            ),
            ...m,
          }))}
        />
        <StatementTable
          title="Event breakdown"
          rows={report.events.map((e) => ({ label: e.event_name, ...e }))}
        />
        <footer className="border-t pt-5 text-sm space-y-4">
          <p>
            Prepared by: {preparedBy} · Generated:{" "}
            {new Date().toLocaleString("en-GB")}
          </p>
          <div className="grid grid-cols-2 gap-8 pt-8">
            <p className="border-t pt-2">Prepared by / signature / date</p>
            <p className="border-t pt-2">Reviewed by / signature / date</p>
          </div>
        </footer>
      </section>
    </div>
  );
}

function StatementTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    label: string;
    income_kobo: number;
    expense_kobo: number;
    net_kobo: number;
  }[];
}) {
  return (
    <div>
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Period / event</th>
              <th className="p-2 text-right">Received</th>
              <th className="p-2 text-right">Spent</th>
              <th className="p-2 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, index) => (
              <tr className="border-b" key={`${r.label}-${index}`}>
                <td className="p-2">{r.label}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  {money(r.income_kobo)}
                </td>
                <td className="p-2 text-right whitespace-nowrap">
                  {money(r.expense_kobo)}
                </td>
                <td className="p-2 text-right whitespace-nowrap">
                  {money(r.net_kobo)}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="p-4 text-muted-foreground">
                  No posted transactions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinanceEntryForm({
  direction,
  events,
  onSaved,
}: {
  direction: FinanceDirection;
  events: { id: string; title: string }[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [id] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    date: localDate(),
    category: direction === "income" ? "Other income" : "Other expenses",
    description: "",
    counterparty: "",
    amount: "",
    method: "bank_transfer",
    reference: "",
    event: "none",
    notes: "",
  });
  const [document, setDocument] = useState<File | null>(null);
  const [calculate, setCalculate] = useState(false);
  const [items, setItems] = useState([
    { description: "", quantity: "1", price: "" },
  ]);
  const [formError, setFormError] = useState("");
  const itemTotal = items.reduce((sum, item) => {
    try {
      return sum + parseMoney(item.price) * (Number(item.quantity) || 0);
    } catch {
      return sum;
    }
  }, 0);
  const save = useMutation({
    mutationFn: async () => {
      setFormError("");
      const amount = calculate ? itemTotal : parseMoney(form.amount);
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 999999999999)
        throw new Error("Enter an amount between ₦0.01 and ₦9,999,999,999.99.");
      if (!form.date || !form.description.trim() || !form.counterparty.trim())
        throw new Error("Enter the date, description and payer or payee.");
      if (
        calculate &&
        items.some(
          (item) =>
            !item.description.trim() ||
            !/^\d+$/.test(item.quantity) ||
            Number(item.quantity) < 1 ||
            Number(item.quantity) > 1000000,
        )
      )
        throw new Error(
          "Each calculation line needs a description and a whole quantity between 1 and 1,000,000.",
        );
      const lineItems = calculate
        ? items.map((item) => ({
            description: item.description.trim(),
            quantity: Number(item.quantity),
            unit_kobo: parseMoney(item.price),
          }))
        : [];
      let path: string | null = null;
      if (document) {
        if (
          document.size > 10 * 1024 * 1024 ||
          ![
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(document.type)
        )
          throw new Error(
            "Choose a PDF, JPG, PNG or WebP document up to 10 MB.",
          );
        path = `${id}/${crypto.randomUUID()}.${document.type === "application/pdf" ? "pdf" : document.type.split("/")[1]}`;
        const { error } = await financeClient.storage
          .from("finance-documents")
          .upload(path, document);
        if (error) throw error;
      }
      const { error } = await financeClient
        .from("finance_entries")
        .insert({
          id,
          direction,
          amount_kobo: amount,
          transaction_date: form.date,
          category: form.category,
          description: form.description.trim(),
          counterparty: form.counterparty.trim(),
          payment_method: form.method,
          reference: form.reference.trim() || null,
          notes: form.notes.trim() || null,
          event_id: form.event === "none" ? null : form.event,
          document_path: path,
          line_items: lineItems,
        });
      if (error) {
        if (path)
          await financeClient.storage.from("finance-documents").remove([path]);
        if (error.code === "23505") {
          const existing = await financeClient
            .from("finance_entries")
            .select("id")
            .eq("id", id)
            .maybeSingle();
          if (existing.data) return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: direction === "income" ? "Income recorded" : "Spending recorded",
        description:
          "Your numbered record has been saved to the school ledger.",
      });
      onSaved();
    },
    onError: (error) => setFormError(errorText(error)),
  });
  const update = (key: keyof typeof form, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        {direction === "income"
          ? "For student fee payments, use the Student fees tab so the receipt stays linked to the student."
          : "Record money actually paid out by the school."}
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="entry-date">Transaction date *</Label>
          <Input
            id="entry-date"
            required
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="entry-category">Category *</Label>
          <select
            id="entry-category"
            className={selectClass}
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
          >
            {(direction === "income"
              ? incomeCategories
              : expenseCategories
            ).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="entry-description">Description / purpose *</Label>
        <Input
          id="entry-description"
          required
          maxLength={500}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder={
            direction === "income"
              ? "e.g. Sports day ticket sales"
              : "e.g. Catering for sports day"
          }
        />
      </div>
      <div>
        <Label htmlFor="entry-counterparty">
          {direction === "income" ? "Received from" : "Paid to"} *
        </Label>
        <Input
          id="entry-counterparty"
          required
          maxLength={200}
          value={form.counterparty}
          onChange={(e) => update("counterparty", e.target.value)}
          placeholder="Person or organisation"
        />
      </div>
      <label className="flex gap-2 items-center text-sm">
        <input
          type="checkbox"
          checked={calculate}
          onChange={(e) => setCalculate(e.target.checked)}
        />{" "}
        Calculate total from items
      </label>
      {calculate && (
        <div className="rounded-lg border p-3 space-y-3">
          {items.map((item, index) => (
            <div
              className="grid grid-cols-[1fr_65px_110px_30px] gap-2"
              key={index}
            >
              <Input
                aria-label={`Item ${index + 1} description`}
                placeholder="Item"
                maxLength={200}
                required
                value={item.description}
                onChange={(e) =>
                  setItems((old) =>
                    old.map((v, i) =>
                      i === index ? { ...v, description: e.target.value } : v,
                    ),
                  )
                }
              />
              <Input
                aria-label={`Item ${index + 1} quantity`}
                type="number"
                min="1"
                max="1000000"
                step="1"
                required
                value={item.quantity}
                onChange={(e) =>
                  setItems((old) =>
                    old.map((v, i) =>
                      i === index ? { ...v, quantity: e.target.value } : v,
                    ),
                  )
                }
              />
              <Input
                aria-label={`Item ${index + 1} unit price in naira`}
                placeholder="Unit ₦"
                inputMode="decimal"
                required
                value={item.price}
                onChange={(e) =>
                  setItems((old) =>
                    old.map((v, i) =>
                      i === index ? { ...v, price: e.target.value } : v,
                    ),
                  )
                }
              />
              <button
                type="button"
                aria-label={`Remove item ${index + 1}`}
                disabled={items.length === 1}
                onClick={() =>
                  setItems((old) => old.filter((_, i) => i !== index))
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={items.length >= 50}
            onClick={() =>
              setItems((old) => [
                ...old,
                { description: "", quantity: "1", price: "" },
              ])
            }
          >
            Add item
          </Button>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="entry-amount">Amount (NGN) *</Label>
          <Input
            id="entry-amount"
            required
            inputMode="decimal"
            disabled={calculate}
            value={calculate ? (itemTotal / 100).toFixed(2) : form.amount}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="entry-method">Payment method</Label>
          <select
            id="entry-method"
            className={selectClass}
            value={form.method}
            onChange={(e) => update("method", e.target.value)}
          >
            {paymentMethods.map((m) => (
              <option key={m} value={m}>
                {m.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="entry-event">Event</Label>
          <select
            id="entry-event"
            className={selectClass}
            value={form.event}
            onChange={(e) => update("event", e.target.value)}
          >
            <option value="none">General school (no event)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="entry-reference">
            Receipt / invoice / bank reference
          </Label>
          <Input
            id="entry-reference"
            maxLength={200}
            value={form.reference}
            onChange={(e) => update("reference", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="entry-document">Supporting receipt or invoice</Label>
        <Input
          id="entry-document"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setDocument(e.target.files?.[0] || null)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          PDF, JPG, PNG or WebP, up to 10 MB. Visible only to the finance team.
        </p>
      </div>
      <div>
        <Label htmlFor="entry-notes">Notes</Label>
        <Textarea
          id="entry-notes"
          maxLength={3000}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Posted records are retained. To correct an entry, void it with a reason
        and record its replacement.
      </p>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={save.isPending}>
        {save.isPending ? "Saving record…" : "Save financial record"}
      </Button>
    </form>
  );
}

function FinanceRecord({
  entry,
  onVoided,
}: {
  entry: FinanceEntry;
  onVoided: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);
  const audit = useQuery({
    queryKey: ["finance-audit", entry.id],
    queryFn: async () => {
      const { data, error } = await financeClient
        .from("finance_entry_audit")
        .select("id,action,occurred_at")
        .eq("entry_id", entry.id)
        .order("occurred_at");
      if (error) throw error;
      return data as { id: number; action: string; occurred_at: string }[];
    },
  });
  const voidRecord = useMutation({
    mutationFn: async () => {
      const { error } = await financeClient.rpc("void_finance_entry", {
        p_id: entry.id,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Record voided",
        description:
          "It remains in the register and is excluded from financial totals.",
      });
      onVoided();
    },
    onError: (error) =>
      toast({
        title: "Could not void record",
        description: errorText(error),
        variant: "destructive",
      }),
  });
  const openDocument = async () => {
    setOpeningDocument(true);
    try {
      const { data, error } = await financeClient.storage
        .from("finance-documents")
        .createSignedUrl(entry.document_path!, 60);
      if (error) throw error;
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    } catch (error) {
      toast({
        title: "Document unavailable",
        description: errorText(error),
        variant: "destructive",
      });
    } finally {
      setOpeningDocument(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted p-4">
        <p className="font-mono text-sm">{entry.record_number}</p>
        <p className="text-2xl font-heading mt-2">{money(entry.amount_kobo)}</p>
        <p className="capitalize">
          {entry.direction === "income" ? "Money received" : "Money spent"} ·{" "}
          {entry.status}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        {[
          ["Date", dateLabel(entry.transaction_date)],
          ["Category", entry.category],
          ["Description", entry.description],
          [
            entry.direction === "income" ? "Received from" : "Paid to",
            entry.counterparty,
          ],
          ["Event", entry.event_name || "General school"],
          ["Method", entry.payment_method.replace("_", " ")],
          ["Reference", entry.reference || "—"],
          ["Recorded by", entry.recorded_by_name],
          ["Recorded at", new Date(entry.created_at).toLocaleString("en-GB")],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {!!entry.line_items?.length && (
        <StatementItems items={entry.line_items} />
      )}
      {entry.notes && (
        <p className="text-sm whitespace-pre-wrap rounded-lg border p-3">
          {entry.notes}
        </p>
      )}
      {entry.document_path && (
        <Button
          variant="outline"
          disabled={openingDocument}
          onClick={openDocument}
        >
          <FileText size={16} />{" "}
          {openingDocument ? "Opening…" : "Open supporting document"}
        </Button>
      )}
      {entry.void_reason && (
        <p className="text-sm text-destructive">
          Void reason: {entry.void_reason}
        </p>
      )}
      <div className="border-t pt-3 text-xs text-muted-foreground">
        <p className="font-semibold mb-2">Record history</p>
        {audit.isLoading && <p>Loading history…</p>}
        {audit.error && <p>History could not load.</p>}
        {audit.data?.map((a) => (
          <p key={a.id}>
            {a.action.replace(/_/g, " ")} ·{" "}
            {new Date(a.occurred_at).toLocaleString("en-GB")}
          </p>
        ))}
      </div>
      {entry.status === "posted" && !entry.source_payment_id && (
        <div className="border-t pt-4">
          {voiding ? (
            <div className="space-y-3">
              <Label htmlFor="void-reason">Reason for voiding (required)</Label>
              <Textarea
                id="void-reason"
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                variant="destructive"
                disabled={reason.trim().length < 5 || voidRecord.isPending}
                onClick={() => voidRecord.mutate()}
              >
                {voidRecord.isPending ? "Voiding…" : "Confirm void"}
              </Button>
              <Button variant="ghost" onClick={() => setVoiding(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setVoiding(true)}>
              Void incorrect record
            </Button>
          )}
        </div>
      )}
      {entry.source_payment_id && (
        <p className="text-xs text-muted-foreground">
          This receipt is linked to Student fees. Changes there are recorded
          automatically in its history.
        </p>
      )}
    </div>
  );
}

function StatementItems({
  items,
}: {
  items: { description: string; quantity: number; unit_kobo: number }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Item</th>
            <th>Quantity</th>
            <th className="text-right">Unit price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-t">
              <td className="py-2">{item.description}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">{money(item.unit_kobo)}</td>
              <td className="text-right">
                {money(item.unit_kobo * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
