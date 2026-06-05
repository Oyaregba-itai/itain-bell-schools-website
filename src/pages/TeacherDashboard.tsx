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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, BookOpen, BarChart3, Upload, Star, ClipboardCheck, CheckCircle, Clock, Send } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";
import EventsView from "@/components/EventsView";
import MessagingView from "@/components/MessagingView";
import ProfilePage from "@/components/ProfilePage";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview" && <TeacherOverview onTabChange={setActiveTab} />}
      {activeTab === "profile" && <ProfilePage />}
      {activeTab === "upload" && <UploadResults />}
      {activeTab === "my-results" && <MyResults />}
      {activeTab === "timetable" && <TimetableView />}
      {activeTab === "events" && <EventsView />}
      {activeTab === "announcements" && <AnnouncementsView />}
      {activeTab === "messaging" && <MessagingView />}
    </DashboardLayout>
  );
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "#7B2D8B", "A": "#9B4DCA", "B+": "#166534", "B": "#16a34a",
  "C+": "#1e40af", "C": "#3b82f6", "D": "#c2410c", "E": "#b91c1c",
};

const getHour = () => new Date().getHours();
const greeting = () => getHour() < 12 ? "Good morning" : getHour() < 17 ? "Good afternoon" : "Good evening";

// Strip title prefix (Mrs, Mr, Miss, Ms, Dr, Coach) to get a usable first name
const extractFirstName = (fullName?: string | null) => {
  if (!fullName) return "Teacher";
  return fullName.replace(/^(Mrs?\.?|Miss|Ms\.?|Dr\.?|Coach)\s+/i, "").split(" ")[0];
};

