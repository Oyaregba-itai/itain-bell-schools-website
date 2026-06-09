import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock, Upload, Eye, EyeOff, Sun, Moon, Monitor, Bell, BellOff, Shield, Palette, Phone, Plus, Trash2, CheckCircle } from "lucide-react";

// ── Tiny helpers ─────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const PasswordInput = ({ value, onChange, placeholder, id }: { value: string; onChange: (v: string) => void; placeholder: string; id: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

// ── Theme helpers ─────────────────────────────────────────────────────────────

type Theme = "light" | "dark" | "system";

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
  localStorage.setItem("ibs-theme", theme);
};

const getSavedTheme = (): Theme => (localStorage.getItem("ibs-theme") as Theme) || "light";

// ── Notification types ────────────────────────────────────────────────────────
const NOTIF_KEYS = ["announcements", "messages", "results", "events"] as const;
type NotifKey = typeof NOTIF_KEYS[number];

// ── Main component ────────────────────────────────────────────────────────────

type Tab = "profile" | "appearance" | "notifications" | "security";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "appearance",    label: "Appearance",    icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security",      label: "Security",      icon: Shield },
];

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-heading text-foreground">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile, appearance and preferences.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile"       && <ProfileTab />}
          {activeTab === "appearance"    && <AppearanceTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "security"      && <SecurityTab />}
        </div>
      </div>
    </div>
  );
};

// ── Profile tab ────────────────────────────────────────────────────────────────

