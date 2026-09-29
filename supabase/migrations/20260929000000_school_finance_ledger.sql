-- School cash ledger. Student payments are mirrored, never added twice.
BEGIN;

CREATE TABLE public.finance_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_access FROM anon, authenticated;

-- Existing Head of Finance account; administrators already have finance access.
INSERT INTO public.finance_access (user_id)
SELECT id FROM auth.users WHERE id = '182ee4c8-c25b-4b7a-90d5-cbc94e26c322';

CREATE FUNCTION public.can_manage_school_finance()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.finance_access WHERE user_id = auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.can_manage_school_finance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_school_finance() TO authenticated;

CREATE POLICY "Finance team manages fees" ON public.fee_structures FOR ALL TO authenticated
USING (public.can_manage_school_finance()) WITH CHECK (public.can_manage_school_finance());
CREATE POLICY "Finance team manages payments" ON public.payments FOR ALL TO authenticated
USING (public.can_manage_school_finance()) WITH CHECK (public.can_manage_school_finance());
CREATE POLICY "Finance team reads students" ON public.students FOR SELECT TO authenticated USING (public.can_manage_school_finance());
CREATE POLICY "Finance team reads classes" ON public.classes FOR SELECT TO authenticated USING (public.can_manage_school_finance());
CREATE POLICY "Finance team reads terms" ON public.terms FOR SELECT TO authenticated USING (public.can_manage_school_finance());
CREATE POLICY "Finance team reads events" ON public.events FOR SELECT TO authenticated USING (public.can_manage_school_finance());

CREATE TABLE public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  direction text NOT NULL CHECK (direction IN ('income', 'expense')),
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0 AND amount_kobo <= 999999999999),
  category text NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 100),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 500),
  counterparty text NOT NULL CHECK (length(trim(counterparty)) BETWEEN 1 AND 200),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'pos', 'cheque', 'online')),
  reference text CHECK (length(reference) <= 200),
  notes text CHECK (length(notes) <= 3000),
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(line_items) = 'array' AND jsonb_array_length(line_items) <= 50),
  event_id uuid REFERENCES public.events(id) ON DELETE RESTRICT,
  document_path text CHECK (length(document_path) <= 500),
  source_payment_id uuid UNIQUE,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'void')),
  void_reason text,
  voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_at timestamptz,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'posted' AND void_reason IS NULL AND voided_at IS NULL) OR
         (status = 'void' AND length(trim(void_reason)) >= 5 AND voided_at IS NOT NULL))
);
CREATE INDEX finance_entries_date_idx ON public.finance_entries(transaction_date DESC, sequence_number DESC);
CREATE INDEX finance_entries_event_idx ON public.finance_entries(event_id, transaction_date);
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_entries FROM anon, authenticated;
GRANT SELECT, INSERT ON public.finance_entries TO authenticated;
GRANT USAGE ON SEQUENCE public.finance_entries_sequence_number_seq TO authenticated;
CREATE POLICY "Finance team reads ledger" ON public.finance_entries FOR SELECT TO authenticated USING (public.can_manage_school_finance());
CREATE POLICY "Finance team records transactions" ON public.finance_entries FOR INSERT TO authenticated
WITH CHECK (public.can_manage_school_finance() AND recorded_by = auth.uid() AND source_payment_id IS NULL AND status = 'posted');

CREATE TABLE public.finance_entry_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_id uuid NOT NULL REFERENCES public.finance_entries(id) ON DELETE RESTRICT,
  action text NOT NULL,
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  before_record jsonb,
  after_record jsonb NOT NULL
);
ALTER TABLE public.finance_entry_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_entry_audit FROM anon, authenticated;
GRANT SELECT ON public.finance_entry_audit TO authenticated;
CREATE POLICY "Finance team reads audit" ON public.finance_entry_audit FOR SELECT TO authenticated USING (public.can_manage_school_finance());

