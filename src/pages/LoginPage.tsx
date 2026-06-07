import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, EyeOff, GraduationCap, BookOpen, Shield, Users } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

const roleConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  admin:        { label: "Administrator", icon: <Shield size={16} />,        color: "text-purple-700", bg: "bg-purple-100" },
  teacher:      { label: "Teacher",       icon: <BookOpen size={16} />,      color: "text-blue-700",   bg: "bg-blue-100"   },
  parent:       { label: "Parent",        icon: <GraduationCap size={16} />, color: "text-green-700",  bg: "bg-green-100"  },
  creche_staff: { label: "Crèche Staff",  icon: <Users size={16} />,         color: "text-amber-700",  bg: "bg-amber-100"  },
};

const LoginPage = () => {
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLookupLoading(true);
    const { data, error } = await supabase.rpc("get_profile_by_email", { input_email: email.trim().toLowerCase() });
    setLookupLoading(false);
    if (error || !data || data.length === 0) {
      toast({ title: "No account found", description: "Check the email address and try again.", variant: "destructive" });
      return;
    }
    setFoundUser(data[0]);
    setMode("password");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast({ title: "Incorrect password", description: "Please try again.", variant: "destructive" });
    setLoginLoading(false);
  };

  const roleInfo = foundUser ? roleConfig[foundUser.role] ?? roleConfig["parent"] : null;
  const initials = foundUser?.full_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "";

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

      <div className="flex-1 flex items-start justify-center px-4 py-10 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl shadow-elevated overflow-hidden">
            {/* Header */}
            <div className="hero-gradient px-8 py-6 text-center">
              <img src={schoolLogo} alt="School Logo" className="h-12 w-auto mx-auto mb-3 drop-shadow" />
              <h1 className="text-xl font-heading text-primary-foreground">Itain‑Bell Portal</h1>
              <p className="text-primary-foreground/70 text-xs mt-1">
                {mode === "password" ? "Welcome back!" : "Sign in to your account"}
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {/* Step 1 — Email */}
              {mode === "email" && (
                <form onSubmit={handleEmailContinue} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="yourname@itainbellschool.com"
                      required
                      autoFocus
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" className="w-full hero-gradient text-sm font-semibold h-11" disabled={lookupLoading}>
                    {lookupLoading ? "Looking up…" : "Continue"}
                  </Button>
                </form>
              )}

              {/* Step 2 — Password */}
              {mode === "password" && foundUser && (
                <form onSubmit={handleSignIn} className="space-y-5">
                  {/* User identity card */}
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="w-16 h-16 rounded-full hero-gradient flex items-center justify-center text-white font-bold text-xl shadow">
                      {initials}
                    </div>
                    <p className="font-heading text-lg text-foreground">{foundUser.full_name}</p>
                    {roleInfo && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${roleInfo.color} ${roleInfo.bg}`}>
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full hero-gradient text-sm font-semibold h-11" disabled={loginLoading}>
                    {loginLoading ? "Signing in…" : "Sign In"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setMode("email"); setPassword(""); setFoundUser(null); }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
                  >
                    ← Not you? Use a different account
                  </button>
                </form>
              )}

              <p className="text-xs text-muted-foreground text-center mt-5 pt-4 border-t border-border">
                Accounts are created by the school administrator.<br />Contact <strong>info@itainbellschool.com</strong> for help.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