const ProfileTab = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState((profile as any)?.phone || "");
  const [saving, setSaving] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>((profile as any)?.profile_picture_url || null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if ((profile as any)?.profile_picture_url) setProfileImageUrl((profile as any).profile_picture_url);
    if (profile?.full_name) setFullName(profile.full_name);
    if ((profile as any)?.phone) setPhone((profile as any).phone);
  }, [profile]);

  const saveProfile = async () => {
    if (!fullName.trim()) return toast({ title: "Name cannot be empty", variant: "destructive" } as any);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("user_id", user?.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast({ title: "Please select an image file", variant: "destructive" } as any);
    if (file.size > 5 * 1024 * 1024) return toast({ title: "Image must be less than 5MB", variant: "destructive" } as any);
    setUploadingImage(true);
    try {
      const fileName = `profile-${user?.id}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from("profile-pictures").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);
      setProfileImageUrl(data.publicUrl);
      await supabase.from("profiles").update({ profile_picture_url: data.publicUrl }).eq("user_id", user?.id);
      toast({ title: "Photo updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setUploadingImage(false); }
  };

  const initials = profile?.full_name?.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase() || "?";

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="font-heading font-semibold text-foreground mb-4">Profile Photo</h3>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {profileImageUrl
                ? <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-primary font-bold text-2xl">{initials}</span>
              }
            </div>
            <label htmlFor="pp-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full cursor-pointer hover:bg-primary/80 transition">
              {uploadingImage ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={14} />}
            </label>
            <input id="pp-upload" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{(profile as any)?.role} · Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Personal Information</h3>
        <div>
          <Label htmlFor="fullname">Full Name</Label>
          <Input id="fullname" value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative mt-1">
            <Phone size={15} className="absolute left-3 top-3 text-muted-foreground" />
            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" placeholder="+234 800 000 0000" />
          </div>
        </div>
        <div>
          <Label>Email Address</Label>
          <div className="relative mt-1">
            <Mail size={15} className="absolute left-3 top-3 text-muted-foreground" />
            <Input value={user?.email || ""} disabled className="pl-9 bg-muted/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Email is managed by your administrator.</p>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="hero-gradient">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

// ── Appearance tab ─────────────────────────────────────────────────────────────

const ACCENT_COLORS = [
  { name: "Forest Green", value: "green",  primary: "#166534", hsl: "143 64% 24%", className: "bg-[#166534]" },
  { name: "Royal Blue",   value: "blue",   primary: "#1e40af", hsl: "226 71% 40%", className: "bg-[#1e40af]" },
  { name: "Purple",       value: "purple", primary: "#7B2D8B", hsl: "290 51% 36%", className: "bg-[#7B2D8B]" },
  { name: "Deep Red",     value: "red",    primary: "#b91c1c", hsl: "0 74% 42%",   className: "bg-[#b91c1c]" },
  { name: "Teal",         value: "teal",   primary: "#0f766e", hsl: "175 77% 26%", className: "bg-[#0f766e]" },
  { name: "Amber",        value: "amber",  primary: "#d97706", hsl: "32 95% 44%",  className: "bg-[#d97706]" },
];

const AppearanceTab = () => {
  const { toast } = useToast();
  const [theme, setTheme] = useState<Theme>(getSavedTheme());
  const [accent, setAccent] = useState(localStorage.getItem("ibs-accent") || "green");

  const handleTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    toast({ title: `Theme set to ${t}` });
  };

  const handleAccent = (color: typeof ACCENT_COLORS[0]) => {
    setAccent(color.value);
    localStorage.setItem("ibs-accent", color.value);
    localStorage.setItem("ibs-accent-hsl", color.hsl);
    const root = document.documentElement;
    root.style.setProperty("--primary", color.hsl);
    root.style.setProperty("--ring", color.hsl);
    toast({ title: `Accent colour changed to ${color.name}` });
  };

  const THEME_OPTS: { id: Theme; label: string; icon: any; desc: string }[] = [
    { id: "light",  label: "Light",  icon: Sun,     desc: "Always light" },
    { id: "dark",   label: "Dark",   icon: Moon,    desc: "Always dark" },
    { id: "system", label: "System", icon: Monitor, desc: "Follows your device" },
  ];

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Theme</h3>
        <p className="text-sm text-muted-foreground">Choose how the portal looks.</p>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTS.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleTheme(opt.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
            >
              <opt.icon size={22} className={theme === opt.id ? "text-primary" : "text-muted-foreground"} />
              <span className={`text-sm font-medium ${theme === opt.id ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent colour */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Accent Colour</h3>
        <p className="text-sm text-muted-foreground">Personalise the highlight colour across your portal.</p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => handleAccent(color)}
              title={color.name}
              className={`w-10 h-10 rounded-full ${color.className} transition-all ring-2 ring-offset-2 ${accent === color.value ? "ring-foreground scale-110" : "ring-transparent"}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Selected: <strong>{ACCENT_COLORS.find(c => c.value === accent)?.name || "Default"}</strong></p>
      </div>

      {/* Density */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Font Size</h3>
        <p className="text-sm text-muted-foreground">Adjust text size across the portal.</p>
        <div className="flex gap-2">
          {[["Small", "13px"], ["Default", "16px"], ["Large", "19px"]].map(([label, size]) => (
            <button key={label} onClick={() => { document.documentElement.style.fontSize = size; localStorage.setItem("ibs-fontsize", size); toast({ title: `Font size set to ${label}` }); }}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${(localStorage.getItem("ibs-fontsize") || "16px") === size ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Notifications tab ─────────────────────────────────────────────────────────

const NOTIF_OPTIONS: { key: NotifKey; label: string; desc: string }[] = [
  { key: "announcements", label: "Announcements",    desc: "New school announcements" },
  { key: "messages",      label: "New Messages",     desc: "When you receive a direct message" },
  { key: "results",       label: "Results Published", desc: "When your report card is approved" },
  { key: "events",        label: "School Events",    desc: "New events and reminders" },
];

const NotificationsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");

  const { data: notifData } = useQuery({
    queryKey: ["notif-prefs", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles")
        .select("notification_emails, notification_settings")
        .eq("user_id", user.id).single();
      return {
        emails: (data?.notification_emails as string[]) || [],
        settings: (data?.notification_settings as Record<string, boolean>) || {},
      };
    },
    enabled: !!user,
  });

  const saveSettings = useMutation({
    mutationFn: async (update: { emails?: string[]; settings?: Record<string, boolean> }) => {
      const patch: any = {};
      if (update.emails !== undefined) patch.notification_emails = update.emails;
      if (update.settings !== undefined) patch.notification_settings = update.settings;
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notif-prefs", user?.id] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const emails = notifData?.emails || [];
  const settings = notifData?.settings || {};

  const toggleType = (key: NotifKey) => {
    const next = { ...settings, [key]: !settings[key] };
    saveSettings.mutate({ settings: next });
    toast({ title: `${!settings[key] ? "Enabled" : "Disabled"} ${key} email notifications` });
  };

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return toast({ title: "Please enter a valid email address", variant: "destructive" } as any);
    }
    if (emails.includes(trimmed)) {
      return toast({ title: "That email is already added", variant: "destructive" } as any);
    }
    saveSettings.mutate({ emails: [...emails, trimmed] });
    setNewEmail("");
    toast({ title: "Email added — notifications will be sent there" });
  };

  const removeEmail = (email: string) => {
    saveSettings.mutate({ emails: emails.filter(e => e !== email) });
    toast({ title: "Email removed" });
  };

  return (
    <div className="space-y-6">

      {/* Notification email addresses */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Notification Emails</h3>
          <p className="text-sm text-muted-foreground mt-1">Add your Gmail or any personal email to receive school notifications there.</p>
        </div>

        {/* Existing emails */}
        {emails.length > 0 && (
          <div className="space-y-2">
            {emails.map(email => (
              <div key={email} className="flex items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm text-foreground">{email}</span>
                </div>
                <button onClick={() => removeEmail(email)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add email */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail size={14} className="absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addEmail(); }}
              placeholder="yourname@gmail.com"
              type="email"
              className="pl-9"
            />
          </div>
          <Button onClick={addEmail} className="hero-gradient gap-1.5" disabled={saveSettings.isPending}>
            <Plus size={15} /> Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">You can add up to 3 extra emails. Notifications are sent when enabled below.</p>
      </div>

      {/* Notification type toggles */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground">What to Send</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose which events trigger an email to your addresses above.</p>
        </div>
        <div className="space-y-1">
          {NOTIF_OPTIONS.map(opt => (
            <div key={opt.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <Toggle checked={settings[opt.key] !== false} onChange={() => toggleType(opt.key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
        <Bell size={14} className="flex-shrink-0 mt-0.5" />
        <span>Email notifications are sent automatically when school events happen. Make sure your notification emails are correct. Emails come from <strong>notifications@itainbellschool.com</strong>.</span>
      </div>
    </div>
  );
};

// ── Security tab ──────────────────────────────────────────────────────────────

const SecurityTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const strength = newPw.length === 0 ? null : newPw.length < 6 ? "weak" : newPw.length < 10 ? "fair" : /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? "strong" : "good";
  const strengthColors: Record<string, string> = { weak: "bg-red-500", fair: "bg-amber-500", good: "bg-blue-500", strong: "bg-green-500" };
  const strengthW: Record<string, string> = { weak: "w-1/4", fair: "w-2/4", good: "w-3/4", strong: "w-full" };

  const changePassword = async () => {
    if (!current || !newPw || !confirm) return toast({ title: "All fields required", variant: "destructive" } as any);
    if (newPw !== confirm) return toast({ title: "Passwords don't match", variant: "destructive" } as any);
    if (newPw.length < 6) return toast({ title: "Password must be at least 6 characters", variant: "destructive" } as any);
    setSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email || "", password: current });
      if (signInError) throw new Error("Current password is incorrect");
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast({ title: "Password changed successfully" });
      setCurrent(""); setNewPw(""); setConfirm("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Account info */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-3">
        <h3 className="font-heading font-semibold text-foreground">Account Details</h3>
        {[
          ["Email", user?.email || "—"],
          ["Last Sign In", user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"],
          ["Account ID", user?.id?.substring(0, 8) + "…"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground font-mono">{value}</span>
          </div>
        ))}
      </div>

      {/* Change password */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={18} className="text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Change Password</h3>
        </div>
        <div>
          <Label>Current Password</Label>
          <PasswordInput id="cur" value={current} onChange={setCurrent} placeholder="Enter current password" />
        </div>
        <div>
          <Label>New Password</Label>
          <PasswordInput id="new" value={newPw} onChange={setNewPw} placeholder="Enter new password" />
          {strength && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${strengthColors[strength]} ${strengthW[strength]}`} />
              </div>
              <p className="text-xs capitalize" style={{ color: { weak: "#b91c1c", fair: "#d97706", good: "#1e40af", strong: "#166534" }[strength] }}>
                {strength} password
              </p>
            </div>
          )}
        </div>
        <div>
          <Label>Confirm New Password</Label>
          <PasswordInput id="conf" value={confirm} onChange={setConfirm} placeholder="Confirm new password" />
          {confirm && newPw !== confirm && <p className="text-xs text-destructive mt-1">Passwords don't match</p>}
        </div>
        <Button onClick={changePassword} disabled={saving || !current || !newPw || !confirm || newPw !== confirm} className="w-full hero-gradient">
          {saving ? "Updating..." : "Change Password"}
        </Button>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground flex items-start gap-2">
        <Shield size={14} className="flex-shrink-0 mt-0.5" />
        <span>Use a strong password with uppercase letters, numbers and symbols. Never share your password with anyone, including school staff.</span>
      </div>
    </div>
  );
};

export default ProfilePage;
