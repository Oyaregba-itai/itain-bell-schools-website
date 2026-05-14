import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, GraduationCap, BookOpen, Shield, UserPlus } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

type PortalRole = "parent" | "teacher" | "admin";

const roles: { value: PortalRole; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "parent", label: "Parent", icon: <GraduationCap className="w-6 h-6" />, description: "View your child's results" },
  { value: "teacher", label: "Teacher", icon: <BookOpen className="w-6 h-6" />, description: "Upload & manage results" },
  { value: "admin", label: "Administrator", icon: <Shield className="w-6 h-6" />, description: "Manage the entire school" },
];

const LoginPage = () => {
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<PortalRole | null>(null);
  const [mode, setMode] = useState<"select" | "login" | "register">("select");

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Registration form
  const [regForm, setRegForm] = useState({ full_name: "", email: "", phone: "", role: "" as string });
  const [regLoading, setRegLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.role) {
      toast({ title: "Please select a role", variant: "destructive" });
      return;
    }
    setRegLoading(true);
    try {
      const { error } = await supabase.from("registration_requests").insert([
        {
          full_name: regForm.full_name,
          email: regForm.email,
          phone: regForm.phone || null,
          role: regForm.role as PortalRole,
          approved: false,
        },
      ]);
      
      if (error) throw error;
      
      toast({ title: "Request submitted!", description: "The administrator will review your request and create your account." });
      setRegForm({ full_name: "", email: "", phone: "", role: "" });
      setMode("select");
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
    setRegLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to website
        </Link>

        <div className="bg-card rounded-2xl shadow-elevated p-8">
          <div className="text-center mb-8">
            <img src={schoolLogo} alt="School Logo" className="h-14 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-heading text-foreground">Itain‑Bell Portal</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "register"
                ? "Request an account"
                : selectedRole
                ? `Sign in as ${roles.find(r => r.value === selectedRole)?.label}`
                : "Select your role to continue"}
            </p>
          </div>

          {mode === "select" && (
            <>
              <div className="space-y-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => { setSelectedRole(role.value); setMode("login"); }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0">
                      {role.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{role.label}</div>
                      <div className="text-sm text-muted-foreground">{role.description}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground mb-3">Don't have an account?</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode("register")}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Request an Account
                </Button>
              </div>
            </>
          )}

          {mode === "login" && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full hero-gradient" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <button
                onClick={() => { setSelectedRole(null); setMode("select"); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 text-center"
              >
                ← Choose a different role
              </button>
            </>
          )}

          {mode === "register" && (
            <>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={regForm.full_name}
                    onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <Label>Phone (optional)</Label>
                  <Input
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="+234..."
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={regForm.role} onValueChange={(v) => setRegForm({ ...regForm, role: v })}>
                    <SelectTrigger><SelectValue placeholder="What are you?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full hero-gradient" disabled={regLoading}>
                  {regLoading ? "Submitting..." : "Submit Request"}
                </Button>
              </form>

              <button
                onClick={() => setMode("select")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 text-center"
              >
                ← Back to login
              </button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Your request will be reviewed by the school administrator. You'll receive your login credentials once approved.
              </p>
            </>
          )}

          {mode !== "register" && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              Accounts are created by the school administrator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
