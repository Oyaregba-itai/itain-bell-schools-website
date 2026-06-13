import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { BulkCreateStaffUsers } from "@/components/BulkCreateStaffUsers";
import ProfilePage from "@/components/ProfilePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, GraduationCap, BookOpen, BarChart3, ClipboardCheck, Trash2, Check, X, Printer, ChevronRight, ChevronLeft, Copy, Upload, Pencil, TrendingUp, AlertCircle, Send, CheckCircle, Banknote, Receipt, TrendingDown, CreditCard, Calendar, Megaphone, Clock, UserPlus, KeyRound } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";
import MessagingView from "@/components/MessagingView";
import ReportCard from "@/components/ReportCard";
import { MySubjectsView, UploadResults, MyResults } from "@/pages/TeacherDashboard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const AdminDashboard = () => {
  const { user, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // Some admins (e.g. Mrs Duru) also teach subjects — give them a hybrid
  // portal that combines admin tools with their personal teaching tabs.
  const { data: ownSubjects } = useQuery({
    queryKey: ["admin-own-subjects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("subject_assignments").select("id").eq("teacher_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: pendingResultsCount } = useQuery({
    queryKey: ["admin-pending-results-count"],
    queryFn: async () => {
      const [subsRes, reqsRes] = await Promise.all([
        supabase.from("report_submissions").select("id", { count: "exact" }).eq("status", "submitted"),
        supabase.from("score_upload_requests").select("id", { count: "exact" }).eq("status", "pending"),
      ]);
      return (subsRes.count || 0) + (reqsRes.count || 0);
    },
  });

  const teachesSubjects = (ownSubjects?.length ?? 0) > 0;
  const extraTabs = teachesSubjects
    ? [
        { id: "my-subjects", label: "My Subjects", icon: BookOpen },
        { id: "upload", label: "Upload Results", icon: Upload },
        { id: "my-results", label: "My Results", icon: BarChart3 },
      ]
    : [];

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} extraTabs={extraTabs} tabBadges={{ requests: pendingResultsCount || 0 }}>
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "profile" && <ProfilePage />}
      {activeTab === "users" && <ManageUsers />}
      {activeTab === "classes" && <ManageClasses />}
      {activeTab === "students" && <ManageStudents />}
      {activeTab === "subjects" && <ManageSubjects />}
      {activeTab === "terms" && <ManageTerms />}
      {activeTab === "admissions" && <ManageAdmissions />}
      {activeTab === "events" && <ManageEvents />}
      {activeTab === "results" && <ViewAllResults isSuperAdmin={isSuperAdmin} />}
      {activeTab === "requests" && <RequestsPanel />}
      {activeTab === "finances" && <FinancesView />}
      {activeTab === "announcements" && <AnnouncementsView />}
      {activeTab === "timetable" && <TimetableView />}
      {activeTab === "messaging" && <MessagingView />}
      {activeTab === "my-subjects" && teachesSubjects && <MySubjectsView />}
      {activeTab === "upload" && teachesSubjects && <UploadResults />}
      {activeTab === "my-results" && teachesSubjects && <MyResults />}
    </DashboardLayout>
  );
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "#7B2D8B", "A": "#9B4DCA",
  "B+": "#166534", "B": "#16a34a",
  "C+": "#1e40af", "C": "#3b82f6",
  "D": "#c2410c", "E": "#b91c1c",
};

const getHour = () => new Date().getHours();
const greeting = () => getHour() < 12 ? "Good morning" : getHour() < 17 ? "Good afternoon" : "Good evening";
const getTitledName = (fullName?: string | null) => {
  if (!fullName) return "Admin";
  const titleMatch = fullName.match(/^(Mrs?\.?|Miss|Ms\.?|Dr\.?|Coach|Sir)\s+/i);
  const withoutTitle = fullName.replace(/^(Mrs?\.?|Miss|Ms\.?|Dr\.?|Coach|Sir)\s+/i, "").trim();
  const lastName = withoutTitle.split(" ").pop() || withoutTitle;
  return titleMatch ? `${titleMatch[1]} ${lastName}` : withoutTitle.split(" ")[0];
};
const formatDateTime = (d: Date) => ({
  date: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
});

