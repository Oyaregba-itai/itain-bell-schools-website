import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      if (!user?.id) return { subjects: 0, results: 0, testScores: 0 };

      const [subjectsRes, resultsRes, testScoresRes] = await Promise.all([
        supabase.from("subjects").select("id", { count: "exact" }).eq("teacher_id", user.id),
        supabase.from("results").select("id", { count: "exact" }).eq("uploaded_by", user.id),
        supabase.from("test_scores").select("id", { count: "exact" }).in(
          "test_id",
          (await supabase.from("tests").select("id").eq("teacher_id", user.id)).data?.map((t) => t.id) || []
        ),
      ]);

      return {
        subjects: subjectsRes.count || 0,
        results: resultsRes.count || 0,
        testScores: testScoresRes.count || 0,
      };
    },
    enabled: !!user,
  });

  return (
    <div className="grid grid-cols-3 gap-4">
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
      <div className="bg-card rounded-xl p-5 shadow-card">
        <GraduationCap className="text-primary mb-2" size={24} />
        <div className="text-2xl font-heading text-foreground">{stats?.testScores || 0}</div>
        <div className="text-sm text-muted-foreground">Test Scores Entered</div>
      </div>
    </div>
  );
};

const UploadResults = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    student_id: "",
    subject_id: "",
    term_id: "",
    assignment_score: "",
    test_score: "",
    exam_score: "",
    continuous_assessment: "",
    teacher_comments: "",
  });

  const { data: subjects } = useQuery({
    queryKey: ["my-subjects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("teacher_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: terms } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("terms").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Get students for the selected subject's class
  const selectedSubject = subjects?.find((s: any) => s.id === form.subject_id);
  const { data: students } = useQuery({
    queryKey: ["class-students", selectedSubject?.class_id],
    queryFn: async () => {
      if (!selectedSubject?.class_id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", selectedSubject.class_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSubject?.class_id,
  });

  const upload = useMutation({
    mutationFn: async () => {
      const totalScore =
        (parseFloat(form.assignment_score) || 0) +
        (parseFloat(form.test_score) || 0) +
        (parseFloat(form.exam_score) || 0) +
        (parseFloat(form.continuous_assessment) || 0);

      const { error } = await supabase.from("results").insert([
        {
          student_id: form.student_id,
          subject_id: form.subject_id,
          term_id: form.term_id,
          assignment_score: form.assignment_score || null,
          test_score: form.test_score || null,
          exam_score: form.exam_score || null,
          continuous_assessment: form.continuous_assessment || null,
          total_score: totalScore,
          teacher_comments: form.teacher_comments || null,
          uploaded_by: user!.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Result uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["my-results"] });
      setForm({
        student_id: "",
        subject_id: form.subject_id,
        term_id: form.term_id,
        assignment_score: "",
        test_score: "",
        exam_score: "",
        continuous_assessment: "",
        teacher_comments: "",
      });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-heading text-foreground mb-6">Upload Result</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
        className="bg-card rounded-xl p-6 shadow-card space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Subject *</Label>
            <Select
              value={form.subject_id}
              onValueChange={(v) => setForm({ ...form, subject_id: v, student_id: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Term *</Label>
            <Select value={form.term_id} onValueChange={(v) => setForm({ ...form, term_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Student *</Label>
          <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {students?.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Assignment Score</Label>
            <Input
              type="number"
              step="0.01"
              value={form.assignment_score}
              onChange={(e) => setForm({ ...form, assignment_score: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Test Score</Label>
            <Input
              type="number"
              step="0.01"
              value={form.test_score}
              onChange={(e) => setForm({ ...form, test_score: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Exam Score</Label>
            <Input
              type="number"
              step="0.01"
              value={form.exam_score}
              onChange={(e) => setForm({ ...form, exam_score: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Continuous Assessment</Label>
            <Input
              type="number"
              step="0.01"
              value={form.continuous_assessment}
              onChange={(e) => setForm({ ...form, continuous_assessment: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <Label>Comments (optional)</Label>
          <Textarea
            value={form.teacher_comments}
            onChange={(e) => setForm({ ...form, teacher_comments: e.target.value })}
            placeholder="e.g. Excellent performance, needs improvement..."
          />
        </div>

        <Button type="submit" className="w-full hero-gradient" disabled={upload.isPending || !form.student_id}>
          {upload.isPending ? "Uploading..." : "Upload Result"}
        </Button>
      </form>
    </div>
  );
};

const MyResults = () => {
  const { user } = useAuth();

  const { data: allData } = useQuery({
    queryKey: ["my-results", user?.id],
    queryFn: async () => {
      if (!user?.id) return { results: [], studentsMap: new Map(), subjectsMap: new Map(), termsMap: new Map() };

      const { data: resultsData, error: resultsError } = await supabase
        .from("results")
        .select(
          `
          *,
          students:student_id(id, first_name, last_name),
          subjects:subject_id(id, name),
          terms:term_id(id, name)
        `
        )
        .eq("uploaded_by", user.id);

      if (resultsError) throw resultsError;

      const studentsMap = new Map();
      const subjectsMap = new Map();
      const termsMap = new Map();

      resultsData?.forEach((result: any) => {
        if (result.students) studentsMap.set(result.student_id, result.students);
        if (result.subjects) subjectsMap.set(result.subject_id, result.subjects);
        if (result.terms) termsMap.set(result.term_id, result.terms);
      });

      return {
        results: resultsData || [],
        studentsMap,
        subjectsMap,
        termsMap,
      };
    },
    enabled: !!user,
  });

  const results = allData?.results || [];
  const studentsMap = allData?.studentsMap || new Map();
  const subjectsMap = allData?.subjectsMap || new Map();
  const termsMap = allData?.termsMap || new Map();

  return (
    <div>
      <h3 className="text-lg font-heading text-foreground mb-6">Results I've Uploaded</h3>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Total Score</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
            </tr>
          </thead>
          <tbody>
            {results?.map((r: any) => {
              const student = studentsMap.get(r.student_id);
              const subject = subjectsMap.get(r.subject_id);
              const term = termsMap.get(r.term_id);
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 text-foreground">
                    {student?.first_name} {student?.last_name}
                  </td>
                  <td className="p-3 text-muted-foreground">{subject?.name || "—"}</td>
                  <td className="p-3 text-foreground font-semibold">{r.total_score || "—"}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-bold ${
                        r.grade_letter === "A"
                          ? "bg-secondary/10 text-secondary"
                          : r.grade_letter === "F"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-accent/20 text-accent-foreground"
                      }`}
                    >
                      {r.grade_letter || "—"}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{term?.name || "—"}</td>
                </tr>
              );
            })}
            {(!results || results.length === 0) && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No results uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherDashboard;
