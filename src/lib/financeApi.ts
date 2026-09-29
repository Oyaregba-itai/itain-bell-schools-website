import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceReport } from "@/lib/finance";

// The checked-in generated schema predates finance. Keep its untyped boundary here.
export const financeClient = supabase as unknown as SupabaseClient;

export async function fetchFinanceReport(
  start: string,
  end: string,
  event: string,
  offset = 0,
  limit = 50,
): Promise<FinanceReport> {
  const { data, error } = await financeClient.rpc("school_finance_report", {
    p_start: start,
    p_end: end,
    p_event: event,
    p_offset: offset,
    p_limit: limit,
  });
  if (error) throw error;
  return data as FinanceReport;
}

export async function fetchFinanceEvents(): Promise<
  { id: string; title: string; start_date: string }[]
> {
  const result: { id: string; title: string; start_date: string }[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await financeClient
      .from("events")
      .select("id,title,start_date")
      .order("start_date", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    result.push(...data);
    if (data.length < 500) return result;
  }
}
