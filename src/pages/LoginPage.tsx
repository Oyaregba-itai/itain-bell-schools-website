import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, GraduationCap, BookOpen, Shield, UserPlus, Eye, EyeOff } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

type PortalRole = "parent" | "teacher" | "admin";

const roles: { value: PortalRole; label: string; icon: React.ReactNode; description: string; color: string }[] = [
  { value: "parent",  label: "Parent",        icon: <GraduationCap className="w-5 h-5" />, description: "View your child's results & reports", color: "text-green-600 bg-green-50" },
  { value: "teacher", label: "Teacher",        icon: <BookOpen className="w-5 h-5" />,       description: "Upload results & manage your class",  color: "text-blue-600 bg-blue-50" },
  { value: "admin",   label: "Administrator",  icon: <Shield className="w-5 h-5" />,          description: "Manage the entire school system",       color: "text-purple-600 bg-purple-50" },
];

const LoginPage = () => {
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<PortalRole | null>(null);
  const [mode, setMode] = useState<"select" | "login" | "register">("select");
  const [regForm, setRegForm] = useState({ full_name: "", email: "", phone: "", role: "" as string });
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.role) return toast({ title: "Please select a role", variant: "destructive" } as any);
    setRegLoading(true);
    try {
      const { error } = await supabase.from("registration_requests").insert([{
        full_name: regForm.full_name, email: regForm.email, phone: regForm.phone || null,
        role: regForm.role as PortalRole, approved: false,
      }]);
      if (error) throw error;
      toast({ title: "Request submitted!", description: "The administrator will review your request." });
      setRegForm({ full_name: "", email: "", phone: "", role: "" });
      setMode("select");
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setRegLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-card/60 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2">
          <img src={schoolLogo} alt="Logo" className="h-8 w-auto" />
          <span className="font-heading text-foreground text-sm hidden sm:block">Itain‑Bell Schools</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Website
        </Link>
      </div>

      {/* Main content — scrollable */}
      <div className="flex-1 flex items-start justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-card rounded-2xl shadow-elevated overflow-hidden">
            {/* Header strip */}
            <div className="hero-gradient px-8 py-6 text-center">
              <img src={schoolLogo} alt="School Logo" className="h-12 w-auto mx-auto mb-3 drop-shadow" />
              <h1 className="text-xl font-heading text-primary-foreground">Itain‑Bell Staff & Parent Portal</h1>
              <p className="text-primary-foreground/70 text-xs mt-1">
                {mode === "register" ? "Request access to the portal" : selectedRole ? `Signing in as ${roles.find(r => r.value === selectedRole)?.label}` : "Select your role to continue"}
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {/* Role selection */}
              {mode === "select" && (
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    {roles.map(role => (
                      <button key={role.value} onClick={() => { setSelectedRole(role.value); setMode("login"); }}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${role.color}`}>
                          {role.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{role.label}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border text-center space-y-3">
                    <p className="text-xs text-muted-foreground">Don't have an account yet?</p>
                    <Button variant="outline" className="w-full gap-2 text-sm" onClick={() => setMode("register")}>
                      <UserPlus size={15} /> Request an Account
                    </Button>
                  </div>
                </div>
              )}

              {/* Login form */}
              {mode === "login" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${roles.find(r => r.value === selectedRole)?.color}`}>
                      {roles.find(r => r.value === selectedRole)?.icon}
                    </div>
                    <p className="text-sm font-medium text-foreground">{roles.find(r => r.value === selectedRole)?.label} Portal</p>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm">Email Address</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yourname@itainbellschool.com" required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <div className="relative mt-1">
                      <Input id="password" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full hero-gradient text-sm font-semibold h-11" disabled={loading}>
                    {loading ? "Signing in…" : "Sign In"}
                  </Button>

                  <button type="button" onClick={() => { setSelectedRole(null); setMode("select"); }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1">
                    ← Choose a different role
                  </button>
                </form>
              )}

              {/* Register form */}
              {mode === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label className="text-sm">Full Name</Label>
                    <Input className="mt-1" value={regForm.full_name} onChange={e => setRegForm({ ...regForm, full_name: e.target.value })} placeholder="e.g. Mrs. Sarah Johnson" required />
                  </div>
                  <div>
                    <Label className="text-sm">Email Address</Label>
                    <Input className="mt-1" type="email" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} placeholder="you@email.com" required />
                  </div>
                  <div>
                    <Label className="text-sm">Phone Number (optional)</Label>
                    <Input className="mt-1" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} placeholder="+234 800 000 0000" />
                  </div>
                  <div>
                    <Label className="text-sm">I am a…</Label>
                    <Select value={regForm.role} onValueChange={v => setRegForm({ ...regForm, role: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent / Guardian</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full hero-gradient text-sm font-semibold h-11" disabled={regLoading}>
                    {regLoading ? "Submitting…" : "Submit Request"}
                  </Button>

                  <button type="button" onClick={() => setMode("select")} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1">
                    ← Back to login
                  </button>

                  <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
                    Your request will be reviewed by the school administrator. You'll receive login credentials once approved.
                  </p>
                </form>
              )}

              {mode !== "register" && (
                <p className="text-xs text-muted-foreground text-center mt-5 pt-4 border-t border-border">
                  Accounts are created by the school administrator.<br />Contact <strong>info@itainbellschool.com</strong> for help.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
