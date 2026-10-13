import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, type FinanceReport } from "@/lib/finance";

const colors = ["#059669", "#e11d48"];
export function FinanceCharts({
  report,
  months,
}: {
  report: FinanceReport;
  months: FinanceReport["monthly"];
}) {
  const totals = [
    { name: "Money received", value: report.income_kobo / 100 },
    { name: "Money spent", value: report.expense_kobo / 100 },
  ];
  const trend = months.map((m) => ({
    month: new Date(`${m.month}-01T12:00:00`).toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    }),
    income: m.income_kobo / 100,
    spending: m.expense_kobo / 100,
    net: m.net_kobo / 100,
  }));
  const formatValue = (value: number) => money(Math.round(Number(value) * 100));
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr] finance-charts">
      <section
        className="min-w-0 rounded-xl border p-4"
        aria-label="Income and spending pie chart"
      >
        <h4 className="font-semibold">Income and spending</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Share of total money received and paid out.
        </p>
        {totals.some((t) => t.value > 0) ? (
          <div
            className="h-64"
            role="img"
            aria-label={`Money received ${money(report.income_kobo)}; money spent ${money(report.expense_kobo)}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totals}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="48%"
                  outerRadius="75%"
                  isAnimationActive={false}
                >
                  {totals.map((t, i) => (
                    <Cell key={t.name} fill={colors[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatValue} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No income or spending in this period.
          </p>
        )}
        <p className="text-sm font-medium">
          {report.net_kobo < 0 ? "Net loss" : "Net profit"}:{" "}
          {money(report.net_kobo)}
        </p>
      </section>
      <section
        className="min-w-0 rounded-xl border p-4"
        aria-label="Profit and loss graph"
      >
        <h4 className="font-semibold">Monthly profit and loss</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Income minus spending. Below zero indicates a loss. Amounts in NGN.
        </p>
        <div
          className="h-72 mt-2"
          role="img"
          aria-label="Monthly income and spending bars with a net profit or loss line. Exact figures are in the monthly breakdown below."
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={trend}
              margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
              accessibilityLayer
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} minTickGap={20} />
              <YAxis
                width={65}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("en-NG", {
                    notation: "compact",
                  }).format(v)
                }
              />
              <Tooltip formatter={formatValue} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0} stroke="#64748b" />
              <Bar
                dataKey="income"
                name="Income"
                fill={colors[0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="spending"
                name="Spending"
                fill={colors[1]}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="net"
                name="Net profit / loss"
                stroke="#1d4ed8"
                strokeWidth={3}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