CREATE FUNCTION public.stamp_finance_entry() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE item jsonb; calculated numeric := 0;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.source_payment_id IS NULL THEN
    NEW.recorded_by := auth.uid();
    NEW.created_at := now();
    NEW.status := 'posted';
    NEW.void_reason := NULL;
    NEW.voided_by := NULL;
    NEW.voided_at := NULL;
    IF NEW.document_path IS NOT NULL AND NEW.document_path NOT LIKE NEW.id::text || '/%' THEN
      RAISE EXCEPTION 'Supporting document must belong to this record';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(NEW.line_items) LOOP
      IF coalesce(length(trim(item->>'description')), 0) NOT BETWEEN 1 AND 200 OR
         coalesce(item->>'quantity', '') !~ '^[0-9]+$' OR
         coalesce(item->>'unit_kobo', '') !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'Each item needs a description, whole quantity and price in kobo';
      END IF;
      IF (item->>'quantity')::numeric NOT BETWEEN 1 AND 1000000 OR
         (item->>'unit_kobo')::numeric NOT BETWEEN 1 AND 999999999999 THEN
        RAISE EXCEPTION 'Invalid item quantity or price';
      END IF;
      calculated := calculated + (item->>'quantity')::numeric * (item->>'unit_kobo')::numeric;
    END LOOP;
    IF jsonb_array_length(NEW.line_items) > 0 AND calculated <> NEW.amount_kobo THEN
      RAISE EXCEPTION 'The amount must equal the calculated item total';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER stamp_finance_entry BEFORE INSERT ON public.finance_entries FOR EACH ROW EXECUTE FUNCTION public.stamp_finance_entry();

CREATE FUNCTION public.audit_finance_entry() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.finance_entry_audit(entry_id, action, actor_id, before_record, after_record)
  VALUES (NEW.id, CASE WHEN TG_OP = 'INSERT' THEN 'recorded' WHEN NEW.status = 'void' AND OLD.status <> 'void' THEN 'voided' ELSE 'payment_updated' END,
          auth.uid(), CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END, to_jsonb(NEW));
  RETURN NEW;
END;
$$;
CREATE TRIGGER audit_finance_entry AFTER INSERT OR UPDATE ON public.finance_entries FOR EACH ROW EXECUTE FUNCTION public.audit_finance_entry();

-- Preserve historical student receipts and synchronize subsequent changes.
INSERT INTO public.finance_entries(transaction_date, direction, amount_kobo, category, description, counterparty, payment_method, reference, notes, source_payment_id, recorded_by, created_at)
SELECT p.payment_date, 'income', round(p.amount * 100)::bigint, 'School fees',
       coalesce(nullif(f.name, ''), 'Student fee payment'),
       coalesce(nullif(s.full_name, ''), nullif(trim(concat_ws(' ', s.first_name, s.last_name)), ''), 'Student fee payer'),
       coalesce(p.payment_method, 'cash'), p.receipt_number, p.notes, p.id, p.recorded_by, coalesce(p.created_at, now())
FROM public.payments p LEFT JOIN public.students s ON s.id = p.student_id
LEFT JOIN public.fee_structures f ON f.id = p.fee_structure_id WHERE p.amount > 0;

CREATE FUNCTION public.sync_payment_to_finance() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payer text; fee_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Removing a pupil cascades through payments, but must not erase school income.
    IF EXISTS (SELECT 1 FROM public.students WHERE id = OLD.student_id) THEN
      UPDATE public.finance_entries SET status = 'void', void_reason = 'Original student payment removed', voided_by = auth.uid(), voided_at = now()
      WHERE source_payment_id = OLD.id AND status = 'posted';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.amount <= 0 OR NEW.amount IS NULL THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  SELECT coalesce(nullif(full_name, ''), nullif(trim(concat_ws(' ', first_name, last_name)), ''), 'Student fee payer') INTO payer FROM public.students WHERE id = NEW.student_id;
  SELECT name INTO fee_name FROM public.fee_structures WHERE id = NEW.fee_structure_id;
  INSERT INTO public.finance_entries(transaction_date, direction, amount_kobo, category, description, counterparty, payment_method, reference, notes, source_payment_id, recorded_by, created_at)
  VALUES (NEW.payment_date, 'income', round(NEW.amount * 100)::bigint, 'School fees', coalesce(nullif(fee_name, ''), 'Student fee payment'),
          coalesce(payer, 'Student fee payer'), coalesce(NEW.payment_method, 'cash'), NEW.receipt_number, NEW.notes, NEW.id, NEW.recorded_by, coalesce(NEW.created_at, now()))
  ON CONFLICT (source_payment_id) DO UPDATE SET transaction_date = EXCLUDED.transaction_date, amount_kobo = EXCLUDED.amount_kobo,
    description = EXCLUDED.description, counterparty = EXCLUDED.counterparty, payment_method = EXCLUDED.payment_method,
    reference = EXCLUDED.reference, notes = EXCLUDED.notes;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sync_payment_to_finance AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.sync_payment_to_finance();

