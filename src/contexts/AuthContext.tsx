import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/integrations/firebase/config";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export type AppRole = "admin" | "teacher" | "parent";

interface Profile {
  full_name: string;
  email: string;
  role: AppRole;
  phone?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Get user profile from Firestore
      const profileRef = doc(db, "profiles", userId);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profileData = profileSnap.data() as Profile;
        setProfile(profileData);
        setRole(profileData.role);
      } else {
        // If profile doesn't exist, check user_roles collection
        const rolesRef = collection(db, "user_roles");
        const rolesQuery = query(rolesRef, where("user_id", "==", userId));
        const rolesSnap = await getDocs(rolesQuery);
        
        if (!rolesSnap.empty) {
          const roleData = rolesSnap.docs[0].data();
          setRole(roleData.role);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserData(currentUser.uid);
      } else {
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
