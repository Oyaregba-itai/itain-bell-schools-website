import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { GraduationCap } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";

const ParentDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview" && <ParentOverview />}
      {activeTab === "results" && <ChildrenResults />}
      {activeTab === "timetable" && <TimetableView />}
      {activeTab === "announcements" && <AnnouncementsView />}
    </DashboardLayout>
  );
};

const ParentOverview = () => {
  const { user } = useAuth();

  const { data: allData } = useQuery({
    queryKey: ["my-children", user?.id],
    queryFn: async () => {
      const childrenSnap = await getDocs(query(collection(db, "students"), where("parent_id", "==", user!.id)));
      const classesSnap = await getDocs(collection(db, "classes"));
      
      const classesMap = new Map();
      classesSnap.docs.forEach(doc => classesMap.set(doc.id, doc.data()));
      
      return {
        children: childrenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
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
          const className = classesMap.get(child.class_id)?.name;
          return (
            <div key={child.id} className="bg-card rounded-xl p-5 shadow-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full green-gradient flex items-center justify-center">
                <GraduationCap className="text-primary-foreground" size={22} />
              </div>
              <div>
                <div className="font-medium text-foreground">{child.full_name}</div>
                <div className="text-sm text-muted-foreground">{className || "No class assigned"}</div>
              </div>
            </div>
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

  const { data: children } = useQuery({
    queryKey: ["my-children", user?.id],
    queryFn: async () => {
      const querySnapshot = await getDocs(query(collection(db, "students"), where("parent_id", "==", user!.id)));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user,
  });

  const childIds = children?.map((c: any) => c.id) || [];

  const { data: allData } = useQuery({
    queryKey: ["children-results", childIds],
    queryFn: async () => {
      if (!childIds.length) return { results: [], studentsMap: new Map(), subjectsMap: new Map(), termsMap: new Map() };
      
      const resultsSnap = await getDocs(collection(db, "results"));
      const studentsSnap = await getDocs(collection(db, "students"));
      const subjectsSnap = await getDocs(collection(db, "subjects"));
      const termsSnap = await getDocs(collection(db, "terms"));
      
      const studentsMap = new Map();
      const subjectsMap = new Map();
      const termsMap = new Map();
      
      studentsSnap.docs.forEach(doc => studentsMap.set(doc.id, doc.data()));
      subjectsSnap.docs.forEach(doc => subjectsMap.set(doc.id, doc.data()));
      termsSnap.docs.forEach(doc => termsMap.set(doc.id, doc.data()));
      
      const results = resultsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((r: any) => childIds.includes(r.student_id));
      
      return { results, studentsMap, subjectsMap, termsMap };
    },
    enabled: childIds.length > 0,
  });

  const results = allData?.results || [];
  const studentsMap = allData?.studentsMap || new Map();
  const subjectsMap = allData?.subjectsMap || new Map();
  const termsMap = allData?.termsMap || new Map();

  return (
    <div>
      <h3 className="text-lg font-heading text-foreground mb-6">My Children's Results</h3>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Child</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
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
                  <td className="p-3 text-foreground">{student?.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{subject?.name || "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      r.grade === "A" ? "bg-secondary/10 text-secondary" :
                      r.grade === "F" ? "bg-destructive/10 text-destructive" :
                      "bg-accent/20 text-accent-foreground"
                    }`}>{r.grade}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{term?.name} — {term?.academic_year}</td>
                  <td className="p-3 text-muted-foreground">{r.comment || "—"}</td>
                </tr>
              );
            })}
            {(!results || results.length === 0) && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No results available yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParentDashboard;
