import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, GraduationCap, BookOpen, Shield } from "lucide-react";

type PortalRole = "parent" | "teacher" | "admin";

const roles: { value: PortalRole; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "parent", label: "Parent", icon: <GraduationCap className="w-6 h-6" />, description: "View your child's results" },
  { value: "teacher", label: "Teacher", icon: <BookOpen className="w-6 h-6" />, description: "Upload & manage results" },
  { value: "admin", label: "Administrator", icon: <Shield className="w-6 h-6" />, description: "Manage the entire school" },
];

const LoginPage = () => {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<PortalRole | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        {/* Back to website */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to website
        </Link>

        <div className="bg-card rounded-2xl shadow-elevated p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full hero-gradient flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-heading text-xl">IB</span>
            </div>
            <h1 className="text-2xl font-heading text-foreground">Itain‑Bell Portal</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {selectedRole ? `Sign in as ${roles.find(r => r.value === selectedRole)?.label}` : "Select your role to continue"}
            </p>
          </div>

          {!selectedRole ? (
            <div className="space-y-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
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
          ) : (
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
                onClick={() => setSelectedRole(null)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 text-center"
              >
                ← Choose a different role
              </button>
            </>
          )}

          <p className="text-xs text-muted-foreground text-center mt-6">
            Accounts are created by the school administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
