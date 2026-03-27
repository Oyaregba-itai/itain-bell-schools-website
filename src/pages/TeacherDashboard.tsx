import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, BookOpen } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview" && <TeacherOverview />}
      {activeTab === "upload" && <UploadResults />}
      {activeTab === "my-results" && <MyResults />}
      {activeTab === "timetable" && <TimetableView />}
      {activeTab === "announcements" && <AnnouncementsView />}
    </DashboardLayout>
  );
};

const TeacherOverview = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["teacher-stats", user?.id],
    queryFn: async () => {
      const [subjects, results] = await Promise.all([
        supabase.from("subjects").select("id", { count: "exact" }).eq("teacher_id", user!.id),
        supabase.from("results").select("id", { count: "exact" }).eq("uploaded_by", user!.id),
      ]);
      return { subjects: subjects.count || 0, results: results.count || 0 };
    },
    enabled: !!user,
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-card rounded-xl p-5 shadow-card">
        <BookOpen className="text-primary mb-2" size={24} />
        <div className="text-2xl font-heading text-foreground">{stats?.subjects || 0}</div>
        <div className="text-sm text-muted-foreground">My Subjects</div>
      </div>
      <div className="bg-card rounded-xl p-5 shadow-card">
        <GraduationCap className="text-primary mb-2" size={24} />
        <div className="text-2xl font-heading text-foreground">{stats?.results || 0}</div>
        <div className="text-sm text-muted-foreground">Results Uploaded</div>
      </div>
    </div>
  );
};

const UploadResults = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ student_id: "", subject_id: "", term_id: "", grade: "", comment: "" });

  const { data: subjects } = useQuery({
    queryKey: ["my-subjects", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("*, classes(name)").eq("teacher_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: terms } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => { const { data } = await supabase.from("terms").select("*"); return data || []; },
  });

  // Get students for the selected subject's class
  const selectedSubject = subjects?.find(s => s.id === form.subject_id);
  const { data: students } = useQuery({
    queryKey: ["class-students", selectedSubject?.class_id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*").eq("class_id", selectedSubject!.class_id!);
      return data || [];
    },
    enabled: !!selectedSubject?.class_id,
  });

  const upload = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("results").insert({
        student_id: form.student_id,
        subject_id: form.subject_id,
        term_id: form.term_id,
        grade: form.grade,
        comment: form.comment || null,
        uploaded_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Result uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["my-results"] });
      setForm({ student_id: "", subject_id: form.subject_id, term_id: form.term_id, grade: "", comment: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-lg">
      <h3 className="text-lg font-heading text-foreground mb-6">Upload Result</h3>
      <form onSubmit={(e) => { e.preventDefault(); upload.mutate(); }} className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <div>
          <Label>Subject</Label>
          <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v, student_id: "" })}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {(s as any).classes?.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Student</Label>
          <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>{students?.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Term</Label>
          <Select value={form.term_id} onValueChange={(v) => setForm({ ...form, term_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
            <SelectContent>{terms?.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — {t.academic_year}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Grade</Label>
          <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
            <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent>
              {["A", "B", "C", "D", "F"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Comment (optional)</Label>
          <Input value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="e.g. Excellent performance" />
        </div>
        <Button type="submit" className="w-full hero-gradient" disabled={upload.isPending}>
          {upload.isPending ? "Uploading..." : "Upload Result"}
        </Button>
      </form>
    </div>
  );
};

const MyResults = () => {
  const { user } = useAuth();

  const { data: results } = useQuery({
    queryKey: ["my-results", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("results")
        .select("*, students(full_name), subjects(name), terms(name, academic_year)")
        .eq("uploaded_by", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div>
      <h3 className="text-lg font-heading text-foreground mb-6">Results I've Uploaded</h3>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
            </tr>
          </thead>
          <tbody>
            {results?.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 text-foreground">{(r as any).students?.full_name}</td>
                <td className="p-3 text-muted-foreground">{(r as any).subjects?.name}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-md text-xs font-bold ${r.grade === "A" ? "bg-secondary/10 text-secondary" : r.grade === "F" ? "bg-destructive/10 text-destructive" : "bg-accent/20 text-accent-foreground"}`}>{r.grade}</span></td>
                <td className="p-3 text-muted-foreground">{(r as any).terms?.name}</td>
              </tr>
            ))}
            {(!results || results.length === 0) && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No results uploaded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherDashboard;
