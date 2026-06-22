import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { GraduationCap, Printer, Download, ChevronLeft, User, BookOpen, Hash } from "lucide-react";

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

const ChildProfile = ({ child, className, onBack }: { child: any; className: string; onBack: () => void }) => {
  const dob = child.date_of_birth ? new Date(child.date_of_birth) : null;
  const age = dob ? `${new Date().getFullYear() - dob.getFullYear()} yrs` : null;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ChevronLeft size={18} /> Back
      </button>
      <div className="bg-card rounded-xl p-6 shadow-card flex items-center gap-5">
        <div className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden">
          {child.avatar_url
            ? <img src={child.avatar_url} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full green-gradient flex items-center justify-center">
                <GraduationCap className="text-primary-foreground" size={32} />
              </div>
          }
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">{child.full_name || `${child.first_name} ${child.last_name}`}</h2>
          <p className="text-sm text-muted-foreground mt-1">{className || "No class assigned"}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Student Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {child.student_id && (
            <div className="flex items-start gap-2">
              <Hash size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Student ID</p>
                <p className="font-medium text-foreground">{child.student_id}</p>
              </div>
            </div>
          )}
          {child.admission_number && (
            <div className="flex items-start gap-2">
              <Hash size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Admission No.</p>
                <p className="font-medium text-foreground">{child.admission_number}</p>
              </div>
            </div>
          )}
          {child.gender && (
            <div className="flex items-start gap-2">
              <User size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Gender</p>
                <p className="font-medium text-foreground capitalize">{child.gender}</p>
              </div>
            </div>
          )}
          {age && (
            <div className="flex items-start gap-2">
              <User size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Age</p>
                <p className="font-medium text-foreground">{age}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <BookOpen size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Class</p>
              <p className="font-medium text-foreground">{className || "—"}</p>
            </div>
          </div>
          {child.school_section && (
            <div className="flex items-start gap-2">
              <BookOpen size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Section</p>
                <p className="font-medium text-foreground capitalize">{child.school_section}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ParentOverview = () => {
  const { user, profile } = useAuth();
  const firstName = extractFirstName(profile?.full_name);
  const [viewingChild, setViewingChild] = useState<any>(null);

  const { data: allData } = useQuery({
    queryKey: ["my-children", user?.id],
    queryFn: async () => {
      if (!user?.id) return { children: [], classesMap: new Map() };

      const { data: links, error: linksError } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", user.id);

      if (linksError) throw linksError;

      const studentIds = (links || []).map((l: any) => l.student_id).filter(Boolean);

      const [studentsRes, classesRes] = await Promise.all([
        studentIds.length > 0
          ? supabase.from("students").select("id, first_name, last_name, full_name, student_id, admission_number, class_id, gender, date_of_birth, school_section, avatar_url").in("id", studentIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        supabase.from("classes").select("*"),
      ]);

      if (classesRes.error) throw classesRes.error;

      const classesMap = new Map();
      (classesRes.data || []).forEach((cls: any) => classesMap.set(cls.id, cls));

      return { children: studentsRes.data || [], classesMap };
    },
    enabled: !!user,
  });

  const children = allData?.children || [];
  const classesMap = allData?.classesMap || new Map();

  if (viewingChild) {
    const className = classesMap.get(viewingChild.class_id)?.name || "";
    return <ChildProfile child={viewingChild} className={className} onBack={() => setViewingChild(null)} />;
  }

  return (
    <div className="space-y-6">
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
            <button
              key={child?.id}
              onClick={() => setViewingChild(child)}
              className="bg-card rounded-xl p-5 shadow-card flex items-center gap-4 text-left hover:shadow-md transition-shadow w-full"
            >
              <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden">
                {child.avatar_url
                  ? <img src={child.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full green-gradient flex items-center justify-center">
                      <GraduationCap className="text-primary-foreground" size={22} />
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{child?.first_name} {child?.last_name}</div>
                <div className="text-sm text-muted-foreground">{className || "No class assigned"}</div>
              </div>
              <ChevronLeft size={16} className="text-muted-foreground rotate-180 flex-shrink-0" />
            </button>
          );
        })}
        {(!children || children.length === 0) && (
          <p className="text-muted-foreground text-sm">No children linked to your account yet. Contact the administrator.</p>
        )}
      </div>
    </div>
  );
};

const ChildrenResults = () => {
  const { user } = useAuth();
  const [reportCard, setReportCard] = useState<{ studentId: string; termId: string; resultType: "mid_term" | "end_of_term"; autoPrint?: boolean } | null>(null);

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
          autoPrint={reportCard.autoPrint}
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
                  <div key={sub.term_id} className="border border-border rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">{term?.name || "—"}</p>
                    <div className="space-y-2">
                      {(["mid_term", "end_of_term"] as const).map((type) => (
                        <div key={type} className="flex gap-1.5">
                          <button
                            onClick={() => setReportCard({ studentId: student.id, termId: sub.term_id, resultType: type })}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                          >
                            <Printer size={12} /> {type === "mid_term" ? "Mid Term" : "End of Term"}
                          </button>
                          <button
                            onClick={() => setReportCard({ studentId: student.id, termId: sub.term_id, resultType: type, autoPrint: true })}
                            className="flex items-center justify-center gap-1 text-xs px-2.5 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Download PDF"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      ))}
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
