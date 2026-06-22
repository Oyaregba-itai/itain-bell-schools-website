import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { GraduationCap, Printer } from "lucide-react";

const getHour = () => new Date().getHours();
const greeting = () => getHour() < 12 ? "Good morning" : getHour() < 17 ? "Good afternoon" : "Good evening";
const extractFirstName = (fullName?: string | null) =>
  fullName ? fullName.replace(/^(Mrs?\.?|Miss|Ms\.?|Dr\.?|Coach)\s+/i, "").split(" ")[0] : "there";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";
import EventsView from "@/components/EventsView";
import MessagingView from "@/components/MessagingView";
import ProfilePage from "@/components/ProfilePage";
import ReportCard from "@/components/ReportCard";

const ParentDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview" && <ParentOverview />}
      {activeTab === "profile" && <ProfilePage />}
      {activeTab === "results" && <ChildrenResults />}
      {activeTab === "timetable" && <TimetableView />}
      {activeTab === "events" && <EventsView />}
      {activeTab === "announcements" && <AnnouncementsView />}
      {activeTab === "messaging" && <MessagingView />}
    </DashboardLayout>
  );
};

const ParentOverview = () => {
  const { user, profile } = useAuth();
  const firstName = extractFirstName(profile?.full_name);

  const { data: allData } = useQuery({
    queryKey: ["my-children", user?.id],
    queryFn: async () => {
      if (!user?.id) return { children: [], classesMap: new Map() };

      // Get students linked to this parent
      const { data: childrenData, error: childrenError } = await supabase
        .from("parent_students")
        .select("student_id, students:student_id(id, first_name, last_name, student_id, class_id)")
        .eq("parent_id", user.id);

      if (childrenError) throw childrenError;

      // Get all classes
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*");

      if (classesError) throw classesError;

      const classesMap = new Map();
      classesData?.forEach((cls) => classesMap.set(cls.id, cls));

      return {
        children: childrenData?.map((rel) => rel.students) || [],
        classesMap,
      };
    },
    enabled: !!user,
  });

  const children = allData?.children || [];
  const classesMap = allData?.classesMap || new Map();

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="hero-gradient rounded-xl p-5 shadow-card flex items-center gap-4 text-primary-foreground">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {profile?.profile_picture_url
            ? <img src={profile.profile_picture_url} className="w-full h-full rounded-full object-cover" alt="" />
            : firstName[0]?.toUpperCase()
          }
        </div>
        <div>
          <p className="text-lg font-heading">{greeting()}, {firstName}!</p>
          <p className="text-sm opacity-80">Parent / Guardian</p>
        </div>
      </div>

      <h3 className="text-lg font-heading text-foreground">My Children</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {children?.map((child: any) => {
          const className = classesMap.get(child?.class_id)?.name;
          return (
            <div key={child?.id} className="bg-card rounded-xl p-5 shadow-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full green-gradient flex items-center justify-center">
                <GraduationCap className="text-primary-foreground" size={22} />
              </div>
              <div>
                <div className="font-medium text-foreground">
                  {child?.first_name} {child?.last_name}
                </div>
                <div className="text-sm text-muted-foreground">{className || "No class assigned"}</div>
              </div>
            </div>
          );
        })}
        {(!children || children.length === 0) && (
          <p className="text-muted-foreground text-sm">
            No children linked to your account yet. Contact the administrator.
          </p>
        )}
      </div>
    </div>
  );
};