const AdminOverview = () => {
  const { profile, isSuperAdmin } = useAuth();
  const displayName = getTitledName(profile?.full_name);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const { date, time } = formatDateTime(now);

  const { data: activeTerm } = useQuery({
    queryKey: ["active-term"],
    queryFn: async () => {
      const { data } = await supabase.from("terms").select("name, academic_year").eq("is_active", true).maybeSingle();
      return data || null;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [studentsRes, classesRes, subjectsRes, resultsRes, teachersRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact" }),
        supabase.from("classes").select("id", { count: "exact" }),
        supabase.from("subjects").select("id", { count: "exact" }),
        supabase.from("results").select("id", { count: "exact" }),
        supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "teacher"),
      ]);
      return {
        students: studentsRes.count || 0,
        classes: classesRes.count || 0,
        subjects: subjectsRes.count || 0,
        results: resultsRes.count || 0,
        teachers: teachersRes.count || 0,
      };
    },
  });

  const { data: enrollmentData } = useQuery({
    queryKey: ["enrollment-by-class"],
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("class_id");
      const { data: classes } = await supabase.from("classes").select("id, name");
      const counts: Record<string, number> = {};
      (students || []).forEach((s: any) => { if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1; });
      return (classes || [])
        .map((c: any) => ({ name: c.name.replace("YEAR ", "Yr "), count: counts[c.id] || 0 }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count);
    },
  });

  const { data: gradeData } = useQuery({
    queryKey: ["grade-distribution"],
    queryFn: async () => {
      const { data } = await supabase.from("results").select("grade_letter");
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { if (r.grade_letter) counts[r.grade_letter] = (counts[r.grade_letter] || 0) + 1; });
      const order = ["A+", "A", "B+", "B", "C+", "C", "D", "E"];
      return order.filter(g => counts[g]).map(g => ({ grade: g, count: counts[g] }));
    },
  });

  const { data: subjectCoverage } = useQuery({
    queryKey: ["subject-coverage"],
    queryFn: async () => {
      const { data } = await supabase.from("subject_assignments").select("teacher_id");
      const total = data?.length || 0;
      const assigned = data?.filter((s: any) => s.teacher_id).length || 0;
      return [
        { name: "Assigned", value: assigned, fill: "#166534" },
        { name: "Unassigned", value: total - assigned, fill: "#f59e0b" },
      ];
    },
  });

  const { data: recentResults } = useQuery({
    queryKey: ["recent-results-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("results").select("*").order("created_at", { ascending: false }).limit(6);
      const rows = data || [];
      const studentIds = [...new Set(rows.map((r: any) => r.student_id).filter(Boolean))];
      const subjectIds = [...new Set(rows.map((r: any) => r.subject_id).filter(Boolean))];
      const [sRes, subRes] = await Promise.all([
        studentIds.length > 0 ? supabase.from("students").select("id, full_name").in("id", studentIds) : { data: [] },
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] },
      ]);
      const sMap: Record<string, string> = {};
      const subMap: Record<string, string> = {};
      (sRes.data || []).forEach((s: any) => { sMap[s.id] = s.full_name; });
      (subRes.data || []).forEach((s: any) => { subMap[s.id] = s.name; });
      return rows.map((r: any) => ({ ...r, studentName: sMap[r.student_id] || "—", subjectName: subMap[r.subject_id] || "—" }));
    },
  });

  const statCards = [
    { label: "Students", value: stats?.students || 0, icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Classes", value: stats?.classes || 0, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Teachers", value: stats?.teachers || 0, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "Subjects", value: stats?.subjects || 0, icon: ClipboardCheck, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Results Uploaded", value: stats?.results || 0, icon: BarChart3, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  const unassigned = subjectCoverage?.find(s => s.name === "Unassigned")?.value || 0;

  const { data: pendingSubmissions } = useQuery({
    queryKey: ["pending-submissions-count"],
    queryFn: async () => {
      const { count } = await supabase.from("report_submissions").select("id", { count: "exact" }).eq("status", "submitted");
      return count || 0;
    },
  });

  const { data: pendingUploadRequests } = useQuery({
    queryKey: ["pending-upload-requests-count"],
    queryFn: async () => {
      const { count } = await supabase.from("score_upload_requests").select("id", { count: "exact" }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming-events-overview"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("events").select("id, title, event_type, start_date").gte("start_date", today).order("start_date").limit(5);
      return data || [];
    },
  });

  const { data: recentAnnouncements } = useQuery({
    queryKey: ["recent-announcements-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("id, title, target_role, created_at").order("created_at", { ascending: false }).limit(4);
      return data || [];
    },
  });

  const { data: todayTimetable } = useQuery({
    queryKey: ["today-timetable-overview"],
    queryFn: async () => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const today = days[new Date().getDay()];
      const { data } = await supabase.from("timetable_entries").select("id, start_time, end_time, class_id, subject_id, classes(name), subjects(name)").eq("day_of_week", today).order("start_time").limit(10);
      return (data || []).map((t: any) => ({
        ...t,
        className: t.classes?.name || "—",
        subjectName: t.subjects?.name || "—",
      }));
    },
  });

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="hero-gradient rounded-xl p-5 shadow-card flex items-center justify-between gap-4 flex-wrap text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {profile?.profile_picture_url
              ? <img src={profile.profile_picture_url} className="w-full h-full rounded-full object-cover" alt="" />
              : displayName[0]?.toUpperCase()
            }
          </div>
          <div>
            <p className="text-lg font-heading">{greeting()}, {displayName}!</p>
            <p className="text-sm opacity-80">{isSuperAdmin ? "School Administrator" : "Administrator"}</p>
          </div>
        </div>
        <div className="text-right">
          {activeTerm && (
            <p className="text-sm font-semibold opacity-90">{activeTerm.name} · {activeTerm.academic_year}</p>
          )}
          <p className="text-sm opacity-80">{date}</p>
          <p className="text-lg font-heading">{time}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card rounded-xl p-5 shadow-card">
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={card.color} size={20} />
            </div>
            <div className="text-2xl font-heading text-foreground">{card.value}</div>
            <div className="text-sm text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      {unassigned > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span><strong>{unassigned} subject{unassigned !== 1 ? "s" : ""}</strong> still need a teacher assigned. Go to Subjects to fix this.</span>
        </div>
      )}
      {(pendingSubmissions ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          <ClipboardCheck size={16} className="flex-shrink-0" />
          <span><strong>{pendingSubmissions} report card{pendingSubmissions !== 1 ? "s" : ""}</strong> submitted by class teachers and awaiting your approval. Go to <strong>Requests</strong> to review.</span>
        </div>
      )}
      {(pendingUploadRequests ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700">
          <ClipboardCheck size={16} className="flex-shrink-0" />
          <span><strong>{pendingUploadRequests} score upload request{pendingUploadRequests !== 1 ? "s" : ""}</strong> from head teachers awaiting your approval. Go to <strong>Requests</strong> to review.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enrollment by class */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h4 className="font-heading font-semibold text-foreground">Enrollment by Class</h4>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={enrollmentData || []} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v) => [`${v} students`, "Enrollment"]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#166534" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade distribution */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-primary" />
            <h4 className="font-heading font-semibold text-foreground">Grade Distribution</h4>
          </div>
          {gradeData?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={gradeData} margin={{ left: -10 }}>
                <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} results`, "Count"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {gradeData.map((entry) => (
                    <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">No results uploaded yet</div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Subject coverage pie */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-primary" />
            <h4 className="font-heading font-semibold text-foreground">Subject Coverage</h4>
          </div>
          {subjectCoverage?.some(s => s.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={subjectCoverage} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {subjectCoverage?.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </div>

        {/* Recent results */}
        <div className="bg-card rounded-xl p-5 shadow-card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck size={18} className="text-primary" />
            <h4 className="font-heading font-semibold text-foreground">Recent Results</h4>
          </div>
          {recentResults?.length ? (
            <div className="space-y-2">
              {recentResults.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.studentName}</p>
                    <p className="text-xs text-muted-foreground">{r.subjectName} · {r.result_type?.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{r.total_score}/30</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: GRADE_COLORS[r.grade_letter] + "22", color: GRADE_COLORS[r.grade_letter] }}>
                      {r.grade_letter}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">No results uploaded yet</div>
          )}
        </div>
      </div>

      {/* Portal overview: Events · Announcements · Today's Timetable */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-primary" />
            <h4 className="font-heading font-semibold text-foreground">Upcoming Events</h4>
          </div>
          {upcomingEvents?.length ? (
            <div className="space-y-3">
              {upcomingEvents.map((e: any) => {
                const typeColors: Record<string, string> = {
                  holiday: "bg-amber-100 text-amber-700",
                  school_event: "bg-blue-100 text-blue-700",
                  sports_day: "bg-green-100 text-green-700",
                  exam: "bg-purple-100 text-purple-700",
                  parent_meeting: "bg-rose-100 text-rose-700",
                  other: "bg-gray-100 text-gray-600",
                };
                const badge = typeColors[e.event_type] || typeColors.other;
                return (
                  <div key={e.id} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0 text-primary">
                      <span className="text-xs font-bold leading-none">{new Date(e.start_date).toLocaleDateString("en-GB", { day: "numeric" })}</span>
                      <span className="text-[10px] uppercase leading-none opacity-80">{new Date(e.start_date).toLocaleDateString("en-GB", { month: "short" })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge}`}>{e.event_type?.replace("_", " ")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming events</p>
          )}
        </div>

        {/* Latest Announcements */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={18} className="text-primary" />
            <h4 className="font-heading font-semibold text-foreground">Latest Announcements</h4>
          </div>
          {recentAnnouncements?.length ? (
            <div className="space-y-3">
              {recentAnnouncements.map((a: any) => {
                const roleColors: Record<string, string> = {
                  all: "bg-green-100 text-green-700",
                  teacher: "bg-blue-100 text-blue-700",
                  parent: "bg-purple-100 text-purple-700",
                  admin: "bg-rose-100 text-rose-700",
                };
                const badge = roleColors[a.target_role] || roleColors.all;
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Megaphone size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge}`}>{a.target_role}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No announcements yet</p>
          )}
        </div>

        {/* Today's Timetable */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-primary" />
            <h4 className="font-heading font-semibold text-foreground">Today's Timetable</h4>
            <span className="text-xs text-muted-foreground ml-auto">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()]}</span>
          </div>
          {todayTimetable?.length ? (
            <div className="space-y-2">
              {todayTimetable.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <span className="text-xs font-mono text-muted-foreground w-20 flex-shrink-0">{t.start_time?.slice(0,5)} – {t.end_time?.slice(0,5)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.subjectName}</p>
                    <p className="text-xs text-muted-foreground">{t.className}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No classes scheduled today</p>
          )}
        </div>
      </div>
    </div>
  );
};

const generatePassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const TeacherProfile = ({ user, onBack }: { user: any; onBack: () => void }) => {
  const { data: subjects } = useQuery({
    queryKey: ["teacher-subjects-profile", user.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_assignments")
        .select("subject_id, class_id, teacher_id, subjects(id, name), classes(id, name)")
        .eq("teacher_id", user.user_id);
      if (error) throw error;
      return (data || []).map((a: any) => ({
        id: a.subject_id,
        name: a.subjects?.name || "—",
        class_id: a.class_id,
        teacher_id: a.teacher_id,
        className: a.classes?.name || "—",
      }));
    },
    enabled: !!user.user_id,
  });

  const grouped = (subjects || []).reduce((acc: any, s: any) => {
    if (!acc[s.name]) acc[s.name] = [];
    acc[s.name].push(s.className);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ChevronLeft size={18} /> Back to Users
      </button>

      <div className="bg-card rounded-xl p-6 shadow-card flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0">
          {(user.full_name?.[0] || "?").toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-heading text-foreground">{user.full_name}</h2>
            {user.staff_type === "adjunct" && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-medium">Adjunct Teacher</span>
            )}
            <span className="text-xs bg-accent/20 text-accent-foreground px-2.5 py-0.5 rounded-full capitalize font-medium">{user.role}</span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{user.email}</p>
          {user.phone && <p className="text-muted-foreground text-sm">{user.phone}</p>}
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 shadow-card">
        <h4 className="font-heading font-semibold text-foreground mb-4">
          Subjects Teaching ({subjects?.length || 0} assignments)
        </h4>
        {Object.keys(grouped).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(grouped).map(([subjectName, classes]: [string, any]) => (
              <div key={subjectName} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                <BookOpen size={15} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{subjectName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{classes.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>
        )}
      </div>
    </div>
  );
};

const ManageUsers = () => {
  const [viewing, setViewing] = useState<any | null>(null);
  if (viewing) return <TeacherProfile user={viewing} onBack={() => setViewing(null)} />;
  return <UserList onView={setViewing} />;
};

const UserList = ({ onView }: { onView: (user: any) => void }) => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [generatedPassword] = useState(generatePassword);
  const [newUser, setNewUser] = useState({ email: "", full_name: "", role: "teacher", phone: "" });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: users } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes, legacyRes] = await Promise.all([
        supabase.from("profiles").select("id, user_id, full_name, email, phone, staff_type, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("users").select("id, email"),
      ]);
      if (profilesRes.error) throw profilesRes.error;

      // Build email fallback map from legacy users table (keyed by user_id)
      const legacyEmailMap: Record<string, string> = {};
      (legacyRes.data || []).forEach((u: any) => { if (u.id && u.email) legacyEmailMap[u.id] = u.email; });

      const usersWithRoles = (profilesRes.data || []).map((profile: any) => {
        const userRole = rolesRes.data?.find((r: any) => r.user_id === profile.user_id);
        const email = profile.email || legacyEmailMap[profile.user_id] || "";
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email,
          phone: profile.phone || "",
          staff_type: profile.staff_type || "full_time",
          role: userRole?.role || "parent",
          created_at: profile.created_at,
        };
      });

      return usersWithRoles.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["all-classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const resetDialog = () => {
    setStep(1);
    setNewUser({ email: "", full_name: "", role: "teacher", phone: "" });
    setSelectedClasses([]);
    setCopied(false);
  };

  const createUser = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            email: newUser.email,
            password: generatedPassword,
            full_name: newUser.full_name,
            phone: newUser.phone || undefined,
            role: newUser.role,
          }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create user");
      }
      const result = await response.json();
      const newUserId: string = result.user?.id;

      // If teacher, assign to selected classes
      if (newUser.role === "teacher" && selectedClasses.length > 0 && newUserId) {
        await supabase.from("teacher_classes").insert(
          selectedClasses.map((classId) => ({ teacher_id: newUserId, class_id: classId }))
        );
      }
      return result;
    },
    onSuccess: () => {
      toast({ title: "Staff account created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setDialogOpen(false);
      resetDialog();
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      const { error: profileError } = await supabase.from("profiles")
        .update({ full_name: editing.full_name, phone: editing.phone || null })
        .eq("user_id", editing.user_id);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase.from("user_roles")
        .update({ role: editing.role })
        .eq("user_id", editing.user_id);
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      toast({ title: "User updated" });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Failed to delete user");
    },
    onSuccess: () => {
      toast({ title: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const [resetPasswordFor, setResetPasswordFor] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwCopied, setPwCopied] = useState(false);

  const resetPassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: userId, password }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Failed to reset password");
    },
    onSuccess: () => toast({ title: "Password reset successfully" }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openResetPassword = (user: any) => {
    const firstName = user.full_name?.trim().split(/\s+/).find((w: string) => !/^(mrs|mr|miss|ms|dr|coach)\.?$/i.test(w)) || "User";
    const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    setNewPassword(`${capitalized}@IBS25`);
    setPwCopied(false);
    setResetPasswordFor(user);
  };

  const copyNewPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setPwCopied(true);
    setTimeout(() => setPwCopied(false), 2000);
  };

  const toggleClass = (id: string) =>
    setSelectedClasses((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Staff</h3>
        <div className="flex gap-2">
          <BulkCreateStaffUsers />
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetDialog(); }}>
            <DialogTrigger asChild>
              <Button className="hero-gradient"><Plus size={18} className="mr-2" />Add Staff</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {step === 1 ? "Staff Details" : step === 2 ? "Assign to Classes" : "Review & Create"}
                </DialogTitle>
              </DialogHeader>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="e.g. Mrs. Ada Okafor" />
                  </div>
                  <div>
                    <Label>Email Address *</Label>
                    <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="staff@school.com" />
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+234 xxx xxx xxxx" />
                  </div>
                  <div>
                    <Label>Role *</Label>
                    <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="creche_staff">Crèche Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full hero-gradient"
                    disabled={!newUser.full_name || !newUser.email}
                    onClick={() => setStep(newUser.role === "teacher" ? 2 : 3)}
                  >
                    Next <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select the classes this teacher will be assigned to.</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {classes?.map((cls: any) => (
                      <label key={cls.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedClasses.includes(cls.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(cls.id)}
                          onChange={() => toggleClass(cls.id)}
                          className="accent-primary"
                        />
                        <span className="text-sm font-medium text-foreground">{cls.name}</span>
                        {cls.description && <span className="text-xs text-muted-foreground ml-auto">{cls.description}</span>}
                      </label>
                    ))}
                    {!classes?.length && <p className="text-sm text-muted-foreground text-center py-4">No classes created yet.</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ChevronLeft size={16} className="mr-1" />Back</Button>
                    <Button className="flex-1 hero-gradient" onClick={() => setStep(3)}>
                      Next <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{newUser.full_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{newUser.email}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium capitalize">{newUser.role}</span></div>
                    {selectedClasses.length > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">Classes</span>
                        <span className="font-medium text-right">{classes?.filter((c: any) => selectedClasses.includes(c.id)).map((c: any) => c.name).join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Generated Password</Label>
                    <div className="flex gap-2 mt-1">
                      <Input readOnly value={generatedPassword} className="font-mono text-sm bg-muted" />
                      <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                        {copied ? <Check size={16} className="text-secondary" /> : <Copy size={16} />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Copy and share this password with the staff member. They can change it after logging in.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(newUser.role === "teacher" ? 2 : 1)} className="flex-1"><ChevronLeft size={16} className="mr-1" />Back</Button>
                    <Button className="flex-1 hero-gradient" onClick={() => createUser.mutate()} disabled={createUser.isPending}>
                      {createUser.isPending ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div className="text-xs text-muted-foreground bg-muted rounded p-2">{editing.email}</div>
            <div><Label>Full Name</Label><Input value={editing.full_name} onChange={e => setEditing({ ...editing, full_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editing.phone || ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="+234 xxx xxx xxxx" /></div>
            <div>
              <Label>Role</Label>
              <Select value={editing.role} onValueChange={v => setEditing({ ...editing, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="creche_staff">Crèche Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full hero-gradient" onClick={() => updateUser.mutate()} disabled={updateUser.isPending || !editing.full_name}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetPasswordFor} onOpenChange={open => !open && setResetPasswordFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          {resetPasswordFor && <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set a new password for <strong className="text-foreground">{resetPasswordFor.full_name}</strong> ({resetPasswordFor.email}).
              They'll need to use this new password to sign in.
            </p>
            <div>
              <Label>New Password</Label>
              <div className="flex gap-2 mt-1">
                <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <Button type="button" variant="outline" size="icon" onClick={copyNewPassword}>
                  {pwCopied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
            <Button
              className="w-full hero-gradient"
              disabled={resetPassword.isPending || !newPassword}
              onClick={() => resetPassword.mutate(
                { userId: resetPasswordFor.user_id, password: newPassword },
                { onSuccess: () => setResetPasswordFor(null) }
              )}
            >
              {resetPassword.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
              <th className="p-3" />
              <th className="p-3" />
              <th className="p-3" />
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {users?.map((user: any) => (
              <tr key={user.id} className="border-t border-border">
                <td className="p-3 text-foreground">
                  <div className="flex items-center gap-2">
                    {user.full_name}
                    {user.staff_type === "adjunct" && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Adjunct</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{user.email || "—"}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-md text-xs font-semibold bg-accent/20 text-accent-foreground capitalize">
                    {user.role}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  {user.role === "teacher" && (
                    <button onClick={() => onView(user)} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                      Profile <ChevronRight size={13} />
                    </button>
                  )}
                </td>
                <td className="p-3">
                  <button onClick={() => setEditing({ ...user })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
                </td>
                <td className="p-3">
                  <button onClick={() => openResetPassword(user)} title="Reset Password" className="text-muted-foreground hover:text-primary transition-colors"><KeyRound size={14} /></button>
                </td>
                <td className="p-3">
                  {isSuperAdmin && user.user_id !== currentUser?.id && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${user.full_name}? This cannot be undone.`))
                          deleteUser.mutate(user.user_id);
                      }}
                      disabled={deleteUser.isPending}
                      className="text-destructive hover:opacity-70 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ClassDetail = ({ cls, onBack }: { cls: any; onBack: () => void }) => {
  const { data: students } = useQuery({
    queryKey: ["class-students-detail", cls.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").eq("class_id", cls.id).order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["class-subjects-detail", cls.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_assignments")
        .select("id, subject_id, teacher_id, subjects(id, name)")
        .eq("class_id", cls.id)
        .order("subjects(name)");
      if (error) throw error;
      const rows = data || [];
      const teacherIds = [...new Set(rows.map((a: any) => a.teacher_id).filter(Boolean))];
      let teacherMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds as string[]);
        (profiles || []).forEach((p: any) => { teacherMap[p.user_id] = p.full_name; });
      }
      return rows.map((a: any) => ({
        id: a.subject_id,
        name: a.subjects?.name || "—",
        teacher_id: a.teacher_id,
        teacherName: teacherMap[a.teacher_id] || "—",
      }));
    },
  });

  const { data: headTeacherName } = useQuery({
    queryKey: ["class-head-teacher", cls.head_teacher_id],
    queryFn: async () => {
      if (!cls.head_teacher_id) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", cls.head_teacher_id).single();
      return data?.full_name || null;
    },
    enabled: !!cls.head_teacher_id,
  });

  const { data: classTimetable } = useQuery({
    queryKey: ["class-timetable-detail", cls.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_entries")
        .select("*")
        .eq("class_id", cls.id)
        .order("start_time");
      if (error) throw error;
      return data || [];
    },
  });

  const lessonSlots = [
    { start: "08:20", end: "09:20" },
    { start: "09:30", end: "10:30" },
    { start: "10:30", end: "11:30" },
    { start: "12:00", end: "13:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "14:30" },
  ];
  const ttDays = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
  const ttDayShort = ["Mon","Tue","Wed","Thu","Fri"];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ChevronLeft size={18} /> Back to Classes
      </button>

      <div className="bg-card rounded-xl p-5 shadow-card">
        <h2 className="text-xl font-heading text-foreground">{cls.name}</h2>
        {headTeacherName && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
              Head of Class: {headTeacherName}
            </span>
          </div>
        )}
        {cls.description && <p className="text-muted-foreground text-sm mt-2">{cls.description}</p>}
        <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
          <span>{students?.length || 0} students</span>
          <span>·</span>
          <span>{subjects?.length || 0} subjects</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Students */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading font-semibold text-foreground mb-4">Students</h4>
          <div className="space-y-2">
            {students?.map((s: any, i: number) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {s.avatar_url
                    ? <img src={s.avatar_url} className="w-full h-full rounded-full object-cover" />
                    : (s.full_name?.[0] || "?").toUpperCase()
                  }
                </div>
                <span className="text-sm text-foreground">{s.full_name}</span>
              </div>
            ))}
            {!students?.length && <p className="text-sm text-muted-foreground">No students assigned yet.</p>}
          </div>
        </div>

        {/* Subjects & Teachers */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading font-semibold text-foreground mb-4">Subjects & Teachers</h4>
          <div className="space-y-2">
            {subjects?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{s.teacherName}</span>
              </div>
            ))}
            {!subjects?.length && <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>}
          </div>
        </div>
      </div>

      {/* Weekly Timetable */}
      {classTimetable && classTimetable.length > 0 && (() => {
        const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
        return (
          <div className="bg-card rounded-xl p-5 shadow-card">
            <h4 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock size={16} className="text-primary" /> Weekly Timetable
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="p-2.5 text-left font-medium rounded-tl-lg whitespace-nowrap w-24">Time</th>
                    {ttDays.map((day, i) => (
                      <th key={day} className={`p-2.5 text-center font-medium ${i === 4 ? "rounded-tr-lg" : ""}`}>
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{ttDayShort[i]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lessonSlots.map((slot, ri) => (
                    <tr key={slot.start} className={ri % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="p-2 text-xs font-medium text-muted-foreground whitespace-nowrap border-r border-border">
                        {slot.start}<br /><span className="opacity-60">– {slot.end}</span>
                      </td>
                      {ttDays.map(day => {
                        const entry = classTimetable.find(
                          (e: any) => e.day_of_week === day && e.start_time.slice(0, 5) === slot.start
                        );
                        return (
                          <td key={day} className="p-2 text-center border-l border-border/50">
                            {entry ? (
                              <span className="inline-block bg-primary/10 text-primary rounded-md px-2 py-1 text-xs font-medium leading-tight">
                                {subjectMap.get(entry.subject_id) || "—"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const ManageClasses = () => {
  const [viewing, setViewing] = useState<any | null>(null);
  if (viewing) return <ClassDetail cls={viewing} onBack={() => setViewing(null)} />;
  return <ClassList onView={setViewing} />;
};

const ClassList = ({ onView }: { onView: (cls: any) => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newClass, setNewClass] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState<any | null>(null);

  const { data: classes } = useQuery({
    queryKey: ["all-classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("name", { ascending: true });
      if (error) throw error;
      const rows = data || [];
      const headIds = [...new Set(rows.map((c: any) => c.head_teacher_id).filter(Boolean))];
      let headMap: Record<string, string> = {};
      if (headIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", headIds as string[]);
        (profiles || []).forEach((p: any) => { headMap[p.user_id] = p.full_name; });
      }
      return rows.map((c: any) => ({ ...c, headTeacherName: headMap[c.head_teacher_id] || null }));
    },
  });

  const addClass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("classes")
        .insert([{ name: newClass.name, description: newClass.description || null }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Class created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-classes"] });
      queryClient.invalidateQueries({ queryKey: ["all-classes-list"] });
      setNewClass({ name: "", description: "" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateClass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("classes")
        .update({ name: editing.name, description: editing.description || null })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Class updated" });
      queryClient.invalidateQueries({ queryKey: ["all-classes"] });
      queryClient.invalidateQueries({ queryKey: ["all-classes-list"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Classes</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient">
              <Plus size={18} className="mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Class Name</Label>
                <Input
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="e.g. Class 1A"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  placeholder="e.g. Class description"
                />
              </div>
              <Button
                onClick={() => addClass.mutate()}
                className="w-full hero-gradient"
                disabled={addClass.isPending || !newClass.name}
              >
                {addClass.isPending ? "Creating..." : "Create Class"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Class</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div><Label>Class Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
            <Button className="w-full hero-gradient" onClick={() => updateClass.mutate()} disabled={updateClass.isPending || !editing.name}>
              {updateClass.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Head of Class</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {classes?.map((cls: any) => (
              <tr key={cls.id} className="border-t border-border">
                <td className="p-3 text-foreground font-medium">{cls.name}</td>
                <td className="p-3 text-muted-foreground text-sm">{(cls as any).headTeacherName || <span className="text-xs text-muted-foreground/50">—</span>}</td>
                <td className="p-3 text-muted-foreground">{cls.description || "—"}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => onView(cls)} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">View <ChevronRight size={13} /></button>
                    <button onClick={() => setEditing({ ...cls })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageStudents = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  if (selectedStudentId) {
    return <StudentProfile studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />;
  }
  return <StudentList onSelect={setSelectedStudentId} />;
};

const StudentList = ({ onSelect }: { onSelect: (id: string) => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newStudent, setNewStudent] = useState({
    first_name: "", last_name: "", class_id: "", gender: "",
    date_of_birth: "", school_section: "",
  });

  const { data: students } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const students = data || [];

      // Build class name map separately
      const classIds = [...new Set(students.map((s: any) => s.class_id).filter(Boolean))];
      let classMap: Record<string, string> = {};
      if (classIds.length > 0) {
        const { data: classData } = await supabase.from("classes").select("id, name").in("id", classIds);
        (classData || []).forEach((c: any) => { classMap[c.id] = c.name; });
      }
      return students.map((s: any) => ({ ...s, className: classMap[s.class_id] || null }));
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["all-classes-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const addStudent = useMutation({
    mutationFn: async () => {
      const { data: activeTerm } = await supabase.from("terms").select("academic_year").eq("is_active", true).maybeSingle();
      const yearPrefix = activeTerm?.academic_year?.split("/")[0] || new Date().getFullYear().toString();
      const { data: existing } = await supabase
        .from("students")
        .select("admission_number")
        .like("admission_number", `IBS/${yearPrefix}/%`)
        .order("admission_number", { ascending: false })
        .limit(1);
      let nextNum = 1;
      const match = existing?.[0]?.admission_number?.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
      const newId = `IBS/${yearPrefix}/${String(nextNum).padStart(4, "0")}`;

      const { error } = await supabase.from("students").insert([{
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        full_name: `${newStudent.first_name} ${newStudent.last_name}`.trim(),
        class_id: newStudent.class_id || null,
        gender: newStudent.gender || null,
        date_of_birth: newStudent.date_of_birth || null,
        school_section: newStudent.school_section || null,
        admission_number: newId,
        student_id: newId,
      }]);
      if (error) throw error;
      return newId;
    },
    onSuccess: (newId) => {
      toast({ title: "Student added", description: `Admission number: ${newId}` });
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
      setAddOpen(false);
      setNewStudent({ first_name: "", last_name: "", class_id: "", gender: "", date_of_birth: "", school_section: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h3 className="text-lg font-heading text-foreground">Students</h3>
        <div className="flex gap-2 flex-1 max-w-sm">
          <Input placeholder="Search by name or admission no..." value={search} onChange={e => setSearch(e.target.value)} className="text-sm" />
        </div>
        <Button className="hero-gradient" onClick={() => setAddOpen(true)}>
          <Plus size={18} className="mr-2" /> Add Student
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={newStudent.first_name} onChange={e => setNewStudent({ ...newStudent, first_name: e.target.value })} placeholder="First name" />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={newStudent.last_name} onChange={e => setNewStudent({ ...newStudent, last_name: e.target.value })} placeholder="Last name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class</Label>
                <Select value={newStudent.class_id} onValueChange={v => setNewStudent({ ...newStudent, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={newStudent.school_section} onValueChange={v => setNewStudent({ ...newStudent, school_section: v })}>
                  <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creche">Creche</SelectItem>
                    <SelectItem value="nursery">Nursery</SelectItem>
                    <SelectItem value="primary">Primary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender</Label>
                <Select value={newStudent.gender} onValueChange={v => setNewStudent({ ...newStudent, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={newStudent.date_of_birth} onChange={e => setNewStudent({ ...newStudent, date_of_birth: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">An admission number / student ID will be generated automatically.</p>
            <Button className="w-full hero-gradient" onClick={() => addStudent.mutate()} disabled={addStudent.isPending || !newStudent.first_name || !newStudent.last_name}>
              {addStudent.isPending ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Photo</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Class</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Gender</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Admission No.</th>
              <th className="text-left p-3 font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {students?.filter((s: any) => {
              if (!search.trim()) return true;
              const q = search.toLowerCase();
              const name = (s.full_name || `${s.first_name || ""} ${s.last_name || ""}`).toLowerCase();
              return name.includes(q) || (s.admission_number || "").toLowerCase().includes(q);
            }).map((student: any) => {
              const sName = student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Unnamed";
              return (
                <tr key={student.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => onSelect(student.id)}>
                  <td className="p-3">
                    {student.avatar_url
                      ? <img src={student.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{sName[0]}</div>
                    }
                  </td>
                  <td className="p-3 text-foreground font-medium">{sName}</td>
                  <td className="p-3 text-muted-foreground">{(student as any).className || "—"}</td>
                  <td className="p-3 text-muted-foreground capitalize">{student.gender || "—"}</td>
                  <td className="p-3 text-muted-foreground">{student.admission_number || "—"}</td>
                  <td className="p-3">
                    <span className="text-xs text-primary flex items-center gap-1 hover:underline">View <ChevronRight size={14} /></span>
                  </td>
                </tr>
              );
            })}
            {students?.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No students yet.</td></tr>
            )}
            {(students?.length ?? 0) > 0 && search && students?.filter((s: any) => {
              const q = search.toLowerCase();
              const name = (s.full_name || `${s.first_name || ""} ${s.last_name || ""}`).toLowerCase();
              return name.includes(q) || (s.admission_number || "").toLowerCase().includes(q);
            }).length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No students match "{search}".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StudentProfile = ({ studentId, onBack }: { studentId: string; onBack: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addParentOpen, setAddParentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [parentForm, setParentForm] = useState({ full_name: "", email: "", phone: "" });
  const [createdParent, setCreatedParent] = useState<{ email: string; password: string } | null>(null);
  const [addingParent, setAddingParent] = useState(false);

  const { data: allClassesList } = useQuery({
    queryKey: ["all-classes-for-edit"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").order("name");
      return data || [];
    },
  });

  const updateStudent = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("students").update({
        first_name: values.first_name,
        last_name: values.last_name,
        full_name: `${values.first_name} ${values.last_name}`.trim(),
        class_id: values.class_id || null,
        gender: values.gender || null,
        date_of_birth: values.date_of_birth || null,
        school_section: values.school_section || null,
        admission_number: values.admission_number || null,
        student_id: values.student_id || null,
      }).eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Student updated" });
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] });
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student-profile", studentId],
    retry: false,
    queryFn: async () => {
      // Fetch student without FK joins to avoid schema-cache issues
      const { data: student, error: studentError } = await supabase
        .from("students").select("*").eq("id", studentId).single();
      if (studentError) throw studentError;

      // Fetch class name and head teacher separately if class_id exists
      let className: string | null = null;
      let headTeacherName: string | null = null;
      if (student?.class_id) {
        const { data: cls } = await supabase.from("classes").select("name, head_teacher_id").eq("id", student.class_id).single();
        className = cls?.name || null;
        if (cls?.head_teacher_id) {
          const { data: headProfile } = await supabase.from("profiles").select("full_name").eq("user_id", cls.head_teacher_id).single();
          headTeacherName = headProfile?.full_name || null;
        }
      }

      // Parent links
      const { data: parentLinks } = await supabase
        .from("parent_students").select("parent_id").eq("student_id", studentId);
      const parentIds = parentLinks?.map((l: any) => l.parent_id) || [];
      let parents: any[] = [];
      if (parentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles").select("user_id, full_name, phone").in("user_id", parentIds);
        parents = profilesData || [];
      }

      // Results without FK joins
      const { data: rawResults } = await supabase
        .from("results").select("*").eq("student_id", studentId)
        .order("created_at", { ascending: false }).limit(10);

      const results = rawResults || [];
      const subjectIds = [...new Set(results.map((r: any) => r.subject_id).filter(Boolean))];
      const termIds = [...new Set(results.map((r: any) => r.term_id).filter(Boolean))];

      const [subjectsRes, termsRes] = await Promise.all([
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] },
        termIds.length > 0 ? supabase.from("terms").select("id, name").in("id", termIds) : { data: [] },
      ]);
      const subjMap: Record<string, string> = {};
      const termMap: Record<string, string> = {};
      (subjectsRes.data || []).forEach((s: any) => { subjMap[s.id] = s.name; });
      (termsRes.data || []).forEach((t: any) => { termMap[t.id] = t.name; });

      // Subjects assigned to this student's class
      let classSubjects: any[] = [];
      if (student?.class_id) {
        const { data: assignmentsData } = await supabase
          .from("subject_assignments")
          .select("subject_id, teacher_id, subjects(id, name)")
          .eq("class_id", student.class_id);
        const subjectTeacherIds = [...new Set((assignmentsData || []).map((a: any) => a.teacher_id).filter(Boolean))];
        let subjectTeacherMap: Record<string, string> = {};
        if (subjectTeacherIds.length > 0) {
          const { data: teacherProfiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", subjectTeacherIds as string[]);
          (teacherProfiles || []).forEach((p: any) => { subjectTeacherMap[p.user_id] = p.full_name; });
        }
        classSubjects = (assignmentsData || []).map((a: any) => ({
          id: a.subject_id,
          name: a.subjects?.name || "—",
          teacher_id: a.teacher_id,
          teacherName: subjectTeacherMap[a.teacher_id] || "—",
        })).sort((x: any, y: any) => x.name.localeCompare(y.name));
      }

      return {
        student: { ...student, className, headTeacherName },
        parents,
        classSubjects,
        results: results.map((r: any) => ({
          ...r,
          subjectName: subjMap[r.subject_id] || "—",
          termName: termMap[r.term_id] || "—",
        })),
      };
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const path = `student-${studentId}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from("profile-pictures").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("profile-pictures").getPublicUrl(path);
      await supabase.from("students").update({ avatar_url: urlData.publicUrl }).eq("id", studentId);
      queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] });
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
      toast({ title: "Photo updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAddParent = async () => {
    if (!parentForm.full_name || !parentForm.email) {
      toast({ title: "Name and email are required", variant: "destructive" } as any);
      return;
    }
    setAddingParent(true);
    const password = generatePassword();
    try {
      const { data: result, error } = await supabase.functions.invoke("create-user", {
        body: { full_name: parentForm.full_name, email: parentForm.email, phone: parentForm.phone, password, role: "parent" },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      const { error: linkError } = await supabase.from("parent_students").insert({
        parent_id: result.user.id,
        student_id: studentId,
      });
      if (linkError) throw linkError;

      setCreatedParent({ email: parentForm.email, password });
      setParentForm({ full_name: "", email: "", phone: "" });
      queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingParent(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }
  if (isError) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ChevronLeft size={18} /> Back to Students
        </button>
        <div className="bg-destructive/10 text-destructive rounded-xl p-6">
          <p className="font-semibold mb-1">Failed to load student profile</p>
          <p className="text-sm">{(error as any)?.message || "Unknown error"}</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { student, parents, classSubjects, results } = data;
  const sName = (student as any).full_name || `${(student as any).first_name || ""} ${(student as any).last_name || ""}`.trim() || "Student";
  const age = (student as any).date_of_birth
    ? `${new Date().getFullYear() - new Date((student as any).date_of_birth).getFullYear()} years`
    : null;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ChevronLeft size={18} /> Back to Students
      </button>

      {/* Header card */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
              {(student as any).avatar_url
                ? <img src={(student as any).avatar_url} alt={sName} className="w-full h-full object-cover" />
                : <span className="text-primary font-bold text-3xl">{sName[0]}</span>
              }
            </div>
            <label htmlFor="student-photo-upload" className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full cursor-pointer hover:bg-primary/80 transition">
              {isUploadingPhoto
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Upload size={14} />
              }
            </label>
            <input id="student-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-heading text-foreground">{sName}</h2>
                <p className="text-muted-foreground">{(student as any).className || "No class assigned"}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={() => {
                setEditForm({
                  first_name: (student as any).first_name || "",
                  last_name: (student as any).last_name || "",
                  class_id: (student as any).class_id || "",
                  gender: (student as any).gender || "",
                  date_of_birth: (student as any).date_of_birth || "",
                  school_section: (student as any).school_section || "",
                  admission_number: (student as any).admission_number || "",
                  student_id: (student as any).student_id || "",
                });
                setEditOpen(true);
              }}>
                <Pencil size={14} /> Edit
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(student as any).admission_number && <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">{(student as any).admission_number}</span>}
              {(student as any).gender && <span className="bg-muted text-xs px-2.5 py-1 rounded-full capitalize">{(student as any).gender}</span>}
              {age && <span className="bg-muted text-xs px-2.5 py-1 rounded-full">{age}</span>}
              {(student as any).school_section === "creche" && (
                <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-full font-medium">Crèche — No report card</span>
              )}
              {(student as any).school_section === "nursery" && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">Early Years</span>
              )}
              {(student as any).school_section === "primary" && (
                <span className="bg-secondary/10 text-secondary text-xs px-2.5 py-1 rounded-full font-medium">Key Stage</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal info */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading text-foreground font-semibold mb-3">Personal Information</h4>
          <div className="space-y-2 text-sm">
            {[
              ["Full Name", sName],
              ["Gender", (student as any).gender ? (student as any).gender.charAt(0).toUpperCase() + (student as any).gender.slice(1) : "—"],
              ["Date of Birth", (student as any).date_of_birth ? new Date((student as any).date_of_birth).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"],
              ["Age", age || "—"],
              ["Section", (student as any).school_section ? (student as any).school_section.charAt(0).toUpperCase() + (student as any).school_section.slice(1) : "—"],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between border-b border-border pb-2 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Academic info */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading text-foreground font-semibold mb-3">Academic Information</h4>
          <div className="space-y-2 text-sm">
            {[
              ["Admission Number", (student as any).admission_number || "—"],
              ["Student ID", (student as any).student_id || "—"],
              ["Class", (student as any).className || "—"],
              ["Head of Class", (student as any).headTeacherName || "—"],
              ["Results on Record", `${results.length} entries`],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between border-b border-border pb-2 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parents / Guardians */}
      <div className="bg-card rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-heading text-foreground font-semibold">Parents / Guardians</h4>
          <Button size="sm" className="hero-gradient gap-2" onClick={() => { setAddParentOpen(true); setCreatedParent(null); }}>
            <UserPlus size={15} /> Add Parent/Guardian
          </Button>
        </div>
        {parents.length === 0
          ? <p className="text-sm text-muted-foreground">No parents linked yet. Use the button above to add one.</p>
          : <div className="space-y-2">
              {parents.map((p: any) => (
                <div key={p.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {(p.full_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.phone || "No phone on record"}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {(student as any).school_section === "creche" && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 text-sm text-orange-700">
          <strong>Crèche student</strong> — No subjects, no report card. Academic profiling begins in Early Years.
        </div>
      )}

      {/* Subjects & Teachers — hidden for creche */}
      {(student as any).school_section !== "creche" && <div className="bg-card rounded-xl p-5 shadow-card">
        <h4 className="font-heading text-foreground font-semibold mb-4">Subjects & Teachers</h4>
        {classSubjects.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {classSubjects.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <BookOpen size={13} className="text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-2">{s.teacherName}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subjects assigned to this class yet.</p>
        )}
      </div>}

      {/* Recent results — hidden for creche */}
      {(student as any).school_section !== "creche" && results.length > 0 && (
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading text-foreground font-semibold mb-4">Results</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground">Subject</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Score /30</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Term</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2 font-medium">{r.subjectName}</td>
                    <td className="p-2 text-center font-semibold">{r.total_score ?? "—"}</td>
                    <td className="p-2 text-center font-bold text-primary">{r.grade_letter || "—"}</td>
                    <td className="p-2 text-muted-foreground capitalize text-xs">{r.result_type?.replace("_", " ") || "—"}</td>
                    <td className="p-2 text-muted-foreground text-xs">{r.termName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Student Profile</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
                <div><Label>Last Name</Label><Input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Class</Label>
                  <Select value={editForm.class_id} onValueChange={v => setEditForm({ ...editForm, class_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{allClassesList?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={editForm.school_section} onValueChange={v => setEditForm({ ...editForm, school_section: v })}>
                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creche">Creche</SelectItem>
                      <SelectItem value="nursery">Nursery</SelectItem>
                      <SelectItem value="primary">Primary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={editForm.gender} onValueChange={v => setEditForm({ ...editForm, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date of Birth</Label><Input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Admission Number</Label><Input value={editForm.admission_number} onChange={e => setEditForm({ ...editForm, admission_number: e.target.value })} placeholder="IBS/2024/001" /></div>
                <div><Label>Student ID</Label><Input value={editForm.student_id} onChange={e => setEditForm({ ...editForm, student_id: e.target.value })} placeholder="STU001" /></div>
              </div>
              <Button className="w-full hero-gradient" onClick={() => updateStudent.mutate(editForm)} disabled={updateStudent.isPending}>
                {updateStudent.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Parent Dialog */}
      <Dialog open={addParentOpen} onOpenChange={(open) => { setAddParentOpen(open); if (!open) setCreatedParent(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Parent / Guardian for {sName}</DialogTitle></DialogHeader>
          {createdParent ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <p className="font-semibold text-green-800 text-sm">Account created successfully!</p>
                <div className="bg-white border border-green-100 rounded p-3 font-mono text-sm space-y-1">
                  <p>Email: <strong>{createdParent.email}</strong></p>
                  <p>Password: <strong>{createdParent.password}</strong></p>
                </div>
                <p className="text-xs text-green-700">Share these credentials with the parent. They can log in at itainbellschool.com/login and change their password.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(`Email: ${createdParent.email}\nPassword: ${createdParent.password}`); toast({ title: "Copied to clipboard!" }); }}>
                  <Copy size={14} className="mr-2" /> Copy
                </Button>
                <Button className="flex-1 hero-gradient" onClick={() => { setAddParentOpen(false); setCreatedParent(null); }}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={parentForm.full_name} onChange={e => setParentForm({ ...parentForm, full_name: e.target.value })} placeholder="e.g. Mrs. Sarah Johnson" />
              </div>
              <div>
                <Label>Email Address *</Label>
                <Input type="email" value={parentForm.email} onChange={e => setParentForm({ ...parentForm, email: e.target.value })} placeholder="parent@email.com" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={parentForm.phone} onChange={e => setParentForm({ ...parentForm, phone: e.target.value })} placeholder="+234 800 000 0000" />
              </div>
              <p className="text-xs text-muted-foreground">A secure password will be auto-generated and shown to you after creation.</p>
              <Button className="w-full hero-gradient" onClick={handleAddParent} disabled={addingParent || !parentForm.full_name || !parentForm.email}>
                {addingParent ? "Creating account..." : "Create Parent Account"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SUBJECT_NAMES = [
  // Key Stage (Year 1–6)
  "Mathematics", "English Language", "Science", "Humanities", "Yoruba",
  "Creative Art", "CRK", "Computing", "Vocational Education", "French",
  "Global Perspectives", "Verbal Reasoning", "STEAM", "Diction",
  "Quantitative Reasoning", "Life Skills", "Music", "PHE",
  // Early Years
  "Numeracy", "Literacy", "Cultural", "Practical Life", "Sensorial",
  "Physical Body Movement", "Art and Craft",
];

const ManageSubjects = () => {
  const [viewing, setViewing] = useState<string | null>(null);
  if (viewing) return <SubjectDetail subjectName={viewing} onBack={() => setViewing(null)} />;
  return <SubjectList onView={setViewing} />;
};

const SubjectList = ({ onView }: { onView: (name: string) => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSubject, setNewSubject] = useState({ name: "", class_id: "", teacher_id: "" });

  const { data: grouped } = useQuery({
    queryKey: ["all-subjects-grouped"],
    queryFn: async () => {
      const [subjectsRes, assignmentsRes] = await Promise.all([
        supabase.from("subjects").select("id, name").order("name"),
        supabase.from("subject_assignments").select("subject_id, teacher_id"),
      ]);
      const assignmentsBySubject: Record<string, { total: number; assigned: number }> = {};
      (assignmentsRes.data || []).forEach((a: any) => {
        if (!assignmentsBySubject[a.subject_id]) assignmentsBySubject[a.subject_id] = { total: 0, assigned: 0 };
        assignmentsBySubject[a.subject_id].total++;
        if (a.teacher_id) assignmentsBySubject[a.subject_id].assigned++;
      });
      return (subjectsRes.data || []).map((s: any) => ({
        name: s.name,
        id: s.id,
        total: assignmentsBySubject[s.id]?.total || 0,
        assigned: assignmentsBySubject[s.id]?.assigned || 0,
      }));
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-for-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers-for-subjects"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
      const teacherIds = roles?.map((r: any) => r.user_id) || [];
      if (!teacherIds.length) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds).order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      // Upsert the canonical subject (by name), then create the class assignment
      const { data: subjectRow, error: subjectErr } = await supabase
        .from("subjects")
        .upsert({ name: newSubject.name }, { onConflict: "name" })
        .select("id")
        .single();
      if (subjectErr) throw subjectErr;
      if (newSubject.class_id) {
        const { error: assignErr } = await supabase.from("subject_assignments").upsert({
          subject_id: subjectRow.id,
          class_id: newSubject.class_id,
          teacher_id: newSubject.teacher_id || null,
        }, { onConflict: "subject_id,class_id" });
        if (assignErr) throw assignErr;
      }
    },
    onSuccess: () => {
      toast({ title: "Subject assigned" });
      queryClient.invalidateQueries({ queryKey: ["all-subjects-grouped"] });
      setNewSubject({ name: "", class_id: "", teacher_id: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Subjects</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient"><Plus size={18} className="mr-2" />Add Subject to Class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Subject to Class</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Subject Name</Label>
                <Select value={newSubject.name} onValueChange={(v) => setNewSubject({ ...newSubject, name: v })}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{SUBJECT_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class</Label>
                <Select value={newSubject.class_id} onValueChange={(v) => setNewSubject({ ...newSubject, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes?.map((cls: any) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Teacher (optional)</Label>
                <Select value={newSubject.teacher_id} onValueChange={(v) => setNewSubject({ ...newSubject, teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>{teachers?.map((t: any) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={() => addSubject.mutate()} className="w-full hero-gradient" disabled={addSubject.isPending || !newSubject.name || !newSubject.class_id}>
                {addSubject.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {grouped?.map((s) => (
          <button
            key={s.name}
            onClick={() => onView(s.name)}
            className="bg-card rounded-xl p-4 shadow-card border border-border text-left hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground group-hover:text-primary transition-colors">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.total} {s.total === 1 ? "class" : "classes"}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                {s.assigned < s.total && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                    {s.total - s.assigned} unassigned
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const SubjectDetail = ({ subjectName, onBack }: { subjectName: string; onBack: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRow, setEditingRow] = useState<any | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["subject-detail", subjectName],
    queryFn: async () => {
      // Get the canonical subject ID by name
      const { data: subjectRow } = await supabase
        .from("subjects").select("id").eq("name", subjectName).single();
      if (!subjectRow) return [];
      // Get all class assignments for this subject
      const { data: assignments, error } = await supabase
        .from("subject_assignments")
        .select("id, class_id, teacher_id, classes(id, name)")
        .eq("subject_id", subjectRow.id);
      if (error) throw error;
      const teacherIds = [...new Set((assignments || []).map((a: any) => a.teacher_id).filter(Boolean))];
      let teacherMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds as string[]);
        (profiles || []).forEach((p: any) => { teacherMap[p.user_id] = p.full_name; });
      }
      return (assignments || [])
        .map((a: any) => ({
          id: a.id, // assignment id (used for update)
          subject_id: subjectRow.id,
          class_id: a.class_id,
          teacher_id: a.teacher_id,
          className: a.classes?.name || "—",
          teacherName: teacherMap[a.teacher_id] || null,
        }))
        .sort((a: any, b: any) => a.className.localeCompare(b.className));
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers-for-subjects"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
      const teacherIds = roles?.map((r: any) => r.user_id) || [];
      if (!teacherIds.length) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds).order("full_name");
      return data || [];
    },
  });

  const updateTeacher = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subject_assignments")
        .update({ teacher_id: editingRow.teacher_id || null })
        .eq("id", editingRow.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Teacher updated" });
      queryClient.invalidateQueries({ queryKey: ["subject-detail", subjectName] });
      queryClient.invalidateQueries({ queryKey: ["all-subjects-grouped"] });
      setEditingRow(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const assigned = rows?.filter((r: any) => r.teacher_id).length || 0;
  const total = rows?.length || 0;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ChevronLeft size={18} /> Back to Subjects
      </button>

      <div className="bg-card rounded-xl p-5 shadow-card">
        <h2 className="text-xl font-heading text-foreground">{subjectName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {total} {total === 1 ? "class" : "classes"} · {assigned} of {total} teachers assigned
          {assigned < total && <span className="ml-2 text-amber-600 font-medium">({total - assigned} unassigned)</span>}
        </p>
      </div>

      <Dialog open={!!editingRow} onOpenChange={open => !open && setEditingRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Teacher — {editingRow?.className}</DialogTitle></DialogHeader>
          {editingRow && <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Subject: <span className="font-medium text-foreground">{subjectName}</span></p>
            <div>
              <Label>Teacher</Label>
              <Select value={editingRow.teacher_id || NONE} onValueChange={v => setEditingRow({ ...editingRow, teacher_id: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Unassigned —</SelectItem>
                  {teachers?.map((t: any) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full hero-gradient" onClick={() => updateTeacher.mutate()} disabled={updateTeacher.isPending}>
              {updateTeacher.isPending ? "Saving..." : "Save"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Class</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Teacher</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows?.map((row: any) => (
              <tr key={row.id} className="border-t border-border">
                <td className="p-3 font-medium text-foreground">{row.className}</td>
                <td className="p-3">
                  {row.teacherName
                    ? <span className="text-foreground">{row.teacherName}</span>
                    : <span className="text-amber-600 text-xs font-medium bg-amber-50 px-2 py-0.5 rounded-full">Unassigned</span>
                  }
                </td>
                <td className="p-3">
                  <button onClick={() => setEditingRow({ ...row })} className="text-muted-foreground hover:text-primary transition-colors">
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageTerms = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTerm, setNewTerm] = useState({ name: "", academic_year: "2025/2026", is_active: false });
  const [editing, setEditing] = useState<any | null>(null);

  const { data: terms } = useQuery({
    queryKey: ["all-terms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("terms").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addTerm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("terms").insert([{
        name: newTerm.name,
        academic_year: newTerm.academic_year,
        is_active: newTerm.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Term created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-terms"] });
      setNewTerm({ name: "", academic_year: "2025/2026", is_active: false });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateTerm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("terms").update({
        name: editing.name,
        academic_year: editing.academic_year,
        is_active: editing.is_active,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Term updated" });
      queryClient.invalidateQueries({ queryKey: ["all-terms"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Terms</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient"><Plus size={18} className="mr-2" />Add Term</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Term</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Term Name</Label>
                <Select value={newTerm.name} onValueChange={v => setNewTerm({ ...newTerm, name: v })}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Christmas Term">Christmas Term</SelectItem>
                    <SelectItem value="Lent Term">Lent Term</SelectItem>
                    <SelectItem value="Trinity Term">Trinity Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Academic Year</Label>
                <Input value={newTerm.academic_year} onChange={(e) => setNewTerm({ ...newTerm, academic_year: e.target.value })} placeholder="e.g. 2025/2026" />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="active" checked={newTerm.is_active} onChange={(e) => setNewTerm({ ...newTerm, is_active: e.target.checked })} className="rounded" />
                <Label htmlFor="active" className="cursor-pointer">Make this term active</Label>
              </div>
              <Button onClick={() => addTerm.mutate()} className="w-full hero-gradient" disabled={addTerm.isPending || !newTerm.name}>
                {addTerm.isPending ? "Creating..." : "Create Term"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Term</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div>
              <Label>Term Name</Label>
              <Select value={editing.name} onValueChange={v => setEditing({ ...editing, name: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Christmas Term">Christmas Term</SelectItem>
                  <SelectItem value="Lent Term">Lent Term</SelectItem>
                  <SelectItem value="Trinity Term">Trinity Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Academic Year</Label><Input value={editing.academic_year || ""} onChange={e => setEditing({ ...editing, academic_year: e.target.value })} placeholder="e.g. 2025/2026" /></div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="edit-active" checked={!!editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} className="rounded" />
              <Label htmlFor="edit-active" className="cursor-pointer">Active term</Label>
            </div>
            <Button className="w-full hero-gradient" onClick={() => updateTerm.mutate()} disabled={updateTerm.isPending || !editing.name}>
              {updateTerm.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Academic Year</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {terms?.map((term: any) => (
              <tr key={term.id} className="border-t border-border">
                <td className="p-3 text-foreground">{term.name}</td>
                <td className="p-3 text-muted-foreground">{term.academic_year || "—"}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${term.is_active ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                    {term.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3"><button onClick={() => setEditing({ ...term })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageAdmissions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "waitlisted">("pending");
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admission-applications", filter],
    queryFn: async () => {
      let q = supabase.from("admission_applications").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("admission_applications").update({
        status,
        admin_notes: notes || null,
        reviewed_by: userData.user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;

      // Auto-create student record when approved
      if (status === "approved" && selected) {
        const nameParts = (selected.child_full_name || "").trim().split(" ");
        const firstName = nameParts[0] || selected.child_full_name;
        const lastName = nameParts.slice(1).join(" ") || "";
        await supabase.from("students").insert([{
          full_name: selected.child_full_name,
          first_name: firstName,
          last_name: lastName,
          gender: selected.gender || null,
          date_of_birth: selected.date_of_birth || null,
          school_section: selected.school_section || null,
        }]);
      }
    },
    onSuccess: (_, vars) => {
      if (vars.status === "approved") {
        toast({ title: "Application approved — student record created automatically" });
      } else {
        toast({ title: `Application ${vars.status}` });
      }
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
      setSelected(null);
      setNotes("");
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const STATUS_COLORS: Record<string, string> = {
    pending:    "bg-amber-100 text-amber-700",
    approved:   "bg-green-100 text-green-700",
    rejected:   "bg-red-100 text-red-700",
    waitlisted: "bg-blue-100 text-blue-700",
  };

  return (
    <div>
      {selected && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h4 className="font-heading text-foreground">Application Details</h4>
              <button onClick={() => { setSelected(null); setNotes(""); }}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  ["Child Name", selected.child_full_name],
                  ["Gender", selected.gender || "—"],
                  ["Date of Birth", selected.date_of_birth ? new Date(selected.date_of_birth + "T00:00:00").toLocaleDateString() : "—"],
                  ["Section", selected.school_section || "—"],
                  ["Class Applying", selected.class_applying_for || "—"],
                  ["Previous School", selected.previous_school || "—"],
                  ["Parent Name", selected.parent_name],
                  ["Parent Email", selected.parent_email],
                  ["Parent Phone", selected.parent_phone || "—"],
                  ["Applied", new Date(selected.created_at).toLocaleDateString()],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-muted-foreground text-xs">{label}</div>
                    <div className="font-medium text-foreground">{val}</div>
                  </div>
                ))}
              </div>
              {selected.address && (
                <div>
                  <div className="text-muted-foreground text-xs">Address</div>
                  <div className="font-medium text-foreground">{selected.address}</div>
                </div>
              )}
              {selected.additional_info && (
                <div>
                  <div className="text-muted-foreground text-xs">Additional Info</div>
                  <div className="text-foreground bg-muted rounded p-2">{selected.additional_info}</div>
                </div>
              )}
              <div>
                <Label className="text-xs">Admin Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes about this application..." rows={2} className="mt-1" />
              </div>
              {selected.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus.mutate({ id: selected.id, status: "approved" })} disabled={updateStatus.isPending}>
                    <Check size={16} className="mr-1" /> Approve
                  </Button>
                  <Button className="flex-1" variant="outline" onClick={() => updateStatus.mutate({ id: selected.id, status: "waitlisted" })} disabled={updateStatus.isPending}>
                    Waitlist
                  </Button>
                  <Button className="flex-1" variant="destructive" onClick={() => updateStatus.mutate({ id: selected.id, status: "rejected" })} disabled={updateStatus.isPending}>
                    <X size={16} className="mr-1" /> Reject
                  </Button>
                </div>
              )}
              {selected.status !== "pending" && (
                <p className="text-sm text-muted-foreground pt-2">
                  Status: <span className={`font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-lg font-heading text-foreground">Admission Applications</h3>
        <div className="flex gap-2 flex-wrap">
          {(["pending", "approved", "waitlisted", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-card rounded-xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Child</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Section</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Parent</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Applied</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {applications?.map((app: any) => (
                <tr key={app.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium text-foreground">{app.child_full_name}</td>
                  <td className="p-3 text-muted-foreground capitalize">{app.school_section || "—"}</td>
                  <td className="p-3 text-muted-foreground">{app.parent_name}</td>
                  <td className="p-3 text-muted-foreground">{app.parent_email}</td>
                  <td className="p-3 text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[app.status] || "bg-muted text-muted-foreground"}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => { setSelected(app); setNotes(app.admin_notes || ""); }} className="text-xs text-primary hover:underline font-medium">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!applications?.length && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No {filter} applications.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const EVENT_TYPES = ["holiday", "school_event", "sports_day", "exam", "parent_meeting", "other"] as const;

const ManageEvents = () => {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEvent, setNewEvent] = useState({
    title: "", description: "", event_type: "school_event",
    start_date: "", end_date: "", start_time: "", end_time: "", location: "", is_public: true,
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [newFlyerFile, setNewFlyerFile] = useState<File | null>(null);
  const [editFlyerFile, setEditFlyerFile] = useState<File | null>(null);

  const uploadFlyer = async (file: File): Promise<string> => {
    const path = `events/flyer-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("profile-pictures").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("profile-pictures").getPublicUrl(path).data.publicUrl;
  };

  const { data: events } = useQuery({
    queryKey: ["all-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      let flyer_url: string | null = null;
      if (newFlyerFile) flyer_url = await uploadFlyer(newFlyerFile);
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("events").insert([{ ...newEvent, flyer_url, created_by: userData.user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
      setNewEvent({ title: "", description: "", event_type: "school_event", start_date: "", end_date: "", start_time: "", end_time: "", location: "", is_public: true });
      setNewFlyerFile(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateEvent = useMutation({
    mutationFn: async () => {
      let flyer_url = editing.flyer_url || null;
      if (editFlyerFile) flyer_url = await uploadFlyer(editFlyerFile);
      const { error } = await supabase.from("events").update({
        title: editing.title,
        description: editing.description || null,
        event_type: editing.event_type,
        start_date: editing.start_date || null,
        end_date: editing.end_date || null,
        start_time: editing.start_time || null,
        end_time: editing.end_time || null,
        location: editing.location || null,
        is_public: editing.is_public,
        flyer_url,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event updated" });
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
      setEditing(null);
      setEditFlyerFile(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event deleted" });
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const EventFormFields = ({ state, setState, flyerFile, onFlyerChange }: {
    state: any; setState: (v: any) => void;
    flyerFile?: File | null; onFlyerChange?: (f: File | null) => void;
  }) => {
    const previewUrl = flyerFile ? URL.createObjectURL(flyerFile) : null;
    return (
    <div className="space-y-4">
      <div>
        <Label>Event Title</Label>
        <Input value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} placeholder="e.g. Sports Day" />
      </div>
      <div>
        <Label>Event Flyer / Photo (optional)</Label>
        {(previewUrl || state.flyer_url) && (
          <div className="mt-1 mb-2 relative">
            <img src={previewUrl || state.flyer_url} alt="Flyer preview" className="w-full h-40 object-cover rounded-lg border border-border" />
            {previewUrl && <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">New</span>}
          </div>
        )}
        <Input type="file" accept="image/*,application/pdf" className="text-sm" onChange={e => onFlyerChange?.(e.target.files?.[0] || null)} />
        <p className="text-xs text-muted-foreground mt-1">Accepts images (JPG, PNG) or PDF flyers</p>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={state.description} onChange={(e) => setState({ ...state, description: e.target.value })} placeholder="Event details..." rows={2} />
      </div>
      <div>
        <Label>Event Type</Label>
        <Select value={state.event_type} onValueChange={(v) => setState({ ...state, event_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Start Date</Label><Input type="date" value={state.start_date} onChange={(e) => setState({ ...state, start_date: e.target.value })} /></div>
        <div><Label>End Date</Label><Input type="date" value={state.end_date} onChange={(e) => setState({ ...state, end_date: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Start Time (optional)</Label><Input type="time" value={state.start_time} onChange={(e) => setState({ ...state, start_time: e.target.value })} /></div>
        <div><Label>End Time (optional)</Label><Input type="time" value={state.end_time} onChange={(e) => setState({ ...state, end_time: e.target.value })} /></div>
      </div>
      <div><Label>Location</Label><Input value={state.location} onChange={(e) => setState({ ...state, location: e.target.value })} placeholder="e.g. School Grounds" /></div>
      <div className="flex items-center space-x-2">
        <input type="checkbox" id="event-public" checked={!!state.is_public} onChange={e => setState({ ...state, is_public: e.target.checked })} className="rounded" />
        <Label htmlFor="event-public" className="cursor-pointer">Visible to all users</Label>
      </div>
    </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Events</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient"><Plus size={18} className="mr-2" />Add Event</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Event</DialogTitle></DialogHeader>
            <EventFormFields state={newEvent} setState={setNewEvent} flyerFile={newFlyerFile} onFlyerChange={setNewFlyerFile} />
            <Button onClick={() => addEvent.mutate()} className="w-full hero-gradient mt-2" disabled={addEvent.isPending || !newEvent.title}>
              {addEvent.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          {editing && <>
            <EventFormFields state={editing} setState={setEditing} flyerFile={editFlyerFile} onFlyerChange={setEditFlyerFile} />
            <Button className="w-full hero-gradient mt-2" onClick={() => updateEvent.mutate()} disabled={updateEvent.isPending || !editing.title}>
              {updateEvent.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Location</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Public</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {events?.map((event: any) => (
              <tr key={event.id} className="border-t border-border">
                <td className="p-3 text-foreground font-medium">{event.title}</td>
                <td className="p-3 text-muted-foreground capitalize">{event.event_type?.replace("_", " ")}</td>
                <td className="p-3 text-muted-foreground">
                  {event.start_date ? new Date(event.start_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="p-3 text-muted-foreground">{event.location || "—"}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.is_public ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {event.is_public ? "Yes" : "No"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditing({
                      ...event,
                      start_date: event.start_date || "",
                      end_date: event.end_date || "",
                      start_time: event.start_time || "",
                      end_time: event.end_time || "",
                      description: event.description || "",
                      location: event.location || "",
                    })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
                    {isSuperAdmin && <button onClick={() => { if (confirm("Delete this event?")) deleteEvent.mutate(event.id); }} className="text-destructive hover:opacity-70 transition-opacity"><Trash2 size={15} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {!events?.length && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No events yet. Add your first event above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getGradeLetterAdmin = (score: number, outOf: number = 30): string => {
  const pct = outOf > 0 ? (score / outOf) * 100 : 0;
  if (pct >= 95) return "A+";
  if (pct >= 90) return "A";
  if (pct >= 85) return "B+";
  if (pct >= 80) return "B";
  if (pct >= 75) return "C+";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "E";
};

const RequestsPanel = () => {
  const { data: counts } = useQuery({
    queryKey: ["admin-requests-counts"],
    queryFn: async () => {
      const [reqsRes, subsRes] = await Promise.all([
        supabase.from("score_upload_requests").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("report_submissions").select("id", { count: "exact" }).eq("status", "submitted"),
      ]);
      return (reqsRes.count || 0) + (subsRes.count || 0);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-heading text-foreground">Requests</h3>
        <p className="text-sm text-muted-foreground">Score upload access requests and submitted report cards awaiting your approval.</p>
      </div>

      {counts === 0 && (
        <div className="bg-card rounded-xl p-8 shadow-card text-center text-sm text-muted-foreground">
          No pending requests right now.
        </div>
      )}

      <ScoreUploadRequestsPanel />
      <SubmittedReportCards />
    </div>
  );
};

const ScoreUploadRequestsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests } = useQuery({
    queryKey: ["score-upload-requests-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("score_upload_requests").select("*").eq("status", "pending").order("requested_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const headIds = [...new Set(rows.map((r: any) => r.head_teacher_id).filter(Boolean))];
      const subjectIds = [...new Set(rows.map((r: any) => r.subject_id).filter(Boolean))];
      const classIds = [...new Set(rows.map((r: any) => r.class_id).filter(Boolean))];
      const [hRes, sRes, cRes] = await Promise.all([
        headIds.length > 0 ? supabase.from("profiles").select("user_id, full_name").in("user_id", headIds as string[]) : { data: [] },
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds as string[]) : { data: [] },
        classIds.length > 0 ? supabase.from("classes").select("id, name").in("id", classIds as string[]) : { data: [] },
      ]);
      const hMap: Record<string, string> = {};
      const sMap: Record<string, string> = {};
      const cMap: Record<string, string> = {};
      (hRes.data || []).forEach((h: any) => { hMap[h.user_id] = h.full_name; });
      (sRes.data || []).forEach((s: any) => { sMap[s.id] = s.name; });
      (cRes.data || []).forEach((c: any) => { cMap[c.id] = c.name; });
      return rows.map((r: any) => ({ ...r, headName: hMap[r.head_teacher_id] || "—", subjectName: sMap[r.subject_id] || "—", className: cMap[r.class_id] || "—" }));
    },
  });

  const reviewRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "denied" }) => {
      const { data: { user: u } } = await supabase.auth.getUser();
      const { error } = await supabase.from("score_upload_requests").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: u?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast({ title: vars.status === "approved" ? "Request approved" : "Request denied" });
      queryClient.invalidateQueries({ queryKey: ["score-upload-requests-admin"] });
      queryClient.invalidateQueries({ queryKey: ["pending-upload-requests-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-results-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-requests-counts"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!requests?.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={18} className="text-blue-600" />
        <h3 className="text-lg font-heading text-foreground">Score Upload Requests</h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{requests.length} pending</span>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Head Teacher</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Class</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {requests.map((req: any) => (
              <tr key={req.id} className="border-t border-border">
                <td className="p-3 font-medium text-foreground">{req.headName}</td>
                <td className="p-3 text-muted-foreground">{req.className}</td>
                <td className="p-3 text-muted-foreground">{req.subjectName}</td>
                <td className="p-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => reviewRequest.mutate({ id: req.id, status: "approved" })} disabled={reviewRequest.isPending}
                      className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700 transition-colors font-medium">
                      <Check size={11} /> Approve
                    </button>
                    <button onClick={() => reviewRequest.mutate({ id: req.id, status: "denied" })} disabled={reviewRequest.isPending}
                      className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-200 transition-colors font-medium">
                      <X size={11} /> Deny
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SubmittedReportCards = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewSub, setPreviewSub] = useState<any | null>(null);

  const { data: submissions } = useQuery({
    queryKey: ["submitted-report-cards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("report_submissions").select("*").eq("status", "submitted").order("submitted_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const studentIds = [...new Set(rows.map((r: any) => r.student_id).filter(Boolean))];
      const termIds = [...new Set(rows.map((r: any) => r.term_id).filter(Boolean))];
      const headIds = [...new Set(rows.map((r: any) => r.head_teacher_id).filter(Boolean))];
      const [sRes, tRes, hRes] = await Promise.all([
        studentIds.length > 0 ? supabase.from("students").select("id, full_name").in("id", studentIds as string[]) : { data: [] },
        termIds.length > 0 ? supabase.from("terms").select("id, name").in("id", termIds as string[]) : { data: [] },
        headIds.length > 0 ? supabase.from("profiles").select("user_id, full_name").in("user_id", headIds as string[]) : { data: [] },
      ]);
      const sMap: Record<string, string> = {};
      const tMap: Record<string, string> = {};
      const hMap: Record<string, string> = {};
      (sRes.data || []).forEach((s: any) => { sMap[s.id] = s.full_name; });
      (tRes.data || []).forEach((t: any) => { tMap[t.id] = t.name; });
      (hRes.data || []).forEach((h: any) => { hMap[h.user_id] = h.full_name; });
      return rows.map((r: any) => ({ ...r, studentName: sMap[r.student_id] || "—", termName: tMap[r.term_id] || "—", headName: hMap[r.head_teacher_id] || "—" }));
    },
  });

  const approveReport = useMutation({
    mutationFn: async (sub: any) => {
      const { data: { user: u } } = await supabase.auth.getUser();
      const { error } = await supabase.from("report_submissions").update({ status: "approved", approved_at: new Date().toISOString(), approved_by: u?.id }).eq("id", sub.id);
      if (error) throw error;

      // Notify parents via email
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: links } = await supabase.from("parent_students").select("parent_id").eq("student_id", sub.student_id);
          const recipients = (links || []).map((l: any) => l.parent_id);
          if (recipients.length > 0) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({
                type: "results",
                title: `${sub.studentName}'s Report Card is Ready`,
                body: `The ${sub.termName} ${sub.result_type === "mid_term" ? "Mid Term" : "End of Term"} report card for ${sub.studentName} has been approved and is now available in your parent portal.`,
                recipients,
              }),
            });
          }
        }
      } catch { /* silent fail */ }
    },
    onSuccess: () => {
      toast({ title: "Report card approved — parents notified" });
      queryClient.invalidateQueries({ queryKey: ["submitted-report-cards"] });
      queryClient.invalidateQueries({ queryKey: ["pending-submissions-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-results-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-requests-counts"] });
      setPreviewSub(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!submissions?.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Send size={18} className="text-blue-600" />
        <h3 className="text-lg font-heading text-foreground">Submitted Report Cards</h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{submissions.length} awaiting approval</span>
      </div>

      {previewSub && (
        <ReportCard studentId={previewSub.student_id} termId={previewSub.term_id} resultType={previewSub.result_type} onClose={() => setPreviewSub(null)} />
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Submitted by</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Comment</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub: any) => (
              <tr key={sub.id} className="border-t border-border">
                <td className="p-3 font-medium text-foreground">{sub.studentName}</td>
                <td className="p-3 text-muted-foreground">{sub.termName}</td>
                <td className="p-3 text-muted-foreground capitalize text-xs">{sub.result_type?.replace("_", " ")}</td>
                <td className="p-3 text-muted-foreground text-xs">{sub.headName}</td>
                <td className="p-3 text-muted-foreground text-xs max-w-xs truncate">{sub.head_teacher_comment || "—"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => setPreviewSub(sub)} className="text-xs text-primary hover:underline font-medium">Preview</button>
                    <button onClick={() => approveReport.mutate(sub)} disabled={approveReport.isPending}
                      className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700 transition-colors font-medium">
                      <CheckCircle size={11} /> Approve
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LiveReportCardPreview = ({
  studentsWithResults, termsWithResults, allResults, onEditResult, onResultSaved,
}: {
  studentsWithResults: { id: string; name: string }[];
  termsWithResults: { id: string; name: string }[];
  allResults: any[];
  onEditResult: (result: any) => void;
  onResultSaved: () => void;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selStudent, setSelStudent] = useState("");
  const [selTerm, setSelTerm] = useState("");
  const [selType, setSelType] = useState<"mid_term" | "end_of_term">("mid_term");

  const previewReady = !!(selStudent && selTerm);

  // Results for the selected student+term+type (for the edit panel)
  const filteredResults = allResults.filter((r: any) =>
    r.student_id === selStudent && r.term_id === selTerm && r.result_type === selType
  );

  const updateResult = useMutation({
    mutationFn: async (row: any) => {
      const score = parseFloat(row.total_score) || 0;
      const { error } = await supabase.from("results").update({
        total_score: score,
        grade_letter: getGradeLetterAdmin(score),
        teacher_comments: row.teacher_comments || null,
      }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Result updated — report card refreshed" });
      queryClient.invalidateQueries({ queryKey: ["all-results-admin"] });
      queryClient.invalidateQueries({ queryKey: ["report-card", selStudent, selTerm, selType] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const [editRows, setEditRows] = useState<any[]>([]);
  useEffect(() => { setEditRows(filteredResults.map(r => ({ ...r }))); }, [selStudent, selTerm, selType, allResults.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Printer size={18} className="text-primary" />
        <h3 className="text-lg font-heading text-foreground">Report Card Preview</h3>
      </div>

      {/* Selectors */}
      <div className="bg-card rounded-xl p-4 shadow-card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs mb-1 block">Student</Label>
          <Select value={selStudent} onValueChange={setSelStudent}>
            <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
            <SelectContent>
              {studentsWithResults.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label className="text-xs mb-1 block">Term</Label>
          <Select value={selTerm} onValueChange={setSelTerm}>
            <SelectTrigger><SelectValue placeholder="Select term..." /></SelectTrigger>
            <SelectContent>
              {termsWithResults.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["mid_term", "end_of_term"] as const).map(t => (
            <button key={t} onClick={() => setSelType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selType === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "mid_term" ? "Mid Term" : "End of Term"}
            </button>
          ))}
        </div>
        {!previewReady && <p className="text-xs text-muted-foreground w-full">Select a student and term to preview their report card.</p>}
      </div>

      {previewReady && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Report card preview (inline) */}
          <div className="lg:col-span-3 overflow-auto max-h-[700px] border border-border rounded-xl">
            <ReportCard key={`${selStudent}-${selTerm}-${selType}-${allResults.length}`} studentId={selStudent} termId={selTerm} resultType={selType} inline />
          </div>

          {/* Edit panel */}
          <div className="lg:col-span-2 bg-card rounded-xl p-4 shadow-card space-y-3">
            <h4 className="font-heading font-semibold text-foreground text-sm">
              Edit {selType === "mid_term" ? "Mid Term" : "End of Term"} Scores
            </h4>
            <p className="text-xs text-muted-foreground">Changes save instantly and update the preview.</p>
            {editRows.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">No results uploaded for this student / term / type yet.</p>
            )}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {editRows.map((row, i) => (
                <div key={row.id} className="border border-border rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">{row.subjectName}</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number" step="0.5" min="0" max="30"
                      value={row.total_score ?? ""}
                      onChange={e => { const next = [...editRows]; next[i] = { ...next[i], total_score: e.target.value }; setEditRows(next); }}
                      className="h-8 text-sm w-24"
                      placeholder="Score /30"
                    />
                    <span className="text-xs font-bold" style={{ color: row.total_score ? { A: "#7B2D8B", B: "#166534", C: "#1e40af", D: "#c2410c", E: "#b91c1c" }[getGradeLetterAdmin(parseFloat(row.total_score) || 0, selType === "mid_term" ? 30 : 70)[0]] || "#111" : "#999" }}>
                      {row.total_score ? getGradeLetterAdmin(parseFloat(row.total_score) || 0, selType === "mid_term" ? 30 : 70) : "—"}
                    </span>
                    <Button size="sm" className="h-8 text-xs hero-gradient ml-auto" onClick={() => updateResult.mutate(row)} disabled={updateResult.isPending}>
                      Save
                    </Button>
                  </div>
                  <Input
                    value={row.teacher_comments || ""}
                    onChange={e => { const next = [...editRows]; next[i] = { ...next[i], teacher_comments: e.target.value }; setEditRows(next); }}
                    className="h-7 text-xs"
                    placeholder="Teacher comment..."
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ViewAllResults = ({ isSuperAdmin = true }: { isSuperAdmin?: boolean }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reportCard, setReportCard] = useState<{ studentId: string; termId: string; resultType: "mid_term" | "end_of_term" } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: allData } = useQuery({
    queryKey: ["all-results-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("results").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];

      const studentIds = [...new Set(rows.map((r: any) => r.student_id).filter(Boolean))];
      const subjectIds = [...new Set(rows.map((r: any) => r.subject_id).filter(Boolean))];
      const termIds = [...new Set(rows.map((r: any) => r.term_id).filter(Boolean))];

      const [studentRes, subjectRes, termRes] = await Promise.all([
        studentIds.length > 0 ? supabase.from("students").select("id, first_name, last_name").in("id", studentIds) : { data: [] },
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] },
        termIds.length > 0 ? supabase.from("terms").select("id, name").in("id", termIds) : { data: [] },
      ]);

      const studentMap: Record<string, any> = {};
      const subjectMap: Record<string, string> = {};
      const termMap: Record<string, string> = {};
      (studentRes.data || []).forEach((s: any) => { studentMap[s.id] = s; });
      (subjectRes.data || []).forEach((s: any) => { subjectMap[s.id] = s.name; });
      (termRes.data || []).forEach((t: any) => { termMap[t.id] = t.name; });

      return rows.map((r: any) => ({
        ...r,
        studentData: studentMap[r.student_id] || null,
        subjectName: subjectMap[r.subject_id] || "—",
        termName: termMap[r.term_id] || "—",
      }));
    },
  });

  const results = allData || [];

  const updateResult = useMutation({
    mutationFn: async () => {
      const score = parseFloat(editing.total_score) || 0;
      const { error } = await supabase.from("results").update({
        total_score: score,
        grade_letter: getGradeLetterAdmin(score),
        result_type: editing.result_type,
        teacher_comments: editing.teacher_comments || null,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Result updated" });
      queryClient.invalidateQueries({ queryKey: ["all-results-admin"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteResult = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Result deleted" });
      queryClient.invalidateQueries({ queryKey: ["all-results-admin"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const studentTermPairs = Array.from(
    new Map(
      results.map((r: any) => [`${r.student_id}|${r.term_id}`, {
        studentId: r.student_id, termId: r.term_id,
        studentName: r.studentData ? `${r.studentData.first_name} ${r.studentData.last_name}`.trim() : "Student",
        termName: r.termName,
      }])
    ).values()
  );

  const editScore = parseFloat(editing?.total_score) || 0;

  // Unique students and terms with results
  const studentsWithResults = Array.from(new Map(results.map((r: any) => [r.student_id, r.studentData])).entries())
    .filter(([, s]) => s)
    .map(([id, s]) => ({ id, name: `${s.first_name} ${s.last_name}`.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const termsWithResults = Array.from(new Map(results.map((r: any) => [r.term_id, r.termName])).entries())
    .map(([id, name]) => ({ id, name }));

  return (
    <div className="space-y-8">
      {reportCard && (
        <ReportCard studentId={reportCard.studentId} termId={reportCard.termId} resultType={reportCard.resultType} onClose={() => setReportCard(null)} />
      )}

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Result</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted rounded p-3">
              <span className="font-medium text-foreground">{editing.studentData ? `${editing.studentData.first_name} ${editing.studentData.last_name}` : "Student"}</span>
              {" — "}{editing.subjectName}{" — "}{editing.termName}
            </div>
            <div>
              <Label>Result Type</Label>
              <Select value={editing.result_type} onValueChange={v => setEditing({ ...editing, result_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mid_term">Mid Term</SelectItem>
                  <SelectItem value="end_of_term">End of Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Score (out of 30)</Label>
              <Input type="number" step="0.5" min="0" max="30" value={editing.total_score} onChange={e => setEditing({ ...editing, total_score: e.target.value })} />
              {editing.total_score && <p className="text-xs mt-1 font-semibold text-muted-foreground">Grade: {getGradeLetterAdmin(editScore)}</p>}
            </div>
            <div>
              <Label>Teacher Comment</Label>
              <Textarea value={editing.teacher_comments || ""} onChange={e => setEditing({ ...editing, teacher_comments: e.target.value })} rows={2} placeholder="Optional comment..." />
            </div>
            <Button className="w-full hero-gradient" onClick={() => updateResult.mutate()} disabled={updateResult.isPending}>
              {updateResult.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      {/* ── Live Report Card Preview ── */}
      <LiveReportCardPreview
        studentsWithResults={studentsWithResults}
        termsWithResults={termsWithResults}
        allResults={results}
        onEditResult={setEditing}
        onResultSaved={() => queryClient.invalidateQueries({ queryKey: ["all-results-admin"] })}
      />

      {/* ── Detailed results table ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-heading text-foreground">All Results</h3>
          {results.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => {
              const rows = [["Student", "Subject", "Score", "Grade", "Type", "Term"]];
              results.forEach((r: any) => {
                rows.push([
                  r.studentData ? `${r.studentData.first_name} ${r.studentData.last_name}` : "—",
                  r.subjectName, String(r.total_score ?? ""), r.grade_letter || "—",
                  r.result_type?.replace("_", " ") || "—", r.termName,
                ]);
              });
              const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "results.csv"; a.click();
              URL.revokeObjectURL(url);
            }}>
              ⬇ Export CSV
            </Button>
          )}
        </div>
        <div className="bg-card rounded-xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Score /30</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {results.map((result: any) => (
                <tr key={result.id} className="border-t border-border">
                  <td className="p-3 text-foreground">
                    {result.studentData ? `${result.studentData.first_name} ${result.studentData.last_name}` : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{result.subjectName}</td>
                  <td className="p-3 text-foreground font-semibold">{result.total_score ?? "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      result.grade_letter?.startsWith("A") ? "bg-purple-100 text-purple-700"
                      : result.grade_letter?.startsWith("B") ? "bg-green-100 text-green-700"
                      : result.grade_letter?.startsWith("C") ? "bg-blue-100 text-blue-700"
                      : result.grade_letter === "D" ? "bg-orange-100 text-orange-700"
                      : "bg-red-100 text-red-700"
                    }`}>
                      {result.grade_letter || "—"}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs capitalize">{result.result_type?.replace("_", " ") || "—"}</td>
                  <td className="p-3 text-muted-foreground">{result.termName}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setEditing({ ...result })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
                      {isSuperAdmin && <button onClick={() => { if (confirm("Delete this result?")) deleteResult.mutate(result.id); }} className="text-destructive hover:opacity-70 transition-opacity"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!results.length && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No results yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const fmt = (n: number) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NONE = "__none__"; // sentinel for "no selection" in Select components

export const FinancesView = () => {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "fees" | "payments" | "record">("overview");
  const [feeForm, setFeeForm] = useState({ name: "", amount: "", class_id: NONE, term_id: NONE, fee_type: "tuition", description: "" });
  const [payForm, setPayForm] = useState({ student_id: "", fee_structure_id: NONE, amount: "", payment_date: new Date().toISOString().split("T")[0], payment_method: "cash", receipt_number: "", notes: "" });
  const [editingFee, setEditingFee] = useState<any | null>(null);

  const { data: terms } = useQuery({ queryKey: ["terms"], queryFn: async () => { const { data } = await supabase.from("terms").select("*").order("created_at"); return data || []; } });
  const { data: classes } = useQuery({ queryKey: ["all-classes-list"], queryFn: async () => { const { data } = await supabase.from("classes").select("id, name").order("name"); return data || []; } });
  const { data: students } = useQuery({ queryKey: ["all-students-fin"], queryFn: async () => { const { data } = await supabase.from("students").select("id, full_name, class_id").order("full_name"); return data || []; } });

  const { data: feeStructures } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_structures").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const classIds = [...new Set(rows.map((r: any) => r.class_id).filter(Boolean))];
      const termIds = [...new Set(rows.map((r: any) => r.term_id).filter(Boolean))];
      const [cRes, tRes] = await Promise.all([
        classIds.length > 0 ? supabase.from("classes").select("id, name").in("id", classIds as string[]) : { data: [] },
        termIds.length > 0 ? supabase.from("terms").select("id, name").in("id", termIds as string[]) : { data: [] },
      ]);
      const cMap: Record<string, string> = {};
      const tMap: Record<string, string> = {};
      (cRes.data || []).forEach((c: any) => { cMap[c.id] = c.name; });
      (tRes.data || []).forEach((t: any) => { tMap[t.id] = t.name; });
      return rows.map((r: any) => ({ ...r, className: cMap[r.class_id] || "All classes", termName: tMap[r.term_id] || "All terms" }));
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").order("payment_date", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = data || [];
      const studentIds = [...new Set(rows.map((r: any) => r.student_id).filter(Boolean))];
      const feeIds = [...new Set(rows.map((r: any) => r.fee_structure_id).filter(Boolean))];
      const [sRes, fRes] = await Promise.all([
        studentIds.length > 0 ? supabase.from("students").select("id, full_name").in("id", studentIds as string[]) : { data: [] },
        feeIds.length > 0 ? supabase.from("fee_structures").select("id, name").in("id", feeIds as string[]) : { data: [] },
      ]);
      const sMap: Record<string, string> = {};
      const fMap: Record<string, string> = {};
      (sRes.data || []).forEach((s: any) => { sMap[s.id] = s.full_name; });
      (fRes.data || []).forEach((f: any) => { fMap[f.id] = f.name; });
      return rows.map((r: any) => ({ ...r, studentName: sMap[r.student_id] || "—", feeName: fMap[r.fee_structure_id] || "—" }));
    },
  });

  const totalCollected = (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);

  const addFee = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(feeForm.amount);
      if (isNaN(amt) || amt <= 0) throw new Error("Please enter a valid amount");
      const { error } = await supabase.from("fee_structures").insert([{
        name: feeForm.name.trim(),
        amount: amt,
        class_id: feeForm.class_id === NONE ? null : feeForm.class_id,
        term_id: feeForm.term_id === NONE ? null : feeForm.term_id,
        fee_type: feeForm.fee_type,
        description: feeForm.description.trim() || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Fee structure added" }); queryClient.invalidateQueries({ queryKey: ["fee-structures"] }); setFeeForm({ name: "", amount: "", class_id: NONE, term_id: NONE, fee_type: "tuition", description: "" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateFee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fee_structures").update({ name: editingFee.name, amount: parseFloat(editingFee.amount), fee_type: editingFee.fee_type, description: editingFee.description || null }).eq("id", editingFee.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Fee updated" }); queryClient.invalidateQueries({ queryKey: ["fee-structures"] }); setEditingFee(null); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteFee = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("fee_structures").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast({ title: "Fee structure deleted" }); queryClient.invalidateQueries({ queryKey: ["fee-structures"] }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(payForm.amount);
      if (isNaN(amt) || amt <= 0) throw new Error("Please enter a valid amount");
      if (!payForm.student_id) throw new Error("Please select a student");
      const { error } = await supabase.from("payments").insert([{
        student_id: payForm.student_id,
        fee_structure_id: payForm.fee_structure_id === NONE ? null : payForm.fee_structure_id,
        amount: amt,
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        receipt_number: payForm.receipt_number.trim() || null,
        notes: payForm.notes.trim() || null,
        recorded_by: user?.id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Payment recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setPayForm({ student_id: "", fee_structure_id: NONE, amount: "", payment_date: new Date().toISOString().split("T")[0], payment_method: "cash", receipt_number: "", notes: "" });
      setTab("payments");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("payments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast({ title: "Payment deleted" }); queryClient.invalidateQueries({ queryKey: ["all-payments"] }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const FEE_TYPES = ["tuition", "uniform", "books", "transport", "exam", "other"];
  const PAY_METHODS = ["cash", "bank_transfer", "pos", "cheque", "online"];

  const selectedFee = feeStructures?.find((f: any) => f.id === payForm.fee_structure_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Banknote size={22} className="text-primary" />
        <h3 className="text-xl font-heading text-foreground">Finances</h3>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit flex-wrap">
        {([["overview", "Overview"], ["fees", "Fee Structures"], ["payments", "Payment History"], ["record", "Record Payment"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-5 shadow-card">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3"><TrendingUp size={20} className="text-green-600" /></div>
              <p className="text-2xl font-heading text-foreground">{fmt(totalCollected)}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Collected</p>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3"><Receipt size={20} className="text-blue-600" /></div>
              <p className="text-2xl font-heading text-foreground">{payments?.length || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Payments</p>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3"><CreditCard size={20} className="text-purple-600" /></div>
              <p className="text-2xl font-heading text-foreground">{feeStructures?.length || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">Fee Structures</p>
            </div>
          </div>

          {/* Recent payments */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h4 className="font-heading font-semibold text-foreground">Recent Payments</h4>
              <button onClick={() => setTab("payments")} className="text-xs text-primary hover:underline">View all</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Method</th>
              </tr></thead>
              <tbody>
                {payments?.slice(0, 8).map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium text-foreground">{p.studentName}</td>
                    <td className="p-3 text-green-600 font-semibold">{fmt(p.amount)}</td>
                    <td className="p-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-GB")}</td>
                    <td className="p-3 text-muted-foreground capitalize">{p.payment_method?.replace("_", " ")}</td>
                  </tr>
                ))}
                {!payments?.length && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No payments recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Fee Structures ── */}
      {tab === "fees" && (
        <div className="space-y-6">
          <Dialog open={!!editingFee} onOpenChange={open => !open && setEditingFee(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Fee Structure</DialogTitle></DialogHeader>
              {editingFee && <div className="space-y-3">
                <div><Label>Name</Label><Input value={editingFee.name} onChange={e => setEditingFee({ ...editingFee, name: e.target.value })} /></div>
                <div><Label>Amount (₦)</Label><Input type="number" value={editingFee.amount} onChange={e => setEditingFee({ ...editingFee, amount: e.target.value })} /></div>
                <div><Label>Fee Type</Label>
                  <Select value={editingFee.fee_type} onValueChange={v => setEditingFee({ ...editingFee, fee_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FEE_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={editingFee.description || ""} onChange={e => setEditingFee({ ...editingFee, description: e.target.value })} rows={2} /></div>
                <Button className="w-full hero-gradient" onClick={() => updateFee.mutate()} disabled={updateFee.isPending}>{updateFee.isPending ? "Saving..." : "Save Changes"}</Button>
              </div>}
            </DialogContent>
          </Dialog>

          {/* Add fee form */}
          <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
            <h4 className="font-heading font-semibold text-foreground">Add Fee Structure</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={feeForm.name} onChange={e => setFeeForm({ ...feeForm, name: e.target.value })} placeholder="e.g. Lent Term 2026 Tuition" /></div>
              <div><Label>Amount (₦) *</Label><Input type="number" value={feeForm.amount} onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })} placeholder="50000" /></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>Class (optional)</Label>
                <Select value={feeForm.class_id} onValueChange={v => setFeeForm({ ...feeForm, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent><SelectItem value={NONE}>All classes</SelectItem>{classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Term (optional)</Label>
                <Select value={feeForm.term_id} onValueChange={v => setFeeForm({ ...feeForm, term_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All terms" /></SelectTrigger>
                  <SelectContent><SelectItem value={NONE}>All terms</SelectItem>{terms?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Fee Type</Label>
                <Select value={feeForm.fee_type} onValueChange={v => setFeeForm({ ...feeForm, fee_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FEE_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button className="hero-gradient gap-2" onClick={() => addFee.mutate()} disabled={addFee.isPending || !feeForm.name || !feeForm.amount}>
              <Plus size={16} /> {addFee.isPending ? "Adding..." : "Add Fee Structure"}
            </Button>
          </div>

          <div className="bg-card rounded-xl shadow-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Class</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
                <th className="p-3" />
              </tr></thead>
              <tbody>
                {feeStructures?.map((f: any) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="p-3 font-medium text-foreground">{f.name}</td>
                    <td className="p-3 text-green-700 font-semibold">{fmt(f.amount)}</td>
                    <td className="p-3 text-muted-foreground capitalize">{f.fee_type}</td>
                    <td className="p-3 text-muted-foreground text-xs">{f.className}</td>
                    <td className="p-3 text-muted-foreground text-xs">{f.termName}</td>
                    <td className="p-3"><div className="flex gap-3">
                      <button onClick={() => setEditingFee({ ...f })} className="text-muted-foreground hover:text-primary"><Pencil size={14} /></button>
                      {isSuperAdmin && <button onClick={() => { if (confirm("Delete this fee structure?")) deleteFee.mutate(f.id); }} className="text-destructive hover:opacity-70"><Trash2 size={14} /></button>}
                    </div></td>
                  </tr>
                ))}
                {!feeStructures?.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No fee structures yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payment History ── */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{payments?.length || 0} payments — total {fmt(totalCollected)}</p>
            <Button size="sm" className="hero-gradient gap-2" onClick={() => setTab("record")}><Plus size={14} /> Record Payment</Button>
          </div>
          <div className="bg-card rounded-xl shadow-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Fee</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Method</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Receipt #</th>
                <th className="p-3" />
              </tr></thead>
              <tbody>
                {payments?.map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium text-foreground">{p.studentName}</td>
                    <td className="p-3 text-muted-foreground text-xs">{p.feeName}</td>
                    <td className="p-3 text-green-700 font-bold">{fmt(p.amount)}</td>
                    <td className="p-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-GB")}</td>
                    <td className="p-3 text-muted-foreground capitalize">{p.payment_method?.replace("_", " ")}</td>
                    <td className="p-3 text-muted-foreground text-xs">{p.receipt_number || "—"}</td>
                    <td className="p-3">{isSuperAdmin && <button onClick={() => { if (confirm("Delete this payment record?")) deletePayment.mutate(p.id); }} className="text-destructive hover:opacity-70"><Trash2 size={14} /></button>}</td>
                  </tr>
                ))}
                {!payments?.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No payments recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Record Payment ── */}
      {tab === "record" && (
        <div className="max-w-2xl">
          <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
            <h4 className="font-heading font-semibold text-foreground">Record a Payment</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Student *</Label>
                <Select value={payForm.student_id} onValueChange={v => setPayForm({ ...payForm, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>{students?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Fee Structure (optional)</Label>
                <Select value={payForm.fee_structure_id} onValueChange={v => {
                  const matched = feeStructures?.find((f: any) => f.id === v);
                  setPayForm({ ...payForm, fee_structure_id: v, amount: matched ? String(matched.amount) : payForm.amount });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select fee or leave blank" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Custom / no fee selected —</SelectItem>
                    {feeStructures?.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name} · {fmt(f.amount)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Amount (₦) *</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder="50000" /></div>
              <div><Label>Payment Date *</Label><Input type="date" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Payment Method</Label>
                <Select value={payForm.payment_method} onValueChange={v => setPayForm({ ...payForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Receipt Number</Label><Input value={payForm.receipt_number} onChange={e => setPayForm({ ...payForm, receipt_number: e.target.value })} placeholder="e.g. RCP-001" /></div>
            </div>
            <div><Label>Notes (optional)</Label><Textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Any additional notes..." rows={2} /></div>
            <Button className="w-full hero-gradient gap-2 h-11" onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending || !payForm.student_id || !payForm.amount}>
              <Receipt size={16} /> {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
