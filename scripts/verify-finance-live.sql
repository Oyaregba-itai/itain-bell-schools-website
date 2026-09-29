-- Read-only checks of the deployed finance schema and actual account permissions.
BEGIN;
SET TRANSACTION READ ONLY;

DO $$
DECLARE
  account_id uuid;
  allowed boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'finance-documents'
      AND NOT public AND file_size_limit = 10485760
  ) THEN RAISE EXCEPTION 'Private supporting-document bucket is missing'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments p
    LEFT JOIN public.finance_entries f ON f.source_payment_id = p.id
    WHERE p.amount > 0 AND (f.id IS NULL OR f.amount_kobo <> round(p.amount * 100)::bigint)
  ) THEN RAISE EXCEPTION 'Student payment reconciliation failed'; END IF;

  IF has_table_privilege('authenticated', 'public.finance_entries', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.finance_entries', 'DELETE')
    OR has_table_privilege('anon', 'public.finance_entries', 'SELECT')
  THEN RAISE EXCEPTION 'Unexpected ledger privileges'; END IF;

  FOREACH account_id IN ARRAY ARRAY[
    '182ee4c8-c25b-4b7a-90d5-cbc94e26c322'::uuid,
    '5aa81694-eb76-41c9-b273-e204cb80da4c'::uuid,
    '517b52ff-e991-408e-8644-c363464f6240'::uuid
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = account_id) THEN
      RAISE EXCEPTION 'An intended finance account is missing';
    END IF;
    PERFORM set_config('request.jwt.claim.sub', account_id::text, true);
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', account_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    IF NOT public.can_manage_school_finance() THEN
      RAISE EXCEPTION 'Intended finance account denied';
    END IF;
    PERFORM public.school_finance_report(date '2026-01-01', date '2026-12-31');
    RESET ROLE;
  END LOOP;

  -- Test every other non-admin account against the real row-security policies.
  FOR account_id IN
    SELECT u.id FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin')
      AND NOT EXISTS (SELECT 1 FROM public.finance_access a WHERE a.user_id = u.id)
  LOOP
    PERFORM set_config('request.jwt.claim.sub', account_id::text, true);
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', account_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    IF public.can_manage_school_finance() THEN RAISE EXCEPTION 'Unexpected finance access'; END IF;
    IF EXISTS (SELECT 1 FROM public.finance_entries) THEN RAISE EXCEPTION 'Ledger data exposed'; END IF;
    allowed := false;
    BEGIN
      PERFORM public.school_finance_report(date '2026-01-01', date '2026-12-31');
      allowed := true;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    IF allowed THEN RAISE EXCEPTION 'Report exposed to an unauthorized account'; END IF;
    RESET ROLE;
  END LOOP;
END;
$$;

SELECT 'Finance schema, reconciliation and account permissions verified' AS result;
ROLLBACK;
