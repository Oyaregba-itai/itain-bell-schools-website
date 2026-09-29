import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Isolated PostgreSQL engine: no credentials or connection to the live school DB.
const db = new PGlite();
const segun = "182ee4c8-c25b-4b7a-90d5-cbc94e26c322";
const itai = "00000000-0000-4000-8000-000000000001";
const oyaregba = "00000000-0000-4000-8000-000000000002";
const teacher = "00000000-0000-4000-8000-000000000003";
const sports = "00000000-0000-4000-8000-000000000010";
const student = "00000000-0000-4000-8000-000000000020";
const payment = "00000000-0000-4000-8000-000000000030";
let checks = 0;
const check = (actual, expected) => {
  assert.deepEqual(actual, expected);
  checks++;
};
async function asUser(id) {
  await db.exec("RESET ROLE; SET ROLE authenticated;");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
}
async function report(
  start = "2026-01-01",
  end = "2026-12-31",
  event = "all",
  offset = 0,
  limit = 50,
) {
  const result = await db.query(
    "SELECT public.school_finance_report($1::date,$2::date,$3,$4,$5) AS report",
    [start, end, event, offset, limit],
  );
  return result.rows[0].report;
}
async function denied(query, params = []) {
  await assert.rejects(() => db.query(query, params));
  checks++;
}

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public, storage TO authenticated, anon;
    CREATE TABLE public.user_roles(user_id uuid, role text);
    CREATE FUNCTION public.has_role(p_user uuid, p_role text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role=p_role) $$;
    CREATE TABLE public.profiles(user_id uuid, full_name text, is_finance_head boolean);
    CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text, first_name text, last_name text);
    CREATE TABLE public.classes(id uuid PRIMARY KEY, name text);
    CREATE TABLE public.terms(id uuid PRIMARY KEY, name text);
    CREATE TABLE public.events(id uuid PRIMARY KEY, title text, start_date date);
    CREATE TABLE public.fee_structures(id uuid PRIMARY KEY, name text);
    CREATE TABLE public.payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid REFERENCES students(id) ON DELETE CASCADE, fee_structure_id uuid REFERENCES fee_structures(id) ON DELETE SET NULL, payment_date date DEFAULT CURRENT_DATE, amount numeric(10,2), payment_method text, receipt_number text, notes text, recorded_by uuid, created_at timestamptz DEFAULT now());
    ALTER TABLE students ENABLE ROW LEVEL SECURITY; ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE terms ENABLE ROW LEVEL SECURITY; ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY; ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON students,classes,terms,events,fee_structures,payments TO authenticated;
    CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
  `);
  for (const [id, name, role] of [
    [segun, "Mr Segun", "teacher"],
    [itai, "Mrs Itai", "admin"],
    [oyaregba, "Itai Oyaregba", "admin"],
    [teacher, "Other Teacher", "teacher"],
  ]) {
    await db.query("INSERT INTO auth.users VALUES ($1);", [id]);
    await db.query("INSERT INTO public.profiles VALUES ($1,$2,true)", [
      id,
      name,
    ]);
    await db.query("INSERT INTO public.user_roles VALUES ($1,$2)", [id, role]);
  }
  await db.query(
    "INSERT INTO students VALUES ($1,'Sample Pupil','Sample','Pupil')",
    [student],
  );
  await db.query("INSERT INTO events VALUES ($1,'Sports Day','2026-09-29')", [
    sports,
  ]);
  await db.query(
    "INSERT INTO payments(id,student_id,payment_date,amount,payment_method,recorded_by) VALUES ($1,$2,'2026-01-01',1000,'cash',$3)",
    [payment, student, itai],
  );
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260929000000_school_finance_ledger.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);

  for (const id of [segun, itai, oyaregba]) {
    await asUser(id);
    check(
      (await db.query("SELECT public.can_manage_school_finance() AS allowed"))
        .rows[0].allowed,
      true,
    );
    check((await report()).income_kobo, 100000);
    check(
      (await db.query("SELECT count(*)::int AS count FROM students")).rows[0]
        .count,
      1,
    );
  }
  await asUser(teacher);
  check(
    (await db.query("SELECT public.can_manage_school_finance() AS allowed"))
      .rows[0].allowed,
    false,
  );
  check(
    (await db.query("SELECT count(*)::int AS count FROM finance_entries"))
      .rows[0].count,
    0,
  );
  await denied(
    "SELECT public.school_finance_report('2026-01-01','2026-12-31')",
  );
  await denied("INSERT INTO finance_access(user_id) VALUES ($1)", [teacher]);
  await denied(
    "INSERT INTO finance_entries(direction,amount_kobo,category,description,counterparty,payment_method) VALUES ('income',1,'Other income','Unauthorized','Someone','cash')",
  );

  await asUser(segun);
  await db.query(
    "INSERT INTO finance_entries(transaction_date,direction,amount_kobo,category,description,counterparty,payment_method,event_id,recorded_by) VALUES ('2026-09-29','income',500000,'Event income','Tickets','Parents','cash',$1,$2)",
    [sports, teacher],
  );
  const expense = (
    await db.query(
      "INSERT INTO finance_entries(transaction_date,direction,amount_kobo,category,description,counterparty,payment_method,event_id,line_items) VALUES ('2026-09-29','expense',200000,'Event costs','Catering','Supplier','bank_transfer',$1,'[{\"description\":\"Lunch\",\"quantity\":20,\"unit_kobo\":10000}]') RETURNING id",
      [sports],
    )
  ).rows[0].id;
  await db.exec(
    "INSERT INTO finance_entries(transaction_date,direction,amount_kobo,category,description,counterparty,payment_method) SELECT '2026-02-01','expense',1,'Other expenses','Small item ' || n,'Supplier','cash' FROM generate_series(1,1100) n;",
  );
  const all = await report();
  check(all.income_kobo, 600000);
  check(all.expense_kobo, 201100);
  check(all.net_kobo, 398900);
  check(all.count, 1103);
  check(all.entries.length, 50);
  check(
    all.entries.find((e) => e.description === "Tickets").recorded_by,
    segun,
  );
  check(
    (await report("2026-01-01", "2026-12-31", "all", 1000, 1000)).entries
      .length,
    103,
  );
  check((await report("2026-09-28", "2026-10-04", sports)).net_kobo, 300000);
  check((await report("2026-01-01", "2026-12-31", "none")).net_kobo, 98900);
  check(all.monthly.length, 3);
  check(all.events.length, 2);
  check((await report("2027-01-01", "2027-12-31")).count, 0);
  await denied(
    "SELECT public.school_finance_report('2026-12-31','2026-01-01')",
  );
  await denied(
    "INSERT INTO finance_entries(direction,amount_kobo,category,description,counterparty,payment_method) VALUES ('expense',-1,'Other expenses','Invalid','Supplier','cash')",
  );
  await denied(
    "INSERT INTO finance_entries(direction,amount_kobo,category,description,counterparty,payment_method,line_items) VALUES ('expense',100,'Other expenses','Mismatch','Supplier','cash','[{\"description\":\"Item\",\"quantity\":2,\"unit_kobo\":100}]')",
  );
  await denied("DELETE FROM finance_entries WHERE id=$1", [expense]);
  await denied("UPDATE finance_entries SET amount_kobo=1 WHERE id=$1", [
    expense,
  ]);
  await denied("SELECT public.void_finance_entry($1,'x')", [expense]);
  await db.query("SELECT public.void_finance_entry($1,'Duplicate receipt')", [
    expense,
  ]);
  check((await report("2026-01-01", "2026-12-31", sports)).expense_kobo, 0);
  check(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM finance_entry_audit WHERE entry_id=$1",
        [expense],
      )
    ).rows[0].count,
    2,
  );
  await denied("SELECT public.void_finance_entry($1,'Duplicate receipt')", [
    expense,
  ]);

  // Legacy fee updates must alter the one mirrored record and retain its audit.
  await db.query("UPDATE payments SET amount=1200 WHERE id=$1", [payment]);
  check((await report()).income_kobo, 620000);
  check(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM finance_entries WHERE source_payment_id=$1",
        [payment],
      )
    ).rows[0].count,
    1,
  );
  const linked = (
    await db.query(
      "SELECT id FROM finance_entries WHERE source_payment_id=$1",
      [payment],
    )
  ).rows[0].id;
  await denied("SELECT public.void_finance_entry($1,'Use student fees')", [
    linked,
  ]);
  await db.query("DELETE FROM payments WHERE id=$1", [payment]);
  check((await report()).income_kobo, 500000);
  check(
    (await db.query("SELECT status FROM finance_entries WHERE id=$1", [linked]))
      .rows[0].status,
    "void",
  );

  // A pupil deletion must not remove previously received income from statements.
  await db.query("INSERT INTO payments(student_id,payment_date,amount,payment_method,recorded_by) VALUES ($1,'2026-12-31',2500,'cash',$2)", [student, segun]);
  check((await report()).income_kobo, 750000);
  await db.exec("RESET ROLE");
  await db.query("DELETE FROM students WHERE id=$1", [student]);
  await asUser(segun);
  check((await report()).income_kobo, 750000);

  // Supporting documents are private and cannot be removed after filing.
  const documentEntry = "00000000-0000-4000-8000-000000000099";
  const documentPath = `${documentEntry}/receipt.pdf`;
  await db.query(
    "INSERT INTO storage.objects(bucket_id,name) VALUES ('finance-documents',$1)",
    [documentPath],
  );
  await db.query(
    "INSERT INTO finance_entries(id,transaction_date,direction,amount_kobo,category,description,counterparty,payment_method,document_path) VALUES ($1,'2026-12-31','expense',100,'Other expenses','Receipt','Supplier','cash',$2)",
    [documentEntry, documentPath],
  );
  await db.query("DELETE FROM storage.objects WHERE name=$1", [documentPath]);
  check(
    (await db.query("SELECT count(*)::int AS count FROM storage.objects"))
      .rows[0].count,
    1,
  );
  await asUser(teacher);
  check(
    (await db.query("SELECT count(*)::int AS count FROM storage.objects"))
      .rows[0].count,
    0,
  );
  await db.exec(
    "RESET ROLE; SET ROLE anon; SELECT set_config('request.jwt.claim.sub','',false);",
  );
  await denied(
    "SELECT public.school_finance_report('2026-01-01','2026-12-31')",
  );
  console.log(
    `Finance database checks passed: ${checks} (permissions, money, filters, pagination, audit, fee sync, private documents).`,
  );
} finally {
  await db.close();
}
