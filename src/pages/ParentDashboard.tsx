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

      // Get student IDs linked to this parent
      const { data: links, error: linksError } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", user.id);

      if (linksError) throw linksError;

      const studentIds = (links || []).map((l: any) => l.student_id).filter(Boolean);

      const [studentsRes, classesRes] = await Promise.all([
        studentIds.length > 0
          ? supabase.from("students").select("id, first_name, last_name, student_id, class_id").in("id", studentIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        supabase.from("classes").select("*"),
      ]);

      if (classesRes.error) throw classesRes.error;

      const classesMap = new Map();
      (classesRes.data || []).forEach((cls: any) => classesMap.set(cls.id, cls));

      return {
        children: studentsRes.data || [],
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
    queryKey: ["my-children-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: links, error } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", user.id);

      if (error) throw error;
      const ids = (links || []).map((l: any) => l.student_id).filter(Boolean);
      if (!ids.length) return [];
      const { data: students } = await supabase.from("students").select("id").in("id", ids);
      return students || [];
    },
    enabled: !!user,
  });

  const childIds = children?.map((c: any) => c?.id).filter(Boolean) || [];

  const { data: allData } = useQuery({
    queryKey: ["children-report-cards", childIds],
    queryFn: async () => {
      if (!childIds.length) return { submissions: [], studentsMap: new Map(), termsMap: new Map() };

      const { data: subs } = await supabase
        .from("report_submissions")
        .select("student_id, term_id, result_type")
        .eq("status", "approved")
        .in("student_id", childIds);

      const termIds = [...new Set((subs || []).map((s: any) => s.term_id))];

      const [studentsRes, termsRes] = await Promise.all([
        supabase.from("students").select("id, first_name, last_name, full_name").in("id", childIds),
        termIds.length > 0 ? supabase.from("terms").select("id, name").in("id", termIds) : { data: [] },
      ]);

      const studentsMap = new Map();
      const termsMap = new Map();
      (studentsRes.data || []).forEach((s: any) => studentsMap.set(s.id, s));
      (termsRes.data || []).forEach((t: any) => termsMap.set(t.id, t));

      return { submissions: subs || [], studentsMap, termsMap };
    },
    enabled: childIds.length > 0,
  });

  const submissions = allData?.submissions || [];
  const studentsMap = allData?.studentsMap || new Map();
  const termsMap = allData?.termsMap || new Map();

  // Group by student then by term
  const byStudent = childIds.map((id: string) => {
    const student = studentsMap.get(id);
    const studentSubs = submissions.filter((s: any) => s.student_id === id);
    const byTerm = Array.from(new Map(studentSubs.map((s: any) => [s.term_id, s])).values());
    return { student, byTerm };
  }).filter((g: any) => g.student);

  return (
    <div className="space-y-6">
      {reportCard && (
        <ReportCard
          studentId={reportCard.studentId}
          termId={reportCard.termId}
          resultType={reportCard.resultType}
          onClose={() => setReportCard(null)}
        />
      )}

      <h3 className="text-lg font-heading text-foreground">My Children&apos;s Results</h3>

      {byStudent.length === 0 && (
        <p className="text-muted-foreground text-sm">No approved report cards yet. They will appear here once the school publishes them.</p>
      )}

      {byStudent.map(({ student, byTerm }: any) => (
        <div key={student.id} className="bg-card rounded-xl shadow-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full green-gradient flex items-center justify-center flex-shrink-0">
              <GraduationCap className="text-primary-foreground" size={18} />
            </div>
            <h4 className="font-heading font-semibold text-foreground">
              {student.full_name || `${student.first_name} ${student.last_name}`}
            </h4>
          </div>

          {byTerm.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved report cards yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {byTerm.map((sub: any) => {
                const term = termsMap.get(sub.term_id);
                return (
                  <div key={`${sub.term_id}`} className="border border-border rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">{term?.name || "—"}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReportCard({ studentId: student.id, termId: sub.term_id, resultType: "mid_term" })}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                      >
                        <Printer size={12} /> Mid Term
                      </button>
                      <button
                        onClick={() => setReportCard({ studentId: student.id, termId: sub.term_id, resultType: "end_of_term" })}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors font-medium"
                      >
                        <Printer size={12} /> End of Term
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ParentDashboard;
