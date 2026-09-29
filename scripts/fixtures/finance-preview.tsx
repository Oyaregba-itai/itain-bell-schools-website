import { createRoot } from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { FinanceWorkspace } from "@/components/FinanceWorkspace";
import { Toaster } from "@/components/ui/toaster";
import "@/index.css";

// Browser-test-only entry, excluded from the production build.
const user = { id: "182ee4c8-c25b-4b7a-90d5-cbc94e26c322" } as User;
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthContext.Provider value={{ user, role: "teacher", profile: { full_name: "Mr Segun", email: "finance@example.test", role: "teacher", is_finance_head: true }, isSuperAdmin: false, loading: false, signIn: async () => ({ error: null }), signOut: async () => {} }}>
      <main className="max-w-7xl mx-auto p-4 sm:p-8"><FinanceWorkspace /></main>
      <Toaster />
    </AuthContext.Provider>
  </QueryClientProvider>,
);
