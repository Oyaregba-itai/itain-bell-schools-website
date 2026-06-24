import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notifyUsers, getAdminUserIds } from "@/lib/notifications";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, BookOpen, BarChart3, Upload, Star, ClipboardCheck, CheckCircle, Clock, Send, Users, ChevronRight, ChevronLeft, Banknote } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";
import EventsView from "@/components/EventsView";
import MessagingView from "@/components/MessagingView";
import ProfilePage from "@/components/ProfilePage";
import { FinancesView } from "@/pages/AdminDashboard";
import ReportCard from "@/components/ReportCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // Check if this teacher is head of any class
  const { data: headClasses } = useQuery({
    queryKey: ["head-classes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("classes").select("id, name").eq("head_teacher_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const isHeadOfClass = (headClasses?.length ?? 0) > 0;
  const isFinanceHead = profile?.is_finance_head === true;

  const extraTabs = [
    ...(isHeadOfClass
      ? [
          { id: "my-class", label: `My Class${headClasses?.[0]?.name ? ` — ${headClasses[0].name}` : ""}`, icon: Users },
          { id: "report-cards", label: "Report Cards", icon: ClipboardCheck },
        ]
      : []),
    ...(isFinanceHead ? [{ id: "finances", label: "Finances", icon: Banknote }] : []),
  ];

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} extraTabs={extraTabs}>
      {activeTab === "overview" && <TeacherOverview onTabChange={setActiveTab} />}
      {activeTab === "profile" && <ProfilePage />}
      {activeTab === "my-subjects" && <MySubjectsView />}
      {activeTab === "upload" && <UploadResults />}
      {activeTab === "my-results" && <MyResults />}
      {activeTab === "my-class" && isHeadOfClass && <MyClassView headClasses={headClasses!} />}
      {activeTab === "report-cards" && isHeadOfClass && user && <HeadOfClassReports userId={user.id} headClasses={headClasses!} />}
      {activeTab === "finances" && isFinanceHead && <FinancesView />}
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

// Returns "Mrs Duru", "Mr Adedunye", "Coach Obi", or just first name if no title
const getTitledName = (fullName?: string | null) => {
  if (!fullName) return "Teacher";
  const titleMatch = fullName.match(/^(Mrs?\.?|Miss|Ms\.?|Dr\.?|Coach|Sir)\s+/i);
  const withoutTitle = fullName.replace(/^(Mrs?\.?|Miss|Ms\.?|Dr\.?|Coach|Sir)\s+/i, "").trim();
  const lastName = withoutTitle.split(" ").pop() || withoutTitle;
  return titleMatch ? `${titleMatch[1]} ${lastName}` : withoutTitle.split(" ")[0];
};

const formatDateTime = (d: Date) => ({
  date: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
});

const TeacherOverview = ({ onTabChange }: { onTabChange: (tab: string) => void }) => {
  const { user, profile } = useAuth();

  const { data: overview } = useQuery({
    queryKey: ["teacher-overview", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // My subjects with class names (via subject_assignments)
      const { data: rawAssignments } = await supabase
        .from("subject_assignments")
        .select("subject_id, class_id, teacher_id, subjects(id, name), classes(id, name)")
        .eq("teacher_id", user.id);
      const mySubjects = (rawAssignments || []).map((a: any) => ({
        id: a.subject_id,
        name: a.subjects?.name || "—",
        class_id: a.class_id,
        teacher_id: a.teacher_id,
        className: a.classes?.name || "—",
      }));

      // Active term
      const { data: activeTerm } = await supabase.from("terms").select("name, academic_year").eq("is_active", true).maybeSingle();

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

      return { mySubjects, headClasses: headClasses || [], recentResults, gradeData, totalResults: allResults?.length || 0, uniqueStudents, activeTerm: activeTerm || null };
    },
    enabled: !!user,
  });

  const { data: todaySchedule } = useQuery({
    queryKey: ["teacher-today-timetable", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const today = dayNames[new Date().getDay()];
      if (today === "Saturday" || today === "Sunday") return [];

      const { data: rawAssignments2 } = await supabase
        .from("subject_assignments")
        .select("subject_id, class_id, subjects(name)")
        .eq("teacher_id", user.id);
      const mySubjects = (rawAssignments2 || []).map((a: any) => ({
        id: a.subject_id,
        name: a.subjects?.name || "—",
        class_id: a.class_id,
      }));
      if (!mySubjects.length) return [];

      const subjectIds = mySubjects.map((s: any) => s.id);
      const classIds = [...new Set(mySubjects.map((s: any) => s.class_id).filter(Boolean))] as string[];

      const { data: entries } = await supabase
        .from("timetable_entries")
        .select("*")
        .eq("day_of_week", today)
        .in("subject_id", subjectIds)
        .order("start_time");
      if (!entries?.length) return [];

      const { data: classes } = await supabase
        .from("classes")
        .select("id, name")
        .in("id", classIds);

      const subjectMap = new Map(mySubjects.map((s: any) => [s.id, s.name]));
      const classMap = new Map((classes || []).map((c: any) => [c.id, c.name]));

      return entries.map((e: any) => ({
        ...e,
        subjectName: subjectMap.get(e.subject_id) || "—",
        className: classMap.get(e.class_id) || "—",
      }));
    },
    enabled: !!user,
  });

  const displayName = getTitledName(profile?.full_name);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const { date, time } = formatDateTime(now);

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-card rounded-xl p-5 shadow-card hero-gradient text-primary-foreground">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {profile?.profile_picture_url
                ? <img src={profile.profile_picture_url} className="w-full h-full rounded-full object-cover" />
                : displayName[0]?.toUpperCase()
              }
            </div>
            <div>
              <p className="text-lg font-heading">{greeting()}, {displayName}!</p>
              <p className="text-sm opacity-80">
                {overview?.headClasses?.length
                  ? `Class Teacher — ${overview.headClasses.map((c: any) => c.name).join(", ")}`
                  : "Welcome to your teacher portal"}
              </p>
            </div>
          </div>
          <div className="text-right">
            {overview?.activeTerm && (
              <p className="text-sm font-semibold opacity-90">{overview.activeTerm.name} · {overview.activeTerm.academic_year}</p>
            )}
            <p className="text-sm opacity-80">{date}</p>
            <p className="text-lg font-heading">{time}</p>
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
                <div key={s.class_id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
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

      {/* Today's timetable */}
      <div className="bg-card rounded-xl p-5 shadow-card">
        <h4 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          Today&apos;s Schedule
          {todaySchedule && todaySchedule.length > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">{new Date().toLocaleDateString("en-GB", { weekday: "long" })}</span>
          )}
        </h4>
        {!todaySchedule || todaySchedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {new Date().getDay() === 0 || new Date().getDay() === 6
              ? "No classes today — enjoy your weekend!"
              : "No timetable entries found for your subjects today."}
          </p>
        ) : (
          <div className="space-y-2">
            {todaySchedule.map((entry: any) => (
              <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
                <div className="text-xs font-semibold text-primary whitespace-nowrap tabular-nums w-28">
                  {entry.start_time.slice(0, 5)} – {entry.end_time.slice(0, 5)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{entry.subjectName}</div>
                  <div className="text-xs text-muted-foreground">{entry.className}</div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                    <td className="p-2.5 text-center font-semibold">{r.did_not_participate ? <span className="text-muted-foreground text-xs">DNP</span> : (r.total_score ?? "—")}</td>
                    <td className="p-2.5 text-center">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: (GRADE_COLORS[r.grade_letter] || "#6b7280") + "22", color: GRADE_COLORS[r.grade_letter] || "#6b7280" }}>
                        {r.did_not_participate ? "—" : (r.grade_letter || "—")}
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
  const [attendanceDaysOpen, setAttendanceDaysOpen] = useState("");
  const [attendanceDaysPresent, setAttendanceDaysPresent] = useState("");
  const [attendanceNextTerm, setAttendanceNextTerm] = useState("");
  const [previewCard, setPreviewCard] = useState<{ studentId: string; termId: string } | null>(null);

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
      const [{ data: students }, { data: cls }] = await Promise.all([
        supabase.from("students").select("*").eq("class_id", classId).order("full_name"),
        supabase.from("classes").select("report_format").eq("id", classId).single(),
      ]);
      const studentList = students || [];
      const isCommentMode = cls?.report_format === "comment";
      const studentIds = studentList.map((s: any) => s.id);

      // All subjects for this class
      const { data: assignmentsRaw } = await supabase
        .from("subject_assignments")
        .select("subject_id, subjects(id, name)")
        .eq("class_id", classId);
      const subjects = (assignmentsRaw || []).map((a: any) => ({ id: a.subject_id, name: a.subjects?.name || "—" }))
        .sort((x: any, y: any) => x.name.localeCompare(y.name));
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

      return { studentSummaries, subjects, isCommentMode };
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
        ...(classData?.isCommentMode ? {
          days_open: attendanceDaysOpen ? parseInt(attendanceDaysOpen) : null,
          days_present: attendanceDaysPresent ? parseInt(attendanceDaysPresent) : null,
          next_term_begins: attendanceNextTerm || null,
        } : {}),
      }, { onConflict: "student_id,term_id,result_type" });
      if (error) throw error;

      try {
        const adminIds = await getAdminUserIds();
        const termName = terms?.find((t: any) => t.id === selTerm)?.name || "";
        await notifyUsers(
          adminIds,
          "report",
          "New report card submitted for review",
          `${reviewing?.student?.full_name || ""} — ${termName}`,
          "requests"
        );
      } catch { /* silent fail */ }
    },
    onSuccess: () => {
      toast({ title: "Report card submitted to admin" });
      queryClient.invalidateQueries({ queryKey: ["hoc-class-data"] });
      setReviewing(null);
      setHeadComment("");
      setAttendanceDaysOpen("");
      setAttendanceDaysPresent("");
      setAttendanceNextTerm("");
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
                    onClick={() => {
                      setReviewing(item);
                      setHeadComment(submission?.head_teacher_comment || "");
                      setAttendanceDaysOpen(submission?.days_open ? String(submission.days_open) : "");
                      setAttendanceDaysPresent(submission?.days_present ? String(submission.days_present) : "");
                      setAttendanceNextTerm(submission?.next_term_begins || "");
                    }}>
                    {isSubmitted ? "View" : "Review & Submit"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report card preview overlay */}
      {previewCard && (
        <ReportCard
          studentId={previewCard.studentId}
          termId={previewCard.termId}
          resultType={selType}
          onClose={() => setPreviewCard(null)}
        />
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
                      {classData?.isCommentMode
                        ? <th className="text-left p-2.5 font-medium text-muted-foreground">Comment</th>
                        : <>
                            <th className="text-center p-2.5 font-medium text-muted-foreground">Score /{selType === "mid_term" ? 30 : 70}</th>
                            <th className="text-center p-2.5 font-medium text-muted-foreground">Grade</th>
                          </>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {reviewing.subjects.map((s: any) => {
                      const r = reviewing.resultMap[s.id];
                      if (classData?.isCommentMode) {
                        return (
                          <tr key={s.id} className="border-t border-border">
                            <td className="p-2.5 font-medium">{s.name}</td>
                            <td className="p-2.5 text-sm">{r?.teacher_comments || <span className="text-amber-500 text-xs">No comment uploaded</span>}</td>
                          </tr>
                        );
                      }
                      const dnp = r?.did_not_participate;
                      const grade = !dnp ? (r?.grade_letter || null) : null;
                      return (
                        <tr key={s.id} className="border-t border-border">
                          <td className="p-2.5 font-medium">{s.name}</td>
                          <td className="p-2.5 text-center font-semibold">
                            {!r
                              ? <span className="text-amber-500 text-xs">Not uploaded</span>
                              : dnp
                                ? <span className="text-muted-foreground text-xs">Did not participate</span>
                                : r.total_score ?? "—"}
                          </td>
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

              {/* Summary (score mode only) */}
              {!classData?.isCommentMode && (() => {
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

              {/* Attendance (comment mode only) */}
              {classData?.isCommentMode && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Days School Open</Label>
                    <Input type="number" value={attendanceDaysOpen} onChange={e => setAttendanceDaysOpen(e.target.value)} placeholder="e.g. 106" className="h-8 text-sm" disabled={reviewing?.submission?.status === "approved"} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Days Present</Label>
                    <Input type="number" value={attendanceDaysPresent} onChange={e => setAttendanceDaysPresent(e.target.value)} placeholder="e.g. 100" className="h-8 text-sm" disabled={reviewing?.submission?.status === "approved"} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Next Term Begins</Label>
                    <Input value={attendanceNextTerm} onChange={e => setAttendanceNextTerm(e.target.value)} placeholder="e.g. Mon 27th April 2026" className="h-8 text-sm" disabled={reviewing?.submission?.status === "approved"} />
                  </div>
                </div>
              )}

              {/* Head teacher comment */}
              <div>
                <Label className="text-sm font-medium">Your Comment (Class Teacher)</Label>
                <Textarea
                  value={headComment}
                  onChange={e => setHeadComment(e.target.value)}
                  placeholder="Write your comment on this student's overall performance..."
                  rows={3}
                  className="mt-1"
                  disabled={reviewing?.submission?.status === "approved"}
                />
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => setPreviewCard({ studentId: reviewing.student.id, termId: selTerm })}>
                <BookOpen size={15} /> Preview Report Card
              </Button>

              {reviewing?.submission?.status !== "approved" && (() => {
                const complete = reviewing.uploaded >= reviewing.total && reviewing.total > 0;
                const incompleteMsg = classData?.isCommentMode
                  ? `All subject comments must be uploaded before submitting. (${reviewing.uploaded}/${reviewing.total} uploaded)`
                  : `All subject scores must be uploaded before this report card can be submitted. (${reviewing.uploaded}/${reviewing.total} subjects uploaded)`;
                return (
                  <>
                    {!complete && (
                      <p className="text-center text-sm text-amber-600 bg-amber-50 rounded-lg p-2">
                        {incompleteMsg}
                      </p>
                    )}
                    <Button className="w-full hero-gradient gap-2" onClick={() => submitReport.mutate({ studentId: reviewing.student.id, comment: headComment })} disabled={submitReport.isPending || !complete}>
                      <Send size={15} /> {submitReport.isPending ? "Submitting..." : "Submit Report Card to Admin"}
                    </Button>
                  </>
                );
              })()}
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

// ── My Subjects drill-down ────────────────────────────────────────────────────

export const MySubjectsView = () => {
  const { user } = useAuth();
  const [viewingSubject, setViewingSubject] = useState<string | null>(null);
  const [viewingClass, setViewingClass] = useState<{ classId: string; className: string; subjectName: string } | null>(null);

  const { data: mySubjects } = useQuery({
    queryKey: ["my-subjects-full", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("subject_assignments")
        .select("subject_id, class_id, teacher_id, subjects(id, name), classes(id, name)")
        .eq("teacher_id", user.id);
      return (data || []).map((a: any) => ({
        id: a.subject_id,
        name: a.subjects?.name || "—",
        class_id: a.class_id,
        teacher_id: a.teacher_id,
        className: a.classes?.name || "—",
      }));
    },
    enabled: !!user,
  });

  // Group by subject name
  const grouped = (mySubjects || []).reduce((acc: Record<string, any[]>, s: any) => {
    if (!acc[s.name]) acc[s.name] = [];
    acc[s.name].push(s);
    return acc;
  }, {});

  // Level 3: students in a class doing a subject
  if (viewingClass) {
    return <SubjectClassStudents {...viewingClass} onBack={() => setViewingClass(null)} />;
  }

  // Level 2: classes for a specific subject
  if (viewingSubject) {
    const classes = grouped[viewingSubject] || [];
    return (
      <div className="space-y-6">
        <button onClick={() => setViewingSubject(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ChevronLeft size={18} /> Back to My Subjects
        </button>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h2 className="text-xl font-heading text-foreground">{viewingSubject}</h2>
          <p className="text-muted-foreground text-sm mt-1">You teach this subject in {classes.length} {classes.length === 1 ? "class" : "classes"}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((s: any) => (
            <button
              key={s.class_id}
              onClick={() => setViewingClass({ classId: s.class_id, className: s.className, subjectName: viewingSubject })}
              className="bg-card rounded-xl p-5 shadow-card border border-border text-left hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">{s.className}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Click to see students</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Level 1: all subjects grouped
  const subjectNames = Object.keys(grouped).sort();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-heading text-foreground">My Subjects</h3>
        <p className="text-muted-foreground text-sm mt-1">
          {subjectNames.length} subject{subjectNames.length !== 1 ? "s" : ""} across {mySubjects?.length || 0} class assignment{(mySubjects?.length || 0) !== 1 ? "s" : ""}
        </p>
      </div>

      {subjectNames.length === 0 && (
        <div className="bg-card rounded-xl p-12 shadow-card text-center">
          <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No subjects assigned yet</p>
          <p className="text-sm text-muted-foreground mt-1">Contact your administrator to get subjects assigned to you.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjectNames.map(name => {
          const classes = grouped[name];
          return (
            <button
              key={name}
              onClick={() => setViewingSubject(name)}
              className="bg-card rounded-xl p-5 shadow-card border border-border text-left hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-primary" />
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {classes.length} {classes.length === 1 ? "class" : "classes"}: {classes.map((c: any) => c.className).join(", ")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SubjectClassStudents = ({ classId, className, subjectName, onBack }: { classId: string; className: string; subjectName: string; onBack: () => void }) => {
  const { data: students } = useQuery({
    queryKey: ["subject-class-students", classId],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*").eq("class_id", classId).order("full_name");
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ChevronLeft size={18} /> Back to {subjectName}
      </button>

      <div className="bg-card rounded-xl p-5 shadow-card">
        <h2 className="text-xl font-heading text-foreground">{subjectName}</h2>
        <p className="text-muted-foreground text-sm mt-1">{className} · {students?.length || 0} students</p>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h4 className="font-heading font-semibold text-foreground">Students in {className}</h4>
        </div>
        <div className="divide-y divide-border">
          {students?.map((student: any, i: number) => (
            <div key={student.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
              <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">{i + 1}</span>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {student.avatar_url
                  ? <img src={student.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <span className="text-primary font-bold text-sm">{student.full_name?.[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{student.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {student.admission_number && `${student.admission_number} · `}
                  {student.gender && <span className="capitalize">{student.gender}</span>}
                  {student.date_of_birth && ` · Age ${new Date().getFullYear() - new Date(student.date_of_birth).getFullYear()}`}
                </p>
              </div>
              <div className="flex gap-2">
                {student.school_section && (
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${student.school_section === "primary" ? "bg-green-100 text-green-700" : student.school_section === "nursery" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                    {student.school_section}
                  </span>
                )}
              </div>
            </div>
          ))}
          {!students?.length && (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">No students in this class.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const MyClassView = ({ headClasses }: { headClasses: any[] }) => {
  const { user } = useAuth();
  const [selTerm, setSelTerm] = useState("");
  const [selType, setSelType] = useState<"mid_term" | "end_of_term">("mid_term");

  const classId = headClasses[0]?.id;
  const className = headClasses[0]?.name;

  const { data: terms } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => {
      const { data } = await supabase.from("terms").select("*").order("created_at");
      return data || [];
    },
  });

  const { data: classInfo } = useQuery({
    queryKey: ["my-class-view", classId, selTerm, selType],
    enabled: !!classId,
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("*").eq("class_id", classId).order("full_name");
      const studentList = students || [];
      const studentIds = studentList.map((s: any) => s.id);

      const { data: subjectAssignments } = await supabase
        .from("subject_assignments")
        .select("subject_id, subjects(id, name)")
        .eq("class_id", classId);
      const subjects = (subjectAssignments || []).map((a: any) => ({ id: a.subject_id, name: a.subjects?.name || "—" }));
      const totalSubjects = subjects.length;

      // Results per student for selected term + type
      let resultCounts: Record<string, number> = {};
      let submissions: Record<string, any> = {};
      if (selTerm && studentIds.length > 0) {
        const { data: results } = await supabase.from("results").select("student_id, subject_id")
          .in("student_id", studentIds).eq("term_id", selTerm).eq("result_type", selType);
        (results || []).forEach((r: any) => {
          resultCounts[r.student_id] = (resultCounts[r.student_id] || 0) + 1;
        });
        const { data: subs } = await supabase.from("report_submissions").select("*")
          .in("student_id", studentIds).eq("term_id", selTerm).eq("result_type", selType);
        (subs || []).forEach((s: any) => { submissions[s.student_id] = s; });
      }

      return { students: studentList, totalSubjects, resultCounts, submissions };
    },
  });

  const students = classInfo?.students || [];
  const totalSubjects = classInfo?.totalSubjects || 0;
  const ready = students.filter((s: any) => (classInfo?.resultCounts[s.id] || 0) >= totalSubjects && totalSubjects > 0).length;

  return (
    <div className="space-y-6">
      {/* Class header */}
      <div className="hero-gradient rounded-xl p-6 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Users size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-heading">{className}</h2>
            <p className="opacity-80 text-sm">{students.length} students · {totalSubjects} subjects · Class Teacher</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Students", value: students.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Subjects", value: totalSubjects, color: "text-green-600", bg: "bg-green-50" },
          { label: selTerm ? "Results Ready" : "Select term", value: selTerm ? ready : "—", color: "text-purple-600", bg: "bg-purple-50" },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl p-4 shadow-card">
            <div className={`text-2xl font-heading ${card.color}`}>{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Term filter */}
      <div className="bg-card rounded-xl p-4 shadow-card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <p className="text-xs text-muted-foreground mb-1">Filter by term to see results progress</p>
          <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground">
            <option value="">All students</option>
            {terms?.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>)}
          </select>
        </div>
        {selTerm && (
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["mid_term", "end_of_term"] as const).map(t => (
              <button key={t} onClick={() => setSelType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selType === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                {t === "mid_term" ? "Mid Term" : "End of Term"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Students table */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h4 className="font-heading font-semibold text-foreground">Students in {className}</h4>
          <span className="text-xs text-muted-foreground">{students.length} enrolled</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Gender</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Admission No.</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Section</th>
                {selTerm && <th className="text-left p-3 font-medium text-muted-foreground">Results Progress</th>}
                {selTerm && <th className="text-left p-3 font-medium text-muted-foreground">Report Status</th>}
              </tr>
            </thead>
            <tbody>
              {students.map((student: any, i: number) => {
                const uploaded = classInfo?.resultCounts[student.id] || 0;
                const sub = classInfo?.submissions[student.id];
                const pct = totalSubjects > 0 ? Math.round((uploaded / totalSubjects) * 100) : 0;
                return (
                  <tr key={student.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {student.avatar_url
                            ? <img src={student.avatar_url} className="w-full h-full object-cover" alt="" />
                            : <span className="text-primary font-bold text-sm">{student.full_name?.[0]?.toUpperCase()}</span>
                          }
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{student.full_name}</p>
                          {student.student_id && <p className="text-xs text-muted-foreground">{student.student_id}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground capitalize">{student.gender || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">{student.admission_number || "—"}</td>
                    <td className="p-3">
                      {student.school_section && (
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${student.school_section === "primary" ? "bg-green-100 text-green-700" : student.school_section === "nursery" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                          {student.school_section}
                        </span>
                      )}
                    </td>
                    {selTerm && (
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden w-24">
                            <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : pct > 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{uploaded}/{totalSubjects}</span>
                        </div>
                      </td>
                    )}
                    {selTerm && (
                      <td className="p-3">
                        {sub?.status === "approved"
                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><CheckCircle size={10} /> Approved</span>
                          : sub?.status === "submitted"
                            ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full w-fit">Submitted</span>
                            : pct === 100
                              ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full w-fit">Ready to submit</span>
                              : <span className="text-xs text-muted-foreground">Pending results</span>
                        }
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
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

export const UploadResults = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selSubject, setSelSubject] = useState("");
  const [selTerm, setSelTerm] = useState("");
  const [selType, setSelType] = useState<"mid_term" | "end_of_term">("mid_term");
  const [scores, setScores] = useState<Record<string, { score: string; comment: string; dnp: boolean }>>({});
  const [saving, setSaving] = useState(false);

  const outOf = selType === "mid_term" ? 30 : 70;

  const { data: subjects } = useQuery({
    queryKey: ["my-subjects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: own } = await supabase
        .from("subject_assignments")
        .select("subject_id, class_id, teacher_id, subjects(id, name), classes(id, name)")
        .eq("teacher_id", user.id);
      const ownList = (own || []).map((a: any) => ({
        key: `${a.subject_id}__${a.class_id}`,
        id: a.subject_id,
        class_id: a.class_id,
        teacher_id: a.teacher_id,
        name: a.subjects?.name || "—",
        className: a.classes?.name || "",
      }));

      // Subjects the head teacher has been approved to upload for, beyond their own
      const { data: approved } = await supabase
        .from("score_upload_requests")
        .select("subject_id, class_id, subjects(id, name), classes(id, name)")
        .eq("head_teacher_id", user.id)
        .eq("status", "approved");
      const approvedList = (approved || [])
        .map((a: any) => ({
          key: `${a.subject_id}__${a.class_id}`,
          id: a.subject_id,
          class_id: a.class_id,
          teacher_id: null,
          name: a.subjects?.name || "—",
          className: a.classes?.name || "",
        }))
        .filter((a: any) => !ownList.some((o: any) => o.id === a.id && o.class_id === a.class_id));

      return [...ownList, ...approvedList];
    },
    enabled: !!user,
  });

  // Head-of-class: subjects taught by other teachers in their class, for requesting upload access
  const { data: headClasses } = useQuery({
    queryKey: ["head-classes-upload", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("classes").select("id, name").eq("head_teacher_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: requestableSubjects } = useQuery({
    queryKey: ["score-upload-requests", user?.id, headClasses],
    enabled: !!user && (headClasses?.length ?? 0) > 0,
    queryFn: async () => {
      const classIds = (headClasses || []).map((c: any) => c.id);
      const [{ data: assignments }, { data: requests }] = await Promise.all([
        supabase
          .from("subject_assignments")
          .select("subject_id, class_id, teacher_id, subjects(id, name), classes(id, name)")
          .in("class_id", classIds),
        supabase.from("score_upload_requests").select("*").eq("head_teacher_id", user!.id).order("requested_at", { ascending: true }),
      ]);
      const requestMap: Record<string, any> = {};
      (requests || []).forEach((r: any) => { requestMap[`${r.subject_id}_${r.class_id}`] = r; });
      return (assignments || [])
        .filter((a: any) => a.teacher_id !== user!.id)
        .map((a: any) => ({
          subject_id: a.subject_id,
          class_id: a.class_id,
          name: a.subjects?.name || "—",
          className: a.classes?.name || "",
          request: requestMap[`${a.subject_id}_${a.class_id}`] || null,
        }));
    },
  });

  const requestAccess = useMutation({
    mutationFn: async ({ subjectId, classId, subjectName, className }: { subjectId: string; classId: string; subjectName?: string; className?: string }) => {
      const { error } = await supabase.from("score_upload_requests").insert({
        head_teacher_id: user!.id,
        subject_id: subjectId,
        class_id: classId,
      });
      if (error) throw error;

      try {
        const { data: requesterProfile } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).single();
        const adminIds = await getAdminUserIds();
        await notifyUsers(
          adminIds,
          "request",
          "New score upload request",
          `${requesterProfile?.full_name || "A class teacher"} requested access for ${className || ""} / ${subjectName || ""}`,
          "requests"
        );
      } catch { /* silent fail */ }
    },
    onSuccess: () => {
      toast({ title: "Request sent to admin" });
      queryClient.invalidateQueries({ queryKey: ["score-upload-requests"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const { data: terms } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => {
      const { data } = await supabase.from("terms").select("*").order("created_at");
      return data || [];
    },
  });

  useEffect(() => {
    if (!selTerm && terms?.length) {
      const active = terms.find((t: any) => t.is_active);
      if (active) setSelTerm(active.id);
    }
  }, [terms, selTerm]);

  const selectedSubject = subjects?.find((s: any) => s.key === selSubject);

  const { data: classData } = useQuery({
    queryKey: ["upload-class-data", selSubject, selTerm, selType],
    enabled: !!(selectedSubject && selTerm),
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("*").eq("class_id", selectedSubject?.class_id).order("full_name");
      const studentList = students || [];
      const studentIds = studentList.map((s: any) => s.id);
      const [existingRes, clsRes] = await Promise.all([
        studentIds.length > 0
          ? supabase.from("results").select("*").eq("subject_id", selectedSubject?.id).eq("term_id", selTerm).eq("result_type", selType).in("student_id", studentIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("classes").select("report_format").eq("id", selectedSubject?.class_id).single(),
      ]);
      const existingMap: Record<string, any> = {};
      (existingRes.data || []).forEach((r: any) => { existingMap[r.student_id] = r; });
      return { students: studentList, existingMap, isCommentMode: clsRes.data?.report_format === "comment" };
    },
  });

  // Initialise scores when data loads
  const initDone = !!(classData && selSubject && selTerm);

  const saveAll = async () => {
    if (!user || !classData || !selectedSubject) return;
    setSaving(true);
    let saved = 0, errors = 0;
    let lastError: string | undefined;
    for (const student of classData.students) {
      const entry = scores[student.id];
      const existing = classData.existingMap[student.id];
      let error;
      try {
        if (classData.isCommentMode) {
          if (!entry?.comment) continue;
          if (existing) {
            ({ error } = await supabase.from("results").update({
              teacher_comments: entry.comment,
              total_score: null,
              grade_letter: null,
              did_not_participate: false,
            }).eq("id", existing.id));
          } else {
            ({ error } = await supabase.from("results").insert({
              student_id: student.id,
              subject_id: selectedSubject.id,
              term_id: selTerm,
              result_type: selType,
              teacher_comments: entry.comment,
              total_score: null,
              grade_letter: null,
              did_not_participate: false,
              uploaded_by: user.id,
            }));
          }
        } else if (!entry?.score && !entry?.dnp) {
          continue;
        } else if (entry?.dnp) {
          if (existing) {
            ({ error } = await supabase.from("results").update({
              did_not_participate: true,
              total_score: null,
              grade_letter: null,
              teacher_comments: null,
            }).eq("id", existing.id));
          } else {
            ({ error } = await supabase.from("results").insert({
              student_id: student.id,
              subject_id: selectedSubject.id,
              term_id: selTerm,
              result_type: selType,
              did_not_participate: true,
              total_score: null,
              grade_letter: null,
              uploaded_by: user.id,
            }));
          }
        } else {
          const scoreVal = parseFloat(entry.score);
          if (isNaN(scoreVal)) continue;
          const grade = getGradeForScore(scoreVal, outOf);
          if (existing) {
            ({ error } = await supabase.from("results").update({
              did_not_participate: false,
              total_score: scoreVal,
              grade_letter: grade.letter,
              teacher_comments: entry.comment || null,
            }).eq("id", existing.id));
          } else {
            ({ error } = await supabase.from("results").insert({
              student_id: student.id,
              subject_id: selectedSubject.id,
              term_id: selTerm,
              result_type: selType,
              did_not_participate: false,
              total_score: scoreVal,
              grade_letter: grade.letter,
              teacher_comments: entry.comment || null,
              uploaded_by: user.id,
            }));
          }
        }
      } catch (e: any) {
        error = e;
      }
      if (error) {
        errors++;
        lastError = error.message || String(error);
      } else {
        saved++;
      }
    }
    setSaving(false);
    if (saved > 0) {
      toast({ title: `${saved} result${saved !== 1 ? "s" : ""} saved successfully` });
      queryClient.invalidateQueries({ queryKey: ["upload-class-data"] });
      queryClient.invalidateQueries({ queryKey: ["my-results"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-overview"] });
    }
    if (errors > 0) {
      toast({
        title: `${errors} result${errors !== 1 ? "s" : ""} failed to save`,
        description: lastError,
        variant: "destructive",
      } as any);
    }
  };

  const filledCount = Object.values(scores).filter(s => classData?.isCommentMode ? !!s.comment : (s.score || s.dnp)).length;

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
                {subjects?.map((s: any) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.name}{s.className ? ` — ${s.className}` : ""}
                  </SelectItem>
                ))}
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
            <span>Entering <strong>{selType === "mid_term" ? "Mid Term" : "End of Term"}</strong> scores for <strong>{selectedSubject?.name}{selectedSubject?.className ? ` — ${selectedSubject.className}` : ""}</strong> — max <strong>{outOf}</strong> per student</span>
          </div>
        )}
      </div>

      {/* Request access to other subjects in your class (head of class only) */}
      {(requestableSubjects?.length ?? 0) > 0 && (
        <div className="bg-card rounded-xl p-5 shadow-card space-y-3">
          <div>
            <h4 className="font-heading font-semibold text-foreground text-sm">Request Access to Other Subjects</h4>
            <p className="text-xs text-muted-foreground mt-0.5">As head of class, you can request permission to upload scores for subjects taught by other teachers in your class.</p>
          </div>
          <div className="space-y-2">
            {requestableSubjects!.map((item: any) => (
              <div key={`${item.subject_id}_${item.class_id}`} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-sm text-foreground">{item.name}{item.className ? ` — ${item.className}` : ""}</span>
                {item.request?.status === "approved" ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Approved</span>
                ) : item.request?.status === "pending" ? (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pending approval</span>
                ) : item.request?.status === "denied" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Denied</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => requestAccess.mutate({ subjectId: item.subject_id, classId: item.class_id, subjectName: item.name, className: item.className })}
                      disabled={requestAccess.isPending}>
                      Request Again
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => requestAccess.mutate({ subjectId: item.subject_id, classId: item.class_id, subjectName: item.name, className: item.className })}
                    disabled={requestAccess.isPending}>
                    Request Access
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch entry table */}
      {classData && classData.students.length > 0 && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="font-heading font-semibold text-foreground">
                {selectedSubject?.name}{selectedSubject?.className ? ` (${selectedSubject.className})` : ""} — {selType === "mid_term" ? "Mid Term" : "End of Term"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {classData.students.length} students · {filledCount} {classData.isCommentMode ? "comments" : "scores"} entered
              </p>
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
                  {classData.isCommentMode
                    ? <th className="text-left p-3 font-medium text-muted-foreground">Comment</th>
                    : <>
                        <th className="text-center p-3 font-medium text-muted-foreground w-36">Score /{outOf}</th>
                        <th className="text-center p-3 font-medium text-muted-foreground w-20">Grade</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Comment (optional)</th>
                      </>
                  }
                  <th className="text-center p-3 font-medium text-muted-foreground w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {classData.students.map((student: any) => {
                  const existing = classData.existingMap[student.id];
                  const entry = scores[student.id] || { score: existing && !existing.did_not_participate ? String(existing.total_score ?? "") : "", comment: existing?.teacher_comments || "", dnp: existing?.did_not_participate || false };

                  if (classData.isCommentMode) {
                    const isDirty = entry.comment !== (existing?.teacher_comments ?? "");
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
                            value={entry.comment}
                            onChange={e => setScores(prev => ({ ...prev, [student.id]: { ...entry, comment: e.target.value } }))}
                            className="h-8 text-xs"
                            placeholder="e.g. She can count 1–20 fluently"
                          />
                        </td>
                        <td className="p-3 text-center">
                          {existing?.teacher_comments && !isDirty
                            ? <span className="text-xs text-green-600 flex items-center justify-center gap-1"><CheckCircle size={12} /> Saved</span>
                            : isDirty
                              ? <span className="text-xs text-amber-600">Unsaved</span>
                              : null
                          }
                        </td>
                      </tr>
                    );
                  }

                  const scoreNum = parseFloat(entry.score) || 0;
                  const grade = entry.score && !entry.dnp ? getGradeForScore(scoreNum, outOf) : null;
                  const isDirty = entry.dnp
                    ? !existing?.did_not_participate
                    : entry.score && (String(scoreNum) !== String(existing?.total_score ?? "") || entry.comment !== (existing?.teacher_comments ?? ""));
                  const toggleDnp = () => setScores(prev => ({ ...prev, [student.id]: { ...entry, dnp: !entry.dnp, score: entry.dnp ? "" : "", comment: "" } }));
                  return (
                    <tr key={student.id} className={`border-t border-border transition-colors ${entry.dnp ? "bg-muted/40" : isDirty ? "bg-primary/5" : ""}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {student.full_name?.[0]?.toUpperCase()}
                          </div>
                          <span className={`font-medium ${entry.dnp ? "text-muted-foreground line-through" : "text-foreground"}`}>{student.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {entry.dnp
                          ? <span className="text-muted-foreground text-sm italic">—</span>
                          : <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max={outOf}
                              value={entry.score}
                              onChange={e => setScores(prev => ({ ...prev, [student.id]: { ...entry, score: e.target.value } }))}
                              className="h-8 text-sm text-center w-full"
                              placeholder={`0–${outOf}`}
                            />
                        }
                      </td>
                      <td className="p-3 text-center">
                        {entry.dnp
                          ? <span className="text-xs text-muted-foreground">N/A</span>
                          : grade
                            ? <span className="text-sm font-bold" style={{ color: grade.color }}>{grade.letter}</span>
                            : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </td>
                      <td className="p-3">
                        {!entry.dnp && (
                          <Input
                            value={entry.comment}
                            onChange={e => setScores(prev => ({ ...prev, [student.id]: { ...entry, comment: e.target.value } }))}
                            className="h-8 text-xs"
                            placeholder="Optional comment..."
                          />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={toggleDnp}
                            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${entry.dnp ? "bg-amber-100 text-amber-700 border-amber-300" : "text-muted-foreground border-border hover:bg-muted"}`}
                          >
                            {entry.dnp ? "DNP ✓" : "DNP"}
                          </button>
                          {!entry.dnp && (existing && !isDirty
                            ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Saved</span>
                            : isDirty
                              ? <span className="text-xs text-amber-600">Unsaved</span>
                              : null
                          )}
                        </div>
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

export const MyResults = () => {
  const { user } = useAuth();

  const { data: allData } = useQuery({
    queryKey: ["my-results", user?.id],
    queryFn: async () => {
      if (!user?.id) return { results: [], studentsMap: new Map(), subjectsMap: new Map(), termsMap: new Map() };

      const { data: resultsData, error: resultsError } = await supabase
        .from("results").select("*").eq("uploaded_by", user.id).order("created_at", { ascending: false });
      if (resultsError) throw resultsError;

      const rows = resultsData || [];
      const studentIds = [...new Set(rows.map((r: any) => r.student_id).filter(Boolean))];
      const subjectIds = [...new Set(rows.map((r: any) => r.subject_id).filter(Boolean))];
      const termIds = [...new Set(rows.map((r: any) => r.term_id).filter(Boolean))];

      const [sRes, subRes, tRes] = await Promise.all([
        studentIds.length > 0 ? supabase.from("students").select("id, full_name, first_name, last_name").in("id", studentIds) : { data: [] },
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] },
        termIds.length > 0 ? supabase.from("terms").select("id, name").in("id", termIds) : { data: [] },
      ]);

      const studentsMap = new Map();
      const subjectsMap = new Map();
      const termsMap = new Map();
      (sRes.data || []).forEach((s: any) => studentsMap.set(s.id, s));
      (subRes.data || []).forEach((s: any) => subjectsMap.set(s.id, s));
      (tRes.data || []).forEach((t: any) => termsMap.set(t.id, t));

      return { results: rows, studentsMap, subjectsMap, termsMap };
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
                    {student?.full_name || `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{subject?.name || "—"}</td>
                  <td className="p-3 text-foreground font-semibold">{r.did_not_participate ? <span className="text-muted-foreground text-xs">DNP</span> : (r.total_score ?? "—")}</td>
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
