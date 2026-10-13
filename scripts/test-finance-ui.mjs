import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({ root, server: { host: "127.0.0.1", port: 4187, strictPort: true }, mode: "test" });
let browser;
const entries = [];
let access = true;
let lastReport;
const eventId = "00000000-0000-4000-8000-000000000010";
const browserErrors = [];
const studentId = "00000000-0000-4000-8000-000000000020";
const feeId = "00000000-0000-4000-8000-000000000030";
const payments = [{ id: "previous", student_id: studentId, fee_structure_id: feeId, amount: 100.10, payment_date: "2026-09-28", receipt_number: "IBS-PREVIOUS", notes: "Initial tuition instalment" }];
try {
  await server.listen();
  try { browser = await chromium.launch({ headless: true }); }
  catch { browser = await chromium.launch({ channel: "msedge", headless: true }); }
  const page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
  page.on("pageerror", error => browserErrors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-09-29T12:00:00Z"));
  // Every backend request is intercepted; no real school data is touched.
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (!url.pathname.includes("/rest/v1/")) return route.abort();
    const respond = body => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname.endsWith("/rpc/can_manage_school_finance")) return respond(access);
    if (url.pathname.endsWith("/events")) return respond([{ id: eventId, title: "Sports Day", start_date: "2026-09-29" }]);
    if (url.pathname.endsWith("/students")) return respond([{ id: studentId, full_name: "Preview Student", class_id: "class-one" }]);
    if (url.pathname.endsWith("/terms")) return respond([{ id: "term-one", name: "First term" }]);
    if (url.pathname.endsWith("/fee_structures")) return respond([{ id: feeId, name: "Tuition", amount: 500.50, class_id: "class-one", term_id: "term-one" }, { id: "other-fee", name: "Other class tuition", amount: 800, class_id: "class-two", term_id: "term-one" }]);
    if (url.pathname.endsWith("/payments")) {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        payments.push(body);
        return route.fulfill({ status: 201, body: "" });
      }
      return respond(payments);
    }
    if (url.pathname.endsWith("/rpc/school_finance_report")) {
      lastReport = route.request().postDataJSON();
      const filtered = entries.filter(e => e.transaction_date >= lastReport.p_start && e.transaction_date <= lastReport.p_end && (lastReport.p_event === "all" || (lastReport.p_event === "none" ? !e.event_id : e.event_id === lastReport.p_event)));
      const posted = filtered.filter(e => e.status === "posted");
      const total = direction => posted.filter(e => e.direction === direction).reduce((sum, e) => sum + e.amount_kobo, 0);
      const income = total("income"); const expense = total("expense");
      return respond({ income_kobo: income, expense_kobo: expense, net_kobo: income - expense, count: posted.length, total_entries: filtered.length, entries: filtered.slice(lastReport.p_offset, lastReport.p_offset + lastReport.p_limit), categories: posted.map(e => ({ category: e.category, direction: e.direction, amount_kobo: e.amount_kobo })), monthly: posted.length ? [{ month: "2026-09", income_kobo: income, expense_kobo: expense, net_kobo: income - expense }] : [], events: posted.length ? [{ event_id: eventId, event_name: "Sports Day", income_kobo: income, expense_kobo: expense, net_kobo: income - expense }] : [] });
    }
    if (url.pathname.endsWith("/finance_entries") && route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      entries.push({ ...body, record_number: `IBS-FIN-${String(entries.length + 1).padStart(6, "0")}`, status: "posted", recorded_by_name: "Mr Segun", created_at: "2026-09-29T12:00:00Z", event_name: body.event_id ? "Sports Day" : null, source_payment_id: null });
      return route.fulfill({ status: 201, body: "" });
    }
    if (url.pathname.endsWith("/finance_entry_audit")) return respond([{ id: 1, action: "recorded", occurred_at: "2026-09-29T12:00:00Z" }]);
    if (url.pathname.endsWith("/rpc/void_finance_entry")) {
      const body = route.request().postDataJSON(); const entry = entries.find(e => e.id === body.p_id); entry.status = "void"; entry.void_reason = body.p_reason; return respond(null);
    }
    return respond([]);
  });
  await page.goto("http://127.0.0.1:4187/scripts/fixtures/finance-preview.html", { timeout: 60000 });
  await page.getByRole("heading", { name: "School finances" }).waitFor();
  await page.getByText("No financial records for these dates", { exact: false }).waitFor();
  await page.getByRole("tab", { name: "Reports", exact: true }).click();
  await page.getByText("No income or spending in this period.", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Transaction register" }).click();
  await page.getByRole("button", { name: "Record income", exact: true }).click();
  await page.getByLabel("Description / purpose").fill("Sports day tickets");
  await page.getByLabel("Received from", { exact: false }).fill("Parents association");
  await page.getByLabel("Amount (NGN)").fill("5000.25");
  await page.getByLabel("Event", { exact: true }).selectOption(eventId);
  await page.getByRole("button", { name: "Save financial record" }).click();
  await page.getByText("IBS-FIN-000001", { exact: true }).waitFor();
  assert.equal(entries[0].amount_kobo, 500025);

  await page.getByRole("button", { name: "Record spending", exact: true }).click();
  await page.getByLabel("Description / purpose").fill("Sports day catering");
  await page.getByLabel("Paid to", { exact: false }).fill("Catering company");
  await page.getByLabel("Calculate total from items").check();
  await page.getByLabel("Item 1 description").fill("Meals");
  await page.getByLabel("Item 1 quantity").fill("3");
  await page.getByLabel("Item 1 unit price in naira").fill("100.10");
  assert.equal(await page.getByLabel("Amount (NGN)").inputValue(), "300.30");
  await page.getByLabel("Event", { exact: true }).selectOption(eventId);
  await page.getByRole("button", { name: "Save financial record" }).click();
  await page.getByText("IBS-FIN-000002", { exact: true }).waitFor();
  assert.equal(entries[1].amount_kobo, 30030);
  assert.equal(entries[1].line_items[0].quantity, 3);

  await page.getByLabel("Period", { exact: true }).selectOption("week");
  await page.waitForFunction(() => document.body.textContent.includes("28 Sept 2026"));
  assert.equal(lastReport.p_start, "2026-09-28");
  assert.equal(lastReport.p_end, "2026-10-04");
  await page.getByLabel("School event").selectOption(eventId);
  await page.waitForTimeout(150);
  assert.equal(lastReport.p_event, eventId);
  await page.getByRole("button", { name: "Annual profit & loss" }).click();
  await page.getByRole("heading", { name: "Annual profit & loss statement" }).waitFor();
  assert.equal(lastReport.p_start, "2026-01-01");
  assert.equal(lastReport.p_end, "2026-12-31");
  await page.getByText("December 2026", { exact: true }).waitFor();
  await page.getByRole("region", { name: "Income and spending pie chart" }).waitFor();
  await page.getByRole("region", { name: "Profit and loss graph" }).waitFor();
  assert.equal(await page.locator('.recharts-pie').count(), 1);
  assert.equal(await page.locator('.recharts-line').count(), 1);
  await page.getByText("Net profit: ₦4,699.95", { exact: true }).waitFor();
  await mkdir(new URL("../.playwright-mcp/", import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL("../.playwright-mcp/finance-desktop.png", import.meta.url)), fullPage: true });
  await page.pdf({ path: fileURLToPath(new URL("../.playwright-mcp/finance-statement.pdf", import.meta.url)), format: "A4", printBackground: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: fileURLToPath(new URL("../.playwright-mcp/finance-mobile.png", import.meta.url)), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Finance reports should fit a mobile viewport");
  entries[1].amount_kobo = 600000;
  await page.getByRole("button", { name: "Refresh records", exact: true }).click();
  await page.getByText("Net loss: -₦999.75", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Transaction register" }).click();
  await page.getByRole("button", { name: "View record" }).nth(1).click();
  await page.getByRole("button", { name: "Void incorrect record" }).click();
  await page.getByLabel("Reason for voiding").fill("Duplicate receipt");
  await page.getByRole("button", { name: "Confirm void" }).click();
  await page.getByRole("cell", { name: "void", exact: true }).waitFor();
  assert.equal(entries[1].status, "void");
  await page.getByRole("tab", { name: "Student fees", exact: true }).click();
  await page.getByLabel("Student for fee calculation").selectOption(studentId);
  const feeTable = page.getByRole("table", { name: "School fee calculation table" });
  await feeTable.getByRole("cell", { name: "₦400.40", exact: true }).waitFor();
  assert.equal(await feeTable.getByText("Other class tuition", { exact: true }).count(), 0);
  await page.getByLabel("Include Tuition", { exact: true }).check();
  await page.getByRole("button", { name: "Record payment for Tuition", exact: true }).click();
  await page.getByLabel("Payment amount (NGN)").fill("500.00");
  await page.getByLabel("Reason for payment", { exact: true }).fill("Second tuition instalment");
  await page.getByRole("button", { name: "Save fee payment", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "exceeds the remaining balance" }).waitFor();
  assert.equal(payments.length, 1, "Invalid payment must not be saved");
  await page.getByLabel("Payment amount (NGN)").fill("200.20");
  await page.getByRole("button", { name: "Save fee payment", exact: true }).click();
  await page.getByText("Payment recorded. Receipt:", { exact: false }).waitFor();
  await feeTable.getByRole("cell", { name: "₦200.20", exact: true }).waitFor();
  assert.equal(payments[1].amount, 200.20);
  assert.equal(payments[1].notes, "Second tuition instalment");
  assert.match(payments[1].receipt_number, /^IBS-PAY-/);
  await page.getByRole("table", { name: "Student payment records and reasons" }).getByText("Second tuition instalment", { exact: true }).waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export selected fees" }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^school-fee-calculation-/);
  await page.screenshot({ path: fileURLToPath(new URL("../.playwright-mcp/finance-fee-worksheet-mobile.png", import.meta.url)), fullPage: true });
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > innerWidth && !e.closest(".overflow-x-auto")).map(e => ({ tag: e.tagName, css: e.className, right: e.getBoundingClientRect().right })).slice(0, 12) }));
  assert.equal(overflow.scroll <= overflow.width, true, `Fee worksheet should fit a mobile viewport: ${JSON.stringify(overflow)}`);
  await page.setViewportSize({ width: 1365, height: 1000 });
  await page.screenshot({ path: fileURLToPath(new URL("../.playwright-mcp/finance-fee-worksheet.png", import.meta.url)), fullPage: true });
  await page.pdf({ path: fileURLToPath(new URL("../.playwright-mcp/finance-fee-worksheet.pdf", import.meta.url)), format: "A4", printBackground: true });
  access = false;
  await page.reload();
  await page.getByText("This workspace is available to the school administrators", { exact: false }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Record income", exact: true }).count(), 0);
  assert.deepEqual(browserErrors, []);
  console.log("Finance browser checks passed: income, item calculation, events, weekly/yearly reports, charts, fee instalments, reasons, overpayment validation, CSV, PDF, mobile layout, voiding and access denial.");
} finally {
  await browser?.close();
  await server.close();
}
