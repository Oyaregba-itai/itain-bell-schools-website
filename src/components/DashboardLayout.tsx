import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Users, BookOpen, GraduationCap, BarChart3, Settings, Calendar } from "lucide-react";
import { ReactNode, useState } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DashboardLayout = ({ children, activeTab, onTabChange }: DashboardLayoutProps) => {
  const { profile, role, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "requests", label: "Requests", icon: Users },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "classes", label: "Classes", icon: BookOpen },
    { id: "students", label: "Students", icon: GraduationCap },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "terms", label: "Terms", icon: Calendar },
    { id: "results", label: "All Results", icon: BarChart3 },
  ];

  const teacherTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "upload", label: "Upload Results", icon: BookOpen },
    { id: "my-results", label: "My Results", icon: BarChart3 },
  ];

  const parentTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "results", label: "My Children's Results", icon: GraduationCap },
  ];

  const tabs = role === "admin" ? adminTabs : role === "teacher" ? teacherTabs : parentTabs;

  const roleLabel = role === "admin" ? "Administrator" : role === "teacher" ? "Teacher" : "Parent";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full hero-gradient flex items-center justify-center">
                <span className="text-primary-foreground font-heading text-sm">IB</span>
              </div>
              <div>
                <div className="font-heading text-sm text-foreground">Itain‑Bell</div>
                <div className="text-xs text-muted-foreground">{roleLabel} Portal</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { onTabChange(tab.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="text-sm font-medium text-foreground truncate">{profile?.full_name}</div>
            <div className="text-xs text-muted-foreground truncate">{roleLabel}</div>
            <Button variant="ghost" size="sm" onClick={signOut} className="mt-2 w-full justify-start text-muted-foreground">
              <LogOut size={16} className="mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-foreground/20 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 md:ml-64">
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-foreground">
            <Settings size={20} />
          </button>
          <h2 className="font-heading text-lg text-foreground capitalize">
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          <div />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