const ChildrenResults = () => {
  const { user } = useAuth();
  const [reportCard, setReportCard] = useState<{ studentId: string; termId: string; resultType: "mid_term" | "end_of_term" } | null>(null);

  const { data: children } = useQuery({
    queryKey: ["my-children", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("parent_students")
        .select("student_id, students:student_id(id)")
        .eq("parent_id", user.id);

      if (error) throw error;
      return data?.map((rel) => rel.students) || [];
    },
    enabled: !!user,
  });

  const childIds = children?.map((c: any) => c?.id).filter(Boolean) || [];

  const { data: allData } = useQuery({
    queryKey: ["children-results", childIds],
    queryFn: async () => {
      if (!childIds.length)
        return { results: [], studentsMap: new Map(), subjectsMap: new Map(), termsMap: new Map() };

      // Only show results from approved report submissions
      const { data: approvedSubs } = await supabase
        .from("report_submissions").select("student_id, term_id, result_type")
        .eq("status", "approved").in("student_id", childIds);
      const approvedKeys = new Set((approvedSubs || []).map((s: any) => `${s.student_id}|${s.term_id}|${s.result_type}`));

      const { data: rawResults, error: resultsError } = await supabase
        .from("results").select("*").in("student_id", childIds);
      if (resultsError) throw resultsError;

      // Filter to only approved results
      const resultsData = (rawResults || []).filter((r: any) =>
        approvedKeys.has(`${r.student_id}|${r.term_id}|${r.result_type}`)
      );

      const subjectIds = [...new Set(resultsData.map((r: any) => r.subject_id).filter(Boolean))];
      const termIds = [...new Set(resultsData.map((r: any) => r.term_id).filter(Boolean))];

      const [subjectsRes, termsRes, studentsRes] = await Promise.all([
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] },
        termIds.length > 0 ? supabase.from("terms").select("id, name").in("id", termIds) : { data: [] },
        supabase.from("students").select("id, full_name, first_name, last_name").in("id", childIds),
      ]);

      const studentsMap = new Map();
      const subjectsMap = new Map();
      const termsMap = new Map();

      (studentsRes.data || []).forEach((s: any) => studentsMap.set(s.id, s));
      (subjectsRes.data || []).forEach((s: any) => subjectsMap.set(s.id, s));
      (termsRes.data || []).forEach((t: any) => termsMap.set(t.id, t));

      return { results: resultsData, studentsMap, subjectsMap, termsMap };
    },
    enabled: childIds.length > 0,
  });

  const results = allData?.results || [];
  const studentsMap = allData?.studentsMap || new Map();
  const subjectsMap = allData?.subjectsMap || new Map();
  const termsMap = allData?.termsMap || new Map();

  // Unique student+term pairs for report card buttons
  const studentTermPairs = Array.from(
    new Map(results.map((r: any) => [`${r.student_id}|${r.term_id}`, { studentId: r.student_id, termId: r.term_id }])).values()
  );

  return (
    <div>
      {reportCard && (
        <ReportCard
          studentId={reportCard.studentId}
          termId={reportCard.termId}
          resultType={reportCard.resultType}
          onClose={() => setReportCard(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-heading text-foreground">My Children&apos;s Results</h3>
        {studentTermPairs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {studentTermPairs.map((pair: any) => {
              const student = studentsMap.get(pair.studentId);
              const term = termsMap.get(pair.termId);
              return (
                <span key={`${pair.studentId}|${pair.termId}`} className="flex gap-1">
                  <button
                    onClick={() => setReportCard({ ...pair, resultType: "mid_term" })}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    <Printer size={12} /> {student?.first_name} — {term?.name} (Mid Term)
                  </button>
                  <button
                    onClick={() => setReportCard({ ...pair, resultType: "end_of_term" })}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors font-medium"
                  >
                    <Printer size={12} /> End of Term
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Child</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Total Score</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Comment</th>
            </tr>
          </thead>
          <tbody>
            {results?.map((r: any) => {
              const subject = subjectsMap.get(r.subject_id);
              const term = termsMap.get(r.term_id);
              const student = studentsMap.get(r.student_id);
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 text-foreground">
                    {student?.full_name || `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "—"}
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
                  <td className="p-3 text-muted-foreground">{r.teacher_comments || "—"}</td>
                </tr>
              );
            })}
            {(!results || results.length === 0) && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No approved results yet. Results are published by the school after the head of class reviews and the admin approves them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParentDashboard;
