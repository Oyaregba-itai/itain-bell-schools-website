import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
    </DashboardLayout>
  );
};

const ParentOverview = () => {
  const { user } = useAuth();

  const { data: children } = useQuery({
    queryKey: ["my-children", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*, classes(name)").eq("parent_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div>
      <h3 className="text-lg font-heading text-foreground mb-6">My Children</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {children?.map((child) => (
          <div key={child.id} className="bg-card rounded-xl p-5 shadow-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-full green-gradient flex items-center justify-center">
              <GraduationCap className="text-primary-foreground" size={22} />
            </div>
            <div>
              <div className="font-medium text-foreground">{child.full_name}</div>
              <div className="text-sm text-muted-foreground">{(child as any).classes?.name || "No class assigned"}</div>
            </div>
          </div>
        ))}
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
      const { data } = await supabase.from("students").select("*").eq("parent_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const childIds = children?.map(c => c.id) || [];

  const { data: results } = useQuery({
    queryKey: ["children-results", childIds],
    queryFn: async () => {
      if (!childIds.length) return [];
      const { data } = await supabase
        .from("results")
        .select("*, students(full_name), subjects(name), terms(name, academic_year)")
        .in("student_id", childIds)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: childIds.length > 0,
  });

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
            {results?.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 text-foreground">{(r as any).students?.full_name}</td>
                <td className="p-3 text-muted-foreground">{(r as any).subjects?.name}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                    r.grade === "A" ? "bg-secondary/10 text-secondary" :
                    r.grade === "F" ? "bg-destructive/10 text-destructive" :
                    "bg-accent/20 text-accent-foreground"
                  }`}>{r.grade}</span>
                </td>
                <td className="p-3 text-muted-foreground">{(r as any).terms?.name} — {(r as any).terms?.academic_year}</td>
                <td className="p-3 text-muted-foreground">{r.comment || "—"}</td>
              </tr>
            ))}
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
