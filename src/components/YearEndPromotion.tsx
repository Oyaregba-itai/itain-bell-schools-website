import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ArrowRight, CheckCircle, GraduationCap, History, Users } from "lucide-react";

type PreviewRow = {
  student_id: string;
  student_name: string;
  admission_number: string | null;
  from_class_id: string;
  from_class_name: string;
  to_class_id: string | null;
  to_class_name: string | null;
  proposed_action: "promoted" | "graduated";
};

type AlumniRow = {
  id: string;
  student_id: string;
  graduation_academic_year: string;
  graduated_at: string;
  profile_snapshot: Record<string, string | null>;
  final_class_id: string;
};

const db = supabase as any;

const nextAcademicYear = (year: string) => {
  const match = year.match(/^(\d{4})\/(\d{4})$/);
  return match ? `${Number(match[1]) + 1}/${Number(match[2]) + 1}` : "";
};

export const YearEndPromotion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [termId, setTermId] = useState("");
  const [nextYear, setNextYear] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const { data: terms = [] } = useQuery({
    queryKey: ["trinity-terms-for-promotion"],
    queryFn: async () => {
      const { data, error } = await supabase.from("terms").select("id,name,academic_year,is_active").eq("name", "Trinity Term").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const selectedTerm = terms.find((term) => term.id === termId);
  const { data: completedRuns = [] } = useQuery({
    queryKey: ["promotion-runs"],
    queryFn: async () => {
      const { data, error } = await db.from("promotion_runs").select("*").order("performed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const alreadyRun = completedRuns.some((run: any) => run.academic_year === selectedTerm?.academic_year);
  const { data: preview = [], isFetching, error: previewError } = useQuery<PreviewRow[]>({
    queryKey: ["promotion-preview", termId],
    enabled: Boolean(termId) && !alreadyRun,
    queryFn: async () => {
      const { data, error } = await db.rpc("preview_year_end_promotion", { p_term_id: termId });
      if (error) throw error;
      return (data || []) as PreviewRow[];
    },
  });

  const groups = useMemo(() => {
    const grouped = new Map<string, PreviewRow[]>();
    preview.forEach((row) => {
      const key = `${row.from_class_name}::${row.to_class_name || "Alumni"}`;
      grouped.set(key, [...(grouped.get(key) || []), row]);
    });
    return [...grouped.entries()];
  }, [preview]);
  const graduateCount = preview.filter((row) => row.proposed_action === "graduated").length;
  const missingDestination = preview.some((row) => row.proposed_action === "promoted" && !row.to_class_id);

  const runPromotion = useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc("run_year_end_promotion", { p_term_id: termId, p_next_academic_year: nextYear.trim() });
      if (error) throw error;
      return data as { promoted: number; graduated: number };
    },
    onSuccess: (result) => {
      toast({ title: "Academic year closed", description: `${result.promoted} pupils promoted and ${result.graduated} pupils added to alumni.` });
      setConfirmed(false);
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast({ title: "Promotion was not completed", description: error.message, variant: "destructive" }),
  });

  const selectTerm = (id: string) => {
    setTermId(id);
    const term = terms.find((item) => item.id === id);
    setNextYear(term ? nextAcademicYear(term.academic_year) : "");
    setConfirmed(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-heading text-foreground">Year-End Promotion</h3>
        <p className="text-sm text-muted-foreground mt-1">Promote pupils from Explorers through Year 5, and move Year 6 pupils into the alumni register.</p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Completed Trinity Term</Label>
            <Select value={termId} onValueChange={selectTerm}>
              <SelectTrigger><SelectValue placeholder="Select a Trinity Term" /></SelectTrigger>
              <SelectContent>{terms.map((term) => <SelectItem key={term.id} value={term.id}>{term.academic_year} — Trinity Term</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Next academic year</Label>
            <Input value={nextYear} onChange={(event) => setNextYear(event.target.value)} placeholder="2026/2027" />
          </div>
        </div>

        {alreadyRun && (
          <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <CheckCircle size={18} className="shrink-0" /> This academic year has already been closed and cannot be promoted twice.
          </div>
        )}
        {previewError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{(previewError as Error).message}</div>}
        {isFetching && <p className="text-sm text-muted-foreground">Preparing promotion preview…</p>}

        {termId && !alreadyRun && preview.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard icon={Users} label="Eligible pupils" value={preview.length} />
              <SummaryCard icon={ArrowRight} label="Moving up" value={preview.length - graduateCount} />
              <SummaryCard icon={GraduationCap} label="Joining alumni" value={graduateCount} />
            </div>
            <div className="space-y-3">
              {groups.map(([key, pupils]) => {
                const [from, to] = key.split("::");
                return <div key={key} className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 font-medium text-foreground"><span>{from}</span><ArrowRight size={15} /><span>{to}</span><span className="ml-auto text-xs rounded-full bg-muted px-2 py-1">{pupils.length}</span></div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{pupils.map((pupil) => pupil.student_name).join(", ")}</p>
                </div>;
              })}
            </div>
            {missingDestination && <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle size={18} />A destination class is missing. Check the Early Years classes and Year 1 through Year 6 before continuing.</div>}
            <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
              <span><strong>I have reviewed this list.</strong><br /><span className="text-muted-foreground">This closes {selectedTerm?.academic_year}, updates current classes, creates the next Christmas Term, and cannot be run twice.</span></span>
            </label>
            <Button className="hero-gradient" disabled={!confirmed || missingDestination || !/^20\d{2}\/20\d{2}$/.test(nextYear) || runPromotion.isPending} onClick={() => runPromotion.mutate()}>
              {runPromotion.isPending ? "Closing academic year…" : "Close Session and Promote Pupils"}
            </Button>
          </>
        )}
      </div>

      {completedRuns.length > 0 && <div className="bg-card rounded-xl shadow-card p-5"><h4 className="font-heading flex items-center gap-2 mb-3"><History size={17} />Promotion history</h4><div className="space-y-2">{completedRuns.map((run: any) => <div key={run.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-sm"><span>{run.academic_year} → {run.next_academic_year}</span><span className="text-muted-foreground">{run.promoted_count} promoted · {run.graduated_count} alumni</span></div>)}</div></div>}
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) => <div className="rounded-lg bg-muted/50 p-4"><Icon size={18} className="text-primary mb-2" /><div className="text-2xl font-heading">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>;

export const AlumniView = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["alumni-register"],
    queryFn: async () => {
      const { data: alumni, error } = await db.from("alumni").select("*").order("graduated_at", { ascending: false });
      if (error) throw error;
      const classIds = [...new Set((alumni || []).map((row: AlumniRow) => row.final_class_id))];
      const { data: classes } = classIds.length ? await supabase.from("classes").select("id,name").in("id", classIds) : { data: [] };
      const classMap = new Map((classes || []).map((item) => [item.id, item.name]));
      return (alumni || []).map((row: AlumniRow) => ({ ...row, finalClassName: classMap.get(row.final_class_id) || "Year 6" }));
    },
  });
  const rows = (data || []).filter((row: AlumniRow & { finalClassName: string }) => {
    const name = String(row.profile_snapshot?.full_name || "");
    const number = String(row.profile_snapshot?.admission_number || row.profile_snapshot?.student_id || "");
    return `${name} ${number} ${row.graduation_academic_year}`.toLowerCase().includes(search.toLowerCase());
  });

  return <div className="space-y-6"><div><h3 className="text-lg font-heading">Alumni</h3><p className="text-sm text-muted-foreground mt-1">Permanent history of pupils who completed Year 6.</p></div><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, pupil number, or graduation year" className="max-w-md" />
    <div className="bg-card rounded-xl shadow-card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted"><tr><th className="text-left p-3">Name</th><th className="text-left p-3">Pupil number</th><th className="text-left p-3">Final class</th><th className="text-left p-3">Graduation year</th><th className="text-left p-3">Graduated</th></tr></thead><tbody>{rows.map((row: AlumniRow & { finalClassName: string }) => <tr key={row.id} className="border-t border-border"><td className="p-3 font-medium">{row.profile_snapshot?.full_name || "Unknown"}</td><td className="p-3 text-muted-foreground">{row.profile_snapshot?.admission_number || row.profile_snapshot?.student_id || "—"}</td><td className="p-3">{row.finalClassName}</td><td className="p-3">{row.graduation_academic_year}</td><td className="p-3 text-muted-foreground">{new Date(row.graduated_at).toLocaleDateString("en-GB")}</td></tr>)}{!isLoading && rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No alumni found.</td></tr>}</tbody></table></div>
  </div>;
};
