// Build with environment variables from Netlify
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, ErrorInfo, ReactNode } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import AdminSetup from "./pages/AdminSetup";
import AdmissionsPage from "./pages/AdmissionsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

class DashboardErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard failed to render", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-lg rounded-xl border border-destructive/30 bg-card p-6 text-center shadow-card">
            <h1 className="text-lg font-semibold text-foreground">Dashboard could not load</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please reload the page. If this continues, send this message to the administrator:</p>
            <p className="mt-3 rounded bg-muted p-3 text-left text-xs text-destructive break-words">{this.state.error.message}</p>
            <button className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" onClick={() => window.location.reload()}>
              Reload dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const DashboardRouter = () => {
  const { role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (role === "admin") return <AdminDashboard />;
  if (role === "teacher" || role === "receptionist") return <TeacherDashboard />;
  if (role === "parent") return <ParentDashboard />;
  return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">No role assigned. Contact admin.</p></div>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin-setup" element={<AdminSetup />} />
            <Route path="/admissions" element={<AdmissionsPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardErrorBoundary><DashboardRouter /></DashboardErrorBoundary></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
