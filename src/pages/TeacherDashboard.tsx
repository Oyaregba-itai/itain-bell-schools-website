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

// Grade calculation based on percentage (works for any total score)
const gradeFromPct = (pct: number) => {
  if (pct >= 95) return { letter: "A+", remark: "Outstanding", color: "#7B2D8B" };
  if (pct >= 90) return { letter: "A",  remark: "Outstanding", color: "#4a0e6e" };
  if (pct >= 85) return { letter: "B+", remark: "Proficient",  color: "#166534" };
  if (pct >= 80) return { letter: "B",  remark: "Proficient",  color: "#166534" };
  if (pct >= 75) return { letter: "C+", remark: "Capable",     color: "#1e40af" };
  if (pct >= 70) return { letter: "C",  remark: "Capable",     color: "#1e40af" };
  if (pct >= 60) return { letter: "D",  remark: "PTE",         color: "#c2410c" };
  return             { letter: "E",  remark: "NME",         color: "#b91c1c" };
};

const getGradeForScore = (score: number, outOf: number) =>
  outOf > 0 ? gradeFromPct((score / outOf) * 100) : gradeFromPct(0);

const UploadResults = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selSubject, setSelSubject] = useState("");
  const [selTerm, setSelTerm] = useState("");
  const [selType, setSelType] = useState<"mid_term" | "end_of_term">("mid_term");
  const [scores, setScores] = useState<Record<string, { score: string; comment: string }>>({});
  const [saving, setSaving] = useState(false);

  const outOf = selType === "mid_term" ? 30 : 70;

  const { data: subjects } = useQuery({
    queryKey: ["my-subjects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("subjects").select("*").eq("teacher_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: terms } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => {
      const { data } = await supabase.from("terms").select("*").order("created_at");
      return data || [];
    },
  });

  const selectedSubject = subjects?.find((s: any) => s.id === selSubject);

  const { data: classData } = useQuery({
    queryKey: ["upload-class-data", selSubject, selTerm, selType],
    enabled: !!(selSubject && selTerm),
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("*").eq("class_id", selectedSubject?.class_id).order("full_name");
      const studentList = students || [];
      const studentIds = studentList.map((s: any) => s.id);
      const { data: existing } = studentIds.length > 0
        ? await supabase.from("results").select("*").eq("subject_id", selSubject).eq("term_id", selTerm).eq("result_type", selType).in("student_id", studentIds)
        : { data: [] };
      const existingMap: Record<string, any> = {};
      (existing || []).forEach((r: any) => { existingMap[r.student_id] = r; });
      return { students: studentList, existingMap };
    },
  });

  // Initialise scores when data loads
  const initDone = !!(classData && selSubject && selTerm);

  const saveAll = async () => {
    if (!user || !classData) return;
    setSaving(true);
    let saved = 0, errors = 0;
    for (const student of classData.students) {
      const entry = scores[student.id];
      if (!entry?.score) continue;
      const scoreVal = parseFloat(entry.score);
      if (isNaN(scoreVal)) continue;
      const grade = getGradeForScore(scoreVal, outOf);
      const existing = classData.existingMap[student.id];
      try {
        if (existing) {
          await supabase.from("results").update({
            total_score: scoreVal,
            grade_letter: grade.letter,
            teacher_comments: entry.comment || null,
          }).eq("id", existing.id);
        } else {
          await supabase.from("results").insert({
            student_id: student.id,
            subject_id: selSubject,
            term_id: selTerm,
            result_type: selType,
            total_score: scoreVal,
            grade_letter: grade.letter,
            teacher_comments: entry.comment || null,
            uploaded_by: user.id,
          });
        }
        saved++;
      } catch { errors++; }
    }
    setSaving(false);
    if (saved > 0) {
      toast({ title: `${saved} result${saved !== 1 ? "s" : ""} saved successfully` });
      queryClient.invalidateQueries({ queryKey: ["upload-class-data"] });
      queryClient.invalidateQueries({ queryKey: ["my-results"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-overview"] });
    }
    if (errors > 0) toast({ title: "Some results failed to save", variant: "destructive" } as any);
  };

  const filledCount = Object.values(scores).filter(s => s.score).length;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-heading text-foreground">Upload Results</h3>

      {/* Selectors */}
      <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Subject *</Label>
            <Select value={selSubject} onValueChange={v => { setSelSubject(v); setScores({}); }}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Term *</Label>
            <Select value={selTerm} onValueChange={v => { setSelTerm(v); setScores({}); }}>
              <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
              <SelectContent>
                {terms?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.academic_year})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {(["mid_term", "end_of_term"] as const).map(t => (
            <button key={t} onClick={() => { setSelType(t); setScores({}); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selType === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "mid_term" ? "Mid Term (out of 30)" : "End of Term (out of 70)"}
            </button>
          ))}
        </div>

        {selectedSubject && selTerm && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <BookOpen size={13} className="text-primary" />
            <span>Entering <strong>{selType === "mid_term" ? "Mid Term" : "End of Term"}</strong> scores for <strong>{selectedSubject?.name}</strong> — max <strong>{outOf}</strong> per student</span>
          </div>
        )}
      </div>

      {/* Batch entry table */}
      {classData && classData.students.length > 0 && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="font-heading font-semibold text-foreground">
                {selectedSubject?.name} — {selType === "mid_term" ? "Mid Term" : "End of Term"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{classData.students.length} students · {filledCount} scores entered</p>
            </div>
            <Button className="hero-gradient gap-2" onClick={saveAll} disabled={saving || filledCount === 0}>
              {saving ? "Saving..." : `Save ${filledCount > 0 ? `(${filledCount})` : "All"} Results`}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-center p-3 font-medium text-muted-foreground w-36">Score /{outOf}</th>
                  <th className="text-center p-3 font-medium text-muted-foreground w-20">Grade</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Comment (optional)</th>
                  <th className="text-center p-3 font-medium text-muted-foreground w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {classData.students.map((student: any) => {
                  const existing = classData.existingMap[student.id];
                  const entry = scores[student.id] || { score: existing ? String(existing.total_score) : "", comment: existing?.teacher_comments || "" };
                  const scoreNum = parseFloat(entry.score) || 0;
                  const grade = entry.score ? getGradeForScore(scoreNum, outOf) : null;
                  const isDirty = entry.score && (String(scoreNum) !== String(existing?.total_score ?? "") || entry.comment !== (existing?.teacher_comments ?? ""));
                  return (
                    <tr key={student.id} className={`border-t border-border transition-colors ${isDirty ? "bg-primary/5" : ""}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {student.full_name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{student.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max={outOf}
                          value={entry.score}
                          onChange={e => setScores(prev => ({ ...prev, [student.id]: { ...entry, score: e.target.value } }))}
                          className="h-8 text-sm text-center w-full"
                          placeholder={`0–${outOf}`}
                        />
                      </td>
                      <td className="p-3 text-center">
                        {grade
                          ? <span className="text-sm font-bold" style={{ color: grade.color }}>{grade.letter}</span>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </td>
                      <td className="p-3">
                        <Input
                          value={entry.comment}
                          onChange={e => setScores(prev => ({ ...prev, [student.id]: { ...entry, comment: e.target.value } }))}
                          className="h-8 text-xs"
                          placeholder="Optional comment..."
                        />
                      </td>
                      <td className="p-3 text-center">
                        {existing && !isDirty
                          ? <span className="text-xs text-green-600 flex items-center justify-center gap-1"><CheckCircle size={12} /> Saved</span>
                          : isDirty
                            ? <span className="text-xs text-amber-600 font-medium">Unsaved</span>
                            : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border flex justify-end">
            <Button className="hero-gradient gap-2" onClick={saveAll} disabled={saving || filledCount === 0}>
              {saving ? "Saving..." : `Save ${filledCount > 0 ? `${filledCount} Result${filledCount !== 1 ? "s" : ""}` : "Results"}`}
            </Button>
          </div>
        </div>
      )}

      {selSubject && selTerm && classData?.students.length === 0 && (
        <div className="bg-card rounded-xl p-8 shadow-card text-center text-muted-foreground text-sm">
          No students found in this class.
        </div>
      )}
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
