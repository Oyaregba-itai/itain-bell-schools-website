import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Users, BookOpen, GraduationCap, BarChart3, Calendar, Megaphone, Clock, Menu, ArrowLeft, MessageCircle, UserPlus, Banknote, ClipboardCheck, Bell } from "lucide-react";
import { ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import schoolLogo from "@/assets/school-logo.png";

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  extraTabs?: { id: string; label: string; icon: any }[];
  tabBadges?: Record<string, number>;
}

const DashboardLayout = ({ children, activeTab, onTabChange, extraTabs = [], tabBadges = {} }: DashboardLayoutProps) => {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const unread = (notifications || []).filter((n: any) => !n.read);
  const unreadByTab = unread.reduce((acc: Record<string, number>, n: any) => {
    if (n.link_tab) acc[n.link_tab] = (acc[n.link_tab] || 0) + 1;
    return acc;
  }, {});
  const mergedBadges = { ...unreadByTab, ...tabBadges };

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const handleNotificationClick = (n: any) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link_tab) onTabChange(n.link_tab);
    setNotifOpen(false);
  };

  const adminTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "profile", label: "Profile", icon: Users },
    { id: "admissions", label: "Applications", icon: GraduationCap },
    { id: "users", label: "Manage Staff", icon: Users },
    { id: "classes", label: "Classes", icon: BookOpen },
    { id: "students", label: "Students", icon: GraduationCap },
    { id: "parents", label: "Parents", icon: UserPlus },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "terms", label: "Terms", icon: Calendar },
    { id: "events", label: "Events", icon: Calendar },
    { id: "results", label: "All Results", icon: BarChart3 },
    { id: "requests", label: "Requests", icon: ClipboardCheck },
    { id: "finances", label: "Finances", icon: Banknote },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "timetable", label: "Timetable", icon: Clock },
    { id: "messaging", label: "Messages", icon: MessageCircle },
  ];

  const teacherTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "profile", label: "Profile", icon: Users },
    { id: "my-subjects", label: "My Subjects", icon: BookOpen },
    { id: "upload", label: "Upload Results", icon: BookOpen },
    { id: "my-results", label: "My Results", icon: BarChart3 },
    { id: "timetable", label: "Timetable", icon: Clock },
    { id: "events", label: "Events", icon: Calendar },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "messaging", label: "Messages", icon: MessageCircle },
  ];

  const parentTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "profile", label: "Profile", icon: Users },
    { id: "results", label: "My Children's Results", icon: GraduationCap },
    { id: "timetable", label: "Timetable", icon: Clock },
    { id: "events", label: "Events", icon: Calendar },
    { id: "announcements", label: "Announcements", icon: Megaphone },
  ];

  const baseTabs = role === "admin" ? adminTabs : role === "teacher" ? teacherTabs : parentTabs;
  const tabs = [...baseTabs, ...extraTabs];

  const roleLabel = role === "admin" ? "Administrator" : role === "teacher" ? "Teacher" : "Parent";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <img src={schoolLogo} alt="School Logo" className="h-9 w-auto" />
              <div>
                <div className="font-heading text-sm text-foreground">Itain‑Bell</div>
                <div className="text-xs text-muted-foreground">{roleLabel} Portal</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
                {mergedBadges[tab.id] > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                    {mergedBadges[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <button 
              onClick={() => { onTabChange("profile"); setSidebarOpen(false); }}
              className="block w-full text-left hover:opacity-80 transition"
            >
              <div className="text-sm font-medium text-foreground truncate">{profile?.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">{roleLabel}</div>
            </button>
            <Button variant="ghost" size="sm" onClick={signOut} className="mt-2 w-full justify-start text-muted-foreground">
              <LogOut size={16} className="mr-2" /> Sign Out
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="w-full justify-start text-muted-foreground">
              <ArrowLeft size={16} className="mr-2" /> Back to Website
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
            <Menu size={20} />
          </button>
          <h2 className="font-heading text-lg text-foreground capitalize">
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              <Bell size={20} />
              {unread.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[1.1rem] text-center">
                  {unread.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-card z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h3 className="font-heading text-sm text-foreground">Notifications</h3>
                    {unread.length > 0 && (
                      <button
                        onClick={() => markAllRead.mutate()}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {(!notifications || notifications.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((n: any) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`block w-full text-left px-4 py-3 hover:bg-muted transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                        >
                          <p className="text-sm font-medium text-foreground">{n.title}</p>
                          {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-xs text-muted-foreground/70 mt-1">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
