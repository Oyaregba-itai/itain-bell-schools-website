import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { GraduationCap, Printer } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";
import EventsView from "@/components/EventsView";
import MessagingView from "@/components/MessagingView";
import ProfilePage from "@/components/ProfilePage";
import ReportCard from "@/components/ReportCard";

const ParentDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

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
  const { user } = useAuth();

  const { data: allData } = useQuery({
    queryKey: ["my-children", user?.id],
    queryFn: async () => {
      if (!user?.id) return { children: [], classesMap: new Map() };

      // Get students linked to this parent
      const { data: childrenData, error: childrenError } = await supabase
        .from("parent_students")
        .select(
          `
          student_id,
          students:student_id(id, first_name, last_name, student_id, class_id),
          classes:students(class_id)
        `
        )
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
    <div>
      <h3 className="text-lg font-heading text-foreground mb-6">My Children</h3>
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

      const { data: resultsData, error: resultsError } = await supabase
        .from("results")
        .select(
          `
          *,
          subjects:subject_id(id, name),
          students:student_id(id, first_name, last_name),
          terms:term_id(id, name)
        `
        )
        .in("student_id", childIds);

      if (resultsError) throw resultsError;

      const studentsMap = new Map();
      const subjectsMap = new Map();
      const termsMap = new Map();

      resultsData?.forEach((result: any) => {
        if (result.students) studentsMap.set(result.student_id, result.students);
        if (result.subjects) subjectsMap.set(result.subject_id, result.subjects);
        if (result.terms) termsMap.set(result.term_id, result.terms);
      });

      return { results: resultsData || [], studentsMap, subjectsMap, termsMap };
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
                  <td className="p-3 text-muted-foreground">{r.teacher_comments || "—"}</td>
                </tr>
              );
            })}
            {(!results || results.length === 0) && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No results available yet.
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