CREATE FUNCTION public.void_finance_entry(p_id uuid, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_school_finance() THEN RAISE EXCEPTION 'Finance access required' USING ERRCODE = '42501'; END IF;
  IF length(trim(p_reason)) < 5 OR length(p_reason) > 500 OR p_reason IS NULL THEN RAISE EXCEPTION 'Provide a reason between 5 and 500 characters'; END IF;
  UPDATE public.finance_entries SET status = 'void', void_reason = trim(p_reason), voided_by = auth.uid(), voided_at = now()
  WHERE id = p_id AND status = 'posted' AND source_payment_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Record is already void or is managed under Student fees'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.void_finance_entry(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_finance_entry(uuid, text) TO authenticated;

CREATE FUNCTION public.school_finance_report(p_start date, p_end date, p_event text DEFAULT 'all', p_offset integer DEFAULT 0, p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE report jsonb;
BEGIN
  IF NOT public.can_manage_school_finance() THEN RAISE EXCEPTION 'Finance access required' USING ERRCODE = '42501'; END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_start > p_end THEN RAISE EXCEPTION 'Choose a valid date range'; END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 1000 OR p_offset IS NULL OR p_offset < 0 THEN RAISE EXCEPTION 'Invalid report page'; END IF;
  WITH filtered AS (
    SELECT l.*, e.title AS event_name FROM public.finance_entries l LEFT JOIN public.events e ON e.id = l.event_id
    WHERE l.transaction_date BETWEEN p_start AND p_end AND
      (p_event = 'all' OR (p_event = 'none' AND l.event_id IS NULL) OR l.event_id::text = p_event)
  ), posted AS (SELECT * FROM filtered WHERE status = 'posted'),
  monthly AS (
    SELECT to_char(transaction_date, 'YYYY-MM') AS month,
      coalesce(sum(amount_kobo) FILTER (WHERE direction = 'income'), 0) AS income_kobo,
      coalesce(sum(amount_kobo) FILTER (WHERE direction = 'expense'), 0) AS expense_kobo,
      sum(CASE WHEN direction = 'income' THEN amount_kobo ELSE -amount_kobo END) AS net_kobo
    FROM posted GROUP BY 1 ORDER BY 1
  ), categories AS (
    SELECT category, direction, sum(amount_kobo) AS amount_kobo FROM posted GROUP BY category, direction ORDER BY direction, category
  ), events AS (
    SELECT event_id, coalesce(event_name, 'General school') AS event_name,
      coalesce(sum(amount_kobo) FILTER (WHERE direction = 'income'), 0) AS income_kobo,
      coalesce(sum(amount_kobo) FILTER (WHERE direction = 'expense'), 0) AS expense_kobo,
      sum(CASE WHEN direction = 'income' THEN amount_kobo ELSE -amount_kobo END) AS net_kobo
    FROM posted GROUP BY event_id, event_name ORDER BY event_name
  ), page AS (
    SELECT f.*, 'IBS-FIN-' || lpad(f.sequence_number::text, greatest(6, length(f.sequence_number::text)), '0') AS record_number,
      coalesce((SELECT pr.full_name FROM public.profiles pr WHERE pr.user_id = f.recorded_by LIMIT 1), 'School office') AS recorded_by_name
    FROM filtered f ORDER BY transaction_date DESC, sequence_number DESC LIMIT p_limit OFFSET p_offset
  )
  SELECT jsonb_build_object(
    'income_kobo', coalesce((SELECT sum(amount_kobo) FROM posted WHERE direction = 'income'), 0),
    'expense_kobo', coalesce((SELECT sum(amount_kobo) FROM posted WHERE direction = 'expense'), 0),
    'net_kobo', coalesce((SELECT sum(CASE WHEN direction = 'income' THEN amount_kobo ELSE -amount_kobo END) FROM posted), 0),
    'count', (SELECT count(*) FROM posted), 'total_entries', (SELECT count(*) FROM filtered),
    'entries', coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM page), '[]'::jsonb),
    'monthly', coalesce((SELECT jsonb_agg(to_jsonb(monthly)) FROM monthly), '[]'::jsonb),
    'categories', coalesce((SELECT jsonb_agg(to_jsonb(categories)) FROM categories), '[]'::jsonb),
    'events', coalesce((SELECT jsonb_agg(to_jsonb(events)) FROM events), '[]'::jsonb)
  ) INTO report;
  RETURN report;
END;
$$;
REVOKE ALL ON FUNCTION public.school_finance_report(date, date, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_finance_report(date, date, text, integer, integer) TO authenticated;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('finance-documents', 'finance-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Finance team reads supporting documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'finance-documents' AND public.can_manage_school_finance());
CREATE POLICY "Finance team uploads supporting documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'finance-documents' AND public.can_manage_school_finance());
-- Only unfiled uploads can be removed; filed supporting documents are retained.
CREATE POLICY "Finance team removes unfiled documents" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'finance-documents' AND public.can_manage_school_finance() AND NOT EXISTS (SELECT 1 FROM public.finance_entries WHERE document_path = name));

COMMIT;
