import { createContext, useEffect, useState, ReactNode } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "parent" | "creche_staff";

interface Profile {
  id?: string;
  full_name: string;
  email: string;
  role: AppRole;
  phone?: string;
  created_at?: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  role: AppRole | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string, userEmail: string) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        // Even if profile fetch fails, don't throw - just skip profile data
      }

      if (!profileData) {
        console.warn("No profile data found for user:", userId);
        return;
      }

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleError) {
        console.error("Role fetch error:", roleError);
        return;
      }

      if (!roleData) {
        console.warn("No role data found for user:", userId);
        return;
      }

      const userRole = roleData.role as AppRole;
      setProfile({
        id: profileData.id,
        full_name: profileData.full_name,
        email: userEmail,
        role: userRole,
        phone: profileData.phone,
        created_at: profileData.created_at,
      });
      setRole(userRole);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && !role) {
      fetchUserData(user.id, user.email || "");
    }
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