const TeacherOverview = ({ onTabChange }: { onTabChange: (tab: string) => void }) => {
  const { user, profile } = useAuth();

  const { data: overview } = useQuery({
    queryKey: ["teacher-overview", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // My subjects with class names
      const { data: subjectsRaw } = await supabase.from("subjects").select("*").eq("teacher_id", user.id).order("name");
      const subjects = subjectsRaw || [];
      const classIds = [...new Set(subjects.map((s: any) => s.class_id).filter(Boolean))];
      let classMap: Record<string, string> = {};
      if (classIds.length > 0) {
        const { data: cls } = await supabase.from("classes").select("id, name").in("id", classIds as string[]);
        (cls || []).forEach((c: any) => { classMap[c.id] = c.name; });
      }
      const mySubjects = subjects.map((s: any) => ({ ...s, className: classMap[s.class_id] || "—" }));

      // Head of class?
      const { data: headClasses } = await supabase.from("classes").select("id, name").eq("head_teacher_id", user.id);

      // Results uploaded
      const { data: myResults } = await supabase.from("results").select("*").eq("uploaded_by", user.id).order("created_at", { ascending: false }).limit(6);
      const results = myResults || [];
      const studentIds = [...new Set(results.map((r: any) => r.student_id).filter(Boolean))];
      const subjectIds = [...new Set(results.map((r: any) => r.subject_id).filter(Boolean))];
      const [sRes, subRes] = await Promise.all([
        studentIds.length > 0 ? supabase.from("students").select("id, full_name").in("id", studentIds as string[]) : { data: [] },
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds as string[]) : { data: [] },
      ]);
      const studentMap: Record<string, string> = {};
      const subjectMap: Record<string, string> = {};
      (sRes.data || []).forEach((s: any) => { studentMap[s.id] = s.full_name; });
      (subRes.data || []).forEach((s: any) => { subjectMap[s.id] = s.name; });
      const recentResults = results.map((r: any) => ({ ...r, studentName: studentMap[r.student_id] || "—", subjectName: subjectMap[r.subject_id] || "—" }));

      // Grade distribution
      const { data: allResults } = await supabase.from("results").select("grade_letter").eq("uploaded_by", user.id);
      const gradeCounts: Record<string, number> = {};
      (allResults || []).forEach((r: any) => { if (r.grade_letter) gradeCounts[r.grade_letter] = (gradeCounts[r.grade_letter] || 0) + 1; });
      const gradeData = ["A+","A","B+","B","C+","C","D","E"].filter(g => gradeCounts[g]).map(g => ({ grade: g, count: gradeCounts[g] }));

      // Unique students taught
      const { data: studentsRes } = await supabase.from("results").select("student_id").eq("uploaded_by", user.id);
      const uniqueStudents = new Set((studentsRes || []).map((r: any) => r.student_id)).size;

      return { mySubjects, headClasses: headClasses || [], recentResults, gradeData, totalResults: allResults?.length || 0, uniqueStudents };
    },
    enabled: !!user,
  });

  const firstName = extractFirstName(profile?.full_name);

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-card rounded-xl p-5 shadow-card hero-gradient text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {profile?.profile_picture_url
              ? <img src={profile.profile_picture_url} className="w-full h-full rounded-full object-cover" />
              : firstName[0]?.toUpperCase()
            }
          </div>
          <div>
            <p className="text-lg font-heading">{greeting()}, {firstName}!</p>
            <p className="text-sm opacity-80">
              {overview?.headClasses?.length
                ? `Head of Class — ${overview.headClasses.map((c: any) => c.name).join(", ")}`
                : "Welcome to your teacher portal"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "My Subjects", value: overview?.mySubjects?.length || 0, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Results Uploaded", value: overview?.totalResults || 0, icon: BarChart3, color: "text-green-600", bg: "bg-green-50" },
          { label: "Students Assessed", value: overview?.uniqueStudents || 0, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl p-5 shadow-card">
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={card.color} size={20} />
            </div>
            <div className="text-2xl font-heading text-foreground">{card.value}</div>
            <div className="text-sm text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* My subjects list */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-heading font-semibold text-foreground flex items-center gap-2">
              <BookOpen size={16} className="text-primary" /> My Subjects
            </h4>
            <span className="text-xs text-muted-foreground">{overview?.mySubjects?.length || 0} assignments</span>
          </div>
          {overview?.mySubjects?.length ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {overview.mySubjects.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{s.className}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>
          )}
        </div>

        {/* Grade distribution */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
            <Star size={16} className="text-primary" /> Grade Distribution
          </h4>
          {overview?.gradeData?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overview.gradeData} margin={{ left: -20 }}>
                <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} results`, "Count"]} />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {overview.gradeData.map((entry: any) => (
                    <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <BarChart3 size={40} className="opacity-20" />
              <p className="text-sm">No results uploaded yet</p>
              <Button size="sm" className="hero-gradient gap-2 text-xs" onClick={() => onTabChange("upload")}>
                <Upload size={13} /> Upload Results
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Recent uploads */}
      {(overview?.recentResults?.length ?? 0) > 0 && (
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <GraduationCap size={16} className="text-primary" /> Recent Uploads
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2.5 font-medium text-muted-foreground">Student</th>
                  <th className="text-left p-2.5 font-medium text-muted-foreground">Subject</th>
                  <th className="text-center p-2.5 font-medium text-muted-foreground">Score /30</th>
                  <th className="text-center p-2.5 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left p-2.5 font-medium text-muted-foreground">Type</th>
                </tr>
              </thead>
              <tbody>
                {overview?.recentResults?.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2.5 text-foreground font-medium">{r.studentName}</td>
                    <td className="p-2.5 text-muted-foreground">{r.subjectName}</td>
                    <td className="p-2.5 text-center font-semibold">{r.total_score ?? "—"}</td>
                    <td className="p-2.5 text-center">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: (GRADE_COLORS[r.grade_letter] || "#6b7280") + "22", color: GRADE_COLORS[r.grade_letter] || "#6b7280" }}>
                        {r.grade_letter || "—"}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground text-xs capitalize">{r.result_type?.replace("_", " ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Head-of-class report submission section */}
      {(overview?.headClasses?.length ?? 0) > 0 && user && (
        <HeadOfClassReports userId={user.id} headClasses={overview!.headClasses} />
      )}
    </div>
  );
};

const HeadOfClassReports = ({ userId, headClasses }: { userId: string; headClasses: any[] }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selTerm, setSelTerm] = useState("");
  const [selType, setSelType] = useState<"mid_term" | "end_of_term">("mid_term");
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [headComment, setHeadComment] = useState("");

  const classId = headClasses[0]?.id;

  const { data: terms } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => {
      const { data } = await supabase.from("terms").select("*").order("created_at");
      return data || [];
    },
  });

  const { data: classData } = useQuery({
    queryKey: ["hoc-class-data", classId, selTerm, selType],
    enabled: !!(classId && selTerm),
    queryFn: async () => {
      // All students in this class
      const { data: students } = await supabase.from("students").select("*").eq("class_id", classId).order("full_name");
      const studentList = students || [];
      const studentIds = studentList.map((s: any) => s.id);

      // All subjects for this class
      const { data: subjectsRaw } = await supabase.from("subjects").select("id, name").eq("class_id", classId).order("name");
      const subjects = subjectsRaw || [];
      const subjectIds = subjects.map((s: any) => s.id);

      // All results for these students + term + type
      const { data: resultsRaw } = studentIds.length > 0
        ? await supabase.from("results").select("*").in("student_id", studentIds).eq("term_id", selTerm).eq("result_type", selType)
        : { data: [] };
      const results = resultsRaw || [];

      // Existing submissions
      const { data: subs } = studentIds.length > 0
        ? await supabase.from("report_submissions").select("*").in("student_id", studentIds).eq("term_id", selTerm).eq("result_type", selType)
        : { data: [] };
      const subMap: Record<string, any> = {};
      (subs || []).forEach((s: any) => { subMap[s.student_id] = s; });

      // Build per-student summary
      const studentSummaries = studentList.map((student: any) => {
        const studentResults = results.filter((r: any) => r.student_id === student.id);
        const resultMap: Record<string, any> = {};
        studentResults.forEach((r: any) => { resultMap[r.subject_id] = r; });
        const uploaded = studentResults.length;
        const total = subjects.length;
        const submission = subMap[student.id] || null;
        return { student, subjects, resultMap, uploaded, total, submission };
      });

      return { studentSummaries, subjects };
    },
  });

  const submitReport = useMutation({
    mutationFn: async ({ studentId, comment }: { studentId: string; comment: string }) => {
      const { error } = await supabase.from("report_submissions").upsert({
        student_id: studentId,
        term_id: selTerm,
        result_type: selType,
        head_teacher_id: userId,
        head_teacher_comment: comment,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }, { onConflict: "student_id,term_id,result_type" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report card submitted to admin" });
      queryClient.invalidateQueries({ queryKey: ["hoc-class-data"] });
      setReviewing(null);
      setHeadComment("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pending = classData?.studentSummaries?.filter((s: any) => !s.submission || s.submission.status === "draft").length || 0;
  const submitted = classData?.studentSummaries?.filter((s: any) => s.submission?.status === "submitted").length || 0;

  return (
    <div className="bg-card rounded-xl p-5 shadow-card border-l-4 border-primary space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-primary" />
          <h4 className="font-heading font-semibold text-foreground">
            Class Report Cards — {headClasses.map((c: any) => c.name).join(", ")}
          </h4>
        </div>
        <div className="flex gap-2">
          {pending > 0 && (
            <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
              <Clock size={11} /> {pending} pending
            </span>
          )}
          {submitted > 0 && (
            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle size={11} /> {submitted} submitted
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Review all subject results for your class, add your comment, and submit each student's report card to the admin.
      </p>

      {/* Term + type selectors */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs mb-1 block">Term</Label>
          <Select value={selTerm} onValueChange={setSelTerm}>
            <SelectTrigger><SelectValue placeholder="Select term..." /></SelectTrigger>
            <SelectContent>{terms?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.academic_year})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["mid_term", "end_of_term"] as const).map(t => (
            <button key={t} onClick={() => setSelType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selType === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
              {t === "mid_term" ? "Mid Term" : "End of Term"}
            </button>
          ))}
        </div>
      </div>

      {/* Student list */}
      {selTerm && classData && (
        <div className="space-y-2">
          {classData.studentSummaries.map((item: any) => {
            const { student, uploaded, total, submission } = item;
            const isSubmitted = submission?.status === "submitted" || submission?.status === "approved";
            const complete = uploaded >= total && total > 0;
            return (
              <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {student.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground">{uploaded}/{total} subjects uploaded</p>
                </div>
                <div className="flex items-center gap-2">
                  {isSubmitted
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Submitted</span>
                    : complete
                      ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Ready</span>
                      : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Incomplete</span>
                  }
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => { setReviewing(item); setHeadComment(submission?.head_teacher_comment || ""); }}>
                    {isSubmitted ? "View" : "Review & Submit"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={open => !open && setReviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card — {reviewing?.student?.full_name}</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              {/* Results table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2.5 font-medium text-muted-foreground">Subject</th>
                      <th className="text-center p-2.5 font-medium text-muted-foreground">Score /30</th>
                      <th className="text-center p-2.5 font-medium text-muted-foreground">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewing.subjects.map((s: any) => {
                      const r = reviewing.resultMap[s.id];
                      const score = r ? Number(r.total_score) : null;
                      const grade = r?.grade_letter || null;
                      return (
                        <tr key={s.id} className="border-t border-border">
                          <td className="p-2.5 font-medium">{s.name}</td>
                          <td className="p-2.5 text-center font-semibold">{score ?? <span className="text-amber-500 text-xs">Not uploaded</span>}</td>
                          <td className="p-2.5 text-center">
                            {grade
                              ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: (GRADE_COLORS[grade] || "#6b7280") + "22", color: GRADE_COLORS[grade] || "#6b7280" }}>{grade}</span>
                              : "—"
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              {(() => {
                const scores = reviewing.subjects.map((s: any) => reviewing.resultMap[s.id]?.total_score).filter((v: any) => v != null).map(Number);
                const total = scores.reduce((a: number, b: number) => a + b, 0);
                const avg = scores.length > 0 ? (total / scores.length).toFixed(2) : "—";
                return (
                  <div className="bg-muted/40 rounded-lg p-3 text-sm grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-muted-foreground text-xs">Score Obtained</p><p className="font-bold text-foreground">{total} / {reviewing.subjects.length * 30}</p></div>
                    <div><p className="text-muted-foreground text-xs">Average</p><p className="font-bold text-foreground">{avg}</p></div>
                    <div><p className="text-muted-foreground text-xs">Subjects Uploaded</p><p className="font-bold text-foreground">{scores.length} / {reviewing.subjects.length}</p></div>
                  </div>
                );
              })()}

              {/* Head teacher comment */}
              <div>
                <Label className="text-sm font-medium">Your Comment (Head Teacher)</Label>
                <Textarea
                  value={headComment}
                  onChange={e => setHeadComment(e.target.value)}
                  placeholder="Write your comment on this student's overall performance..."
                  rows={3}
                  className="mt-1"
                  disabled={reviewing?.submission?.status === "approved"}
                />
              </div>

              {reviewing?.submission?.status !== "approved" && (
                <Button className="w-full hero-gradient gap-2" onClick={() => submitReport.mutate({ studentId: reviewing.student.id, comment: headComment })} disabled={submitReport.isPending}>
                  <Send size={15} /> {submitReport.isPending ? "Submitting..." : "Submit Report Card to Admin"}
                </Button>
              )}
              {reviewing?.submission?.status === "approved" && (
                <p className="text-center text-sm text-green-600 font-medium">✓ This report card has been approved by admin</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
    result_type: "mid_term" as "mid_term" | "end_of_term",
    total_score: "",
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

  const getGradeLetter = (score: number): string => {
    if (score >= 28.5) return "A+";
    if (score >= 27.0) return "A";
    if (score >= 25.5) return "B+";
    if (score >= 24.0) return "B";
    if (score >= 22.5) return "C+";
    if (score >= 21.0) return "C";
    if (score >= 18.0) return "D";
    return "E";
  };

  const getGradeRemark = (score: number): string => {
    if (score >= 27.0) return "Outstanding";
    if (score >= 24.0) return "Proficient";
    if (score >= 21.0) return "Capable";
    if (score >= 18.0) return "PTE";
    return "NME";
  };

  const score = parseFloat(form.total_score) || 0;
  const previewGrade = form.total_score ? getGradeLetter(score) : null;
  const previewRemark = form.total_score ? getGradeRemark(score) : null;

  const upload = useMutation({
    mutationFn: async () => {
      const totalScore = parseFloat(form.total_score) || 0;
      const { error } = await supabase.from("results").insert([
        {
          student_id: form.student_id,
          subject_id: form.subject_id,
          term_id: form.term_id,
          result_type: form.result_type,
          total_score: totalScore,
          grade_letter: getGradeLetter(totalScore),
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
        result_type: form.result_type,
        total_score: "",
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

        <div>
          <Label>Result Type *</Label>
          <Select
            value={form.result_type}
            onValueChange={(v) => setForm({ ...form, result_type: v as "mid_term" | "end_of_term" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select result type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mid_term">Mid Term</SelectItem>
              <SelectItem value="end_of_term">End of Term</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Score (out of 30) *</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="30"
            value={form.total_score}
            onChange={(e) => setForm({ ...form, total_score: e.target.value })}
            placeholder="e.g. 27.5"
          />
          {previewGrade && (
            <p className="text-xs mt-1 font-semibold" style={{
              color: score >= 27 ? "#7B2D8B" : score >= 24 ? "#166534" : score >= 21 ? "#1e40af" : score >= 18 ? "#c2410c" : "#b91c1c"
            }}>
              Grade: {previewGrade} — {previewRemark}
            </p>
          )}
        </div>

        <div>
          <Label>Teacher Comment (optional)</Label>
          <Textarea
            value={form.teacher_comments}
            onChange={(e) => setForm({ ...form, teacher_comments: e.target.value })}
            placeholder="e.g. Fantastic progress! Keep it up."
            rows={2}
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
