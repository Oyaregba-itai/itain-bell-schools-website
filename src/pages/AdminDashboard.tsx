import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { BulkCreateStaffUsers } from "@/components/BulkCreateStaffUsers";
import ProfilePage from "@/components/ProfilePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, GraduationCap, BookOpen, BarChart3, ClipboardCheck, MessageCircle, UserPlus, Trash2, Check, X, Printer, ChevronRight, ChevronLeft, Copy, Upload, Pencil } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";
import MessagingView from "@/components/MessagingView";
import GroupMessagingView from "@/components/GroupMessagingView";
import ReportCard from "@/components/ReportCard";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "profile" && <ProfilePage />}
      {activeTab === "users" && <ManageUsers />}
      {activeTab === "classes" && <ManageClasses />}
      {activeTab === "students" && <ManageStudents />}
      {activeTab === "subjects" && <ManageSubjects />}
      {activeTab === "terms" && <ManageTerms />}
      {activeTab === "admissions" && <ManageAdmissions />}
      {activeTab === "events" && <ManageEvents />}
      {activeTab === "results" && <ViewAllResults />}
      {activeTab === "announcements" && <AnnouncementsView />}
      {activeTab === "timetable" && <TimetableView />}
      {activeTab === "messaging" && <MessagingView />}
      {activeTab === "groups" && <GroupMessagingView />}
    </DashboardLayout>
  );
};

const AdminOverview = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [studentsRes, classesRes, subjectsRes, resultsRes, termsRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact" }),
        supabase.from("classes").select("id", { count: "exact" }),
        supabase.from("subjects").select("id", { count: "exact" }),
        supabase.from("results").select("id", { count: "exact" }),
        supabase.from("terms").select("id", { count: "exact" }),
      ]);

      return {
        students: studentsRes.count || 0,
        classes: classesRes.count || 0,
        subjects: subjectsRes.count || 0,
        results: resultsRes.count || 0,
        terms: termsRes.count || 0,
      };
    },
  });

  const cards = [
    { label: "Students", value: stats?.students || 0, icon: GraduationCap },
    { label: "Classes", value: stats?.classes || 0, icon: BookOpen },
    { label: "Subjects", value: stats?.subjects || 0, icon: BookOpen },
    { label: "Results Uploaded", value: stats?.results || 0, icon: BarChart3 },
    { label: "Terms", value: stats?.terms || 0, icon: ClipboardCheck },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-card rounded-xl p-5 shadow-card">
          <card.icon className="text-primary mb-2" size={24} />
          <div className="text-2xl font-heading text-foreground">{card.value}</div>
          <div className="text-sm text-muted-foreground">{card.label}</div>
        </div>
      ))}
    </div>
  );
};

const generatePassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const ManageUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [generatedPassword] = useState(generatePassword);
  const [newUser, setNewUser] = useState({ email: "", full_name: "", role: "teacher", phone: "" });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: users } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, created_at");
      if (profileError) throw profileError;

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (roleError) throw roleError;

      const usersWithRoles = profiles?.map((profile: any) => {
        const userRole = roles?.find((r: any) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email || "",
          role: userRole?.role || "parent",
          created_at: profile.created_at,
        };
      }) || [];

      return usersWithRoles.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["all-classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const resetDialog = () => {
    setStep(1);
    setNewUser({ email: "", full_name: "", role: "teacher", phone: "" });
    setSelectedClasses([]);
    setCopied(false);
  };

  const createUser = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            email: newUser.email,
            password: generatedPassword,
            full_name: newUser.full_name,
            phone: newUser.phone || undefined,
            role: newUser.role,
          }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create user");
      }
      const result = await response.json();
      const newUserId: string = result.user?.id;

      // If teacher, assign to selected classes
      if (newUser.role === "teacher" && selectedClasses.length > 0 && newUserId) {
        await supabase.from("teacher_classes").insert(
          selectedClasses.map((classId) => ({ teacher_id: newUserId, class_id: classId }))
        );
      }
      return result;
    },
    onSuccess: () => {
      toast({ title: "Staff account created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setDialogOpen(false);
      resetDialog();
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      const { error: profileError } = await supabase.from("profiles")
        .update({ full_name: editing.full_name, phone: editing.phone || null })
        .eq("user_id", editing.user_id);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase.from("user_roles")
        .update({ role: editing.role })
        .eq("user_id", editing.user_id);
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      toast({ title: "User updated" });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleClass = (id: string) =>
    setSelectedClasses((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Users</h3>
        <div className="flex gap-2">
          <BulkCreateStaffUsers />
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetDialog(); }}>
            <DialogTrigger asChild>
              <Button className="hero-gradient"><Plus size={18} className="mr-2" />Add Staff</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {step === 1 ? "Staff Details" : step === 2 ? "Assign to Classes" : "Review & Create"}
                </DialogTitle>
              </DialogHeader>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="e.g. Mrs. Ada Okafor" />
                  </div>
                  <div>
                    <Label>Email Address *</Label>
                    <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="staff@school.com" />
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+234 xxx xxx xxxx" />
                  </div>
                  <div>
                    <Label>Role *</Label>
                    <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="creche_staff">Crèche Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full hero-gradient"
                    disabled={!newUser.full_name || !newUser.email}
                    onClick={() => setStep(newUser.role === "teacher" ? 2 : 3)}
                  >
                    Next <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select the classes this teacher will be assigned to.</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {classes?.map((cls: any) => (
                      <label key={cls.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedClasses.includes(cls.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(cls.id)}
                          onChange={() => toggleClass(cls.id)}
                          className="accent-primary"
                        />
                        <span className="text-sm font-medium text-foreground">{cls.name}</span>
                        {cls.description && <span className="text-xs text-muted-foreground ml-auto">{cls.description}</span>}
                      </label>
                    ))}
                    {!classes?.length && <p className="text-sm text-muted-foreground text-center py-4">No classes created yet.</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ChevronLeft size={16} className="mr-1" />Back</Button>
                    <Button className="flex-1 hero-gradient" onClick={() => setStep(3)}>
                      Next <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{newUser.full_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{newUser.email}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium capitalize">{newUser.role}</span></div>
                    {selectedClasses.length > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">Classes</span>
                        <span className="font-medium text-right">{classes?.filter((c: any) => selectedClasses.includes(c.id)).map((c: any) => c.name).join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Generated Password</Label>
                    <div className="flex gap-2 mt-1">
                      <Input readOnly value={generatedPassword} className="font-mono text-sm bg-muted" />
                      <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                        {copied ? <Check size={16} className="text-secondary" /> : <Copy size={16} />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Copy and share this password with the staff member. They can change it after logging in.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(newUser.role === "teacher" ? 2 : 1)} className="flex-1"><ChevronLeft size={16} className="mr-1" />Back</Button>
                    <Button className="flex-1 hero-gradient" onClick={() => createUser.mutate()} disabled={createUser.isPending}>
                      {createUser.isPending ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div className="text-xs text-muted-foreground bg-muted rounded p-2">{editing.email}</div>
            <div><Label>Full Name</Label><Input value={editing.full_name} onChange={e => setEditing({ ...editing, full_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editing.phone || ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="+234 xxx xxx xxxx" /></div>
            <div>
              <Label>Role</Label>
              <Select value={editing.role} onValueChange={v => setEditing({ ...editing, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="creche_staff">Crèche Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full hero-gradient" onClick={() => updateUser.mutate()} disabled={updateUser.isPending || !editing.full_name}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {users?.map((user: any) => (
              <tr key={user.id} className="border-t border-border">
                <td className="p-3 text-foreground">{user.full_name}</td>
                <td className="p-3 text-muted-foreground">{user.email || "—"}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-md text-xs font-semibold bg-accent/20 text-accent-foreground capitalize">
                    {user.role}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <button onClick={() => setEditing({ ...user })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageClasses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newClass, setNewClass] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState<any | null>(null);

  const { data: classes } = useQuery({
    queryKey: ["all-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addClass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("classes")
        .insert([{ name: newClass.name, description: newClass.description || null }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Class created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-classes"] });
      queryClient.invalidateQueries({ queryKey: ["all-classes-list"] });
      setNewClass({ name: "", description: "" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateClass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("classes")
        .update({ name: editing.name, description: editing.description || null })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Class updated" });
      queryClient.invalidateQueries({ queryKey: ["all-classes"] });
      queryClient.invalidateQueries({ queryKey: ["all-classes-list"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Classes</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient">
              <Plus size={18} className="mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Class Name</Label>
                <Input
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="e.g. Class 1A"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  placeholder="e.g. Class description"
                />
              </div>
              <Button
                onClick={() => addClass.mutate()}
                className="w-full hero-gradient"
                disabled={addClass.isPending || !newClass.name}
              >
                {addClass.isPending ? "Creating..." : "Create Class"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Class</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div><Label>Class Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
            <Button className="w-full hero-gradient" onClick={() => updateClass.mutate()} disabled={updateClass.isPending || !editing.name}>
              {updateClass.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {classes?.map((cls: any) => (
              <tr key={cls.id} className="border-t border-border">
                <td className="p-3 text-foreground">{cls.name}</td>
                <td className="p-3 text-muted-foreground">{cls.description || "—"}</td>
                <td className="p-3 text-muted-foreground">{new Date(cls.created_at).toLocaleDateString()}</td>
                <td className="p-3"><button onClick={() => setEditing({ ...cls })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageStudents = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  if (selectedStudentId) {
    return <StudentProfile studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />;
  }
  return <StudentList onSelect={setSelectedStudentId} />;
};

const StudentList = ({ onSelect }: { onSelect: (id: string) => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    first_name: "", last_name: "", class_id: "", gender: "",
    date_of_birth: "", school_section: "", admission_number: "",
  });

  const { data: students } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const students = data || [];

      // Build class name map separately
      const classIds = [...new Set(students.map((s: any) => s.class_id).filter(Boolean))];
      let classMap: Record<string, string> = {};
      if (classIds.length > 0) {
        const { data: classData } = await supabase.from("classes").select("id, name").in("id", classIds);
        (classData || []).forEach((c: any) => { classMap[c.id] = c.name; });
      }
      return students.map((s: any) => ({ ...s, className: classMap[s.class_id] || null }));
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["all-classes-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const addStudent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("students").insert([{
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        full_name: `${newStudent.first_name} ${newStudent.last_name}`.trim(),
        class_id: newStudent.class_id || null,
        gender: newStudent.gender || null,
        date_of_birth: newStudent.date_of_birth || null,
        school_section: newStudent.school_section || null,
        admission_number: newStudent.admission_number || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Student added" });
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
      setAddOpen(false);
      setNewStudent({ first_name: "", last_name: "", class_id: "", gender: "", date_of_birth: "", school_section: "", admission_number: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Students</h3>
        <Button className="hero-gradient" onClick={() => setAddOpen(true)}>
          <Plus size={18} className="mr-2" /> Add Student
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={newStudent.first_name} onChange={e => setNewStudent({ ...newStudent, first_name: e.target.value })} placeholder="First name" />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={newStudent.last_name} onChange={e => setNewStudent({ ...newStudent, last_name: e.target.value })} placeholder="Last name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class</Label>
                <Select value={newStudent.class_id} onValueChange={v => setNewStudent({ ...newStudent, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={newStudent.school_section} onValueChange={v => setNewStudent({ ...newStudent, school_section: v })}>
                  <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creche">Creche</SelectItem>
                    <SelectItem value="nursery">Nursery</SelectItem>
                    <SelectItem value="primary">Primary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender</Label>
                <Select value={newStudent.gender} onValueChange={v => setNewStudent({ ...newStudent, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={newStudent.date_of_birth} onChange={e => setNewStudent({ ...newStudent, date_of_birth: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Admission Number</Label>
              <Input value={newStudent.admission_number} onChange={e => setNewStudent({ ...newStudent, admission_number: e.target.value })} placeholder="e.g. IBS/2024/001" />
            </div>
            <Button className="w-full hero-gradient" onClick={() => addStudent.mutate()} disabled={addStudent.isPending || !newStudent.first_name || !newStudent.last_name}>
              {addStudent.isPending ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Photo</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Class</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Gender</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Admission No.</th>
              <th className="text-left p-3 font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {students?.map((student: any) => {
              const sName = student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Unnamed";
              return (
                <tr key={student.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => onSelect(student.id)}>
                  <td className="p-3">
                    {student.avatar_url
                      ? <img src={student.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{sName[0]}</div>
                    }
                  </td>
                  <td className="p-3 text-foreground font-medium">{sName}</td>
                  <td className="p-3 text-muted-foreground">{(student as any).className || "—"}</td>
                  <td className="p-3 text-muted-foreground capitalize">{student.gender || "—"}</td>
                  <td className="p-3 text-muted-foreground">{student.admission_number || "—"}</td>
                  <td className="p-3">
                    <span className="text-xs text-primary flex items-center gap-1 hover:underline">View <ChevronRight size={14} /></span>
                  </td>
                </tr>
              );
            })}
            {!students?.length && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No students yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StudentProfile = ({ studentId, onBack }: { studentId: string; onBack: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addParentOpen, setAddParentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [parentForm, setParentForm] = useState({ full_name: "", email: "", phone: "" });
  const [createdParent, setCreatedParent] = useState<{ email: string; password: string } | null>(null);
  const [addingParent, setAddingParent] = useState(false);

  const { data: allClassesList } = useQuery({
    queryKey: ["all-classes-for-edit"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").order("name");
      return data || [];
    },
  });

  const updateStudent = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("students").update({
        first_name: values.first_name,
        last_name: values.last_name,
        full_name: `${values.first_name} ${values.last_name}`.trim(),
        class_id: values.class_id || null,
        gender: values.gender || null,
        date_of_birth: values.date_of_birth || null,
        school_section: values.school_section || null,
        admission_number: values.admission_number || null,
        student_id: values.student_id || null,
      }).eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Student updated" });
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] });
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student-profile", studentId],
    retry: false,
    queryFn: async () => {
      // Fetch student without FK joins to avoid schema-cache issues
      const { data: student, error: studentError } = await supabase
        .from("students").select("*").eq("id", studentId).single();
      if (studentError) throw studentError;

      // Fetch class name separately if class_id exists
      let className: string | null = null;
      if (student?.class_id) {
        const { data: cls } = await supabase.from("classes").select("name").eq("id", student.class_id).single();
        className = cls?.name || null;
      }

      // Parent links
      const { data: parentLinks } = await supabase
        .from("parent_students").select("parent_id").eq("student_id", studentId);
      const parentIds = parentLinks?.map((l: any) => l.parent_id) || [];
      let parents: any[] = [];
      if (parentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles").select("user_id, full_name, phone").in("user_id", parentIds);
        parents = profilesData || [];
      }

      // Results without FK joins
      const { data: rawResults } = await supabase
        .from("results").select("*").eq("student_id", studentId)
        .order("created_at", { ascending: false }).limit(10);

      const results = rawResults || [];
      const subjectIds = [...new Set(results.map((r: any) => r.subject_id).filter(Boolean))];
      const termIds = [...new Set(results.map((r: any) => r.term_id).filter(Boolean))];

      const [subjectsRes, termsRes] = await Promise.all([
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] },
        termIds.length > 0 ? supabase.from("terms").select("id, name").in("id", termIds) : { data: [] },
      ]);
      const subjMap: Record<string, string> = {};
      const termMap: Record<string, string> = {};
      (subjectsRes.data || []).forEach((s: any) => { subjMap[s.id] = s.name; });
      (termsRes.data || []).forEach((t: any) => { termMap[t.id] = t.name; });

      return {
        student: { ...student, className },
        parents,
        results: results.map((r: any) => ({
          ...r,
          subjectName: subjMap[r.subject_id] || "—",
          termName: termMap[r.term_id] || "—",
        })),
      };
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const path = `student-${studentId}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from("profile-pictures").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("profile-pictures").getPublicUrl(path);
      await supabase.from("students").update({ avatar_url: urlData.publicUrl }).eq("id", studentId);
      queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] });
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
      toast({ title: "Photo updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAddParent = async () => {
    if (!parentForm.full_name || !parentForm.email) {
      toast({ title: "Name and email are required", variant: "destructive" } as any);
      return;
    }
    setAddingParent(true);
    const password = generatePassword();
    try {
      const { data: result, error } = await supabase.functions.invoke("create-user", {
        body: { full_name: parentForm.full_name, email: parentForm.email, phone: parentForm.phone, password, role: "parent" },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      const { error: linkError } = await supabase.from("parent_students").insert({
        parent_id: result.user.id,
        student_id: studentId,
      });
      if (linkError) throw linkError;

      setCreatedParent({ email: parentForm.email, password });
      setParentForm({ full_name: "", email: "", phone: "" });
      queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingParent(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }
  if (isError) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ChevronLeft size={18} /> Back to Students
        </button>
        <div className="bg-destructive/10 text-destructive rounded-xl p-6">
          <p className="font-semibold mb-1">Failed to load student profile</p>
          <p className="text-sm">{(error as any)?.message || "Unknown error"}</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { student, parents, results } = data;
  const sName = (student as any).full_name || `${(student as any).first_name || ""} ${(student as any).last_name || ""}`.trim() || "Student";
  const age = (student as any).date_of_birth
    ? `${new Date().getFullYear() - new Date((student as any).date_of_birth).getFullYear()} years`
    : null;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ChevronLeft size={18} /> Back to Students
      </button>

      {/* Header card */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
              {(student as any).avatar_url
                ? <img src={(student as any).avatar_url} alt={sName} className="w-full h-full object-cover" />
                : <span className="text-primary font-bold text-3xl">{sName[0]}</span>
              }
            </div>
            <label htmlFor="student-photo-upload" className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full cursor-pointer hover:bg-primary/80 transition">
              {isUploadingPhoto
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Upload size={14} />
              }
            </label>
            <input id="student-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-heading text-foreground">{sName}</h2>
                <p className="text-muted-foreground">{(student as any).className || "No class assigned"}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={() => {
                setEditForm({
                  first_name: (student as any).first_name || "",
                  last_name: (student as any).last_name || "",
                  class_id: (student as any).class_id || "",
                  gender: (student as any).gender || "",
                  date_of_birth: (student as any).date_of_birth || "",
                  school_section: (student as any).school_section || "",
                  admission_number: (student as any).admission_number || "",
                  student_id: (student as any).student_id || "",
                });
                setEditOpen(true);
              }}>
                <Pencil size={14} /> Edit
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(student as any).admission_number && <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">{(student as any).admission_number}</span>}
              {(student as any).gender && <span className="bg-muted text-xs px-2.5 py-1 rounded-full capitalize">{(student as any).gender}</span>}
              {age && <span className="bg-muted text-xs px-2.5 py-1 rounded-full">{age}</span>}
              {(student as any).school_section && <span className="bg-secondary/10 text-secondary text-xs px-2.5 py-1 rounded-full capitalize">{(student as any).school_section}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal info */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading text-foreground font-semibold mb-3">Personal Information</h4>
          <div className="space-y-2 text-sm">
            {[
              ["Full Name", sName],
              ["Gender", (student as any).gender ? (student as any).gender.charAt(0).toUpperCase() + (student as any).gender.slice(1) : "—"],
              ["Date of Birth", (student as any).date_of_birth ? new Date((student as any).date_of_birth).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"],
              ["Age", age || "—"],
              ["Section", (student as any).school_section ? (student as any).school_section.charAt(0).toUpperCase() + (student as any).school_section.slice(1) : "—"],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between border-b border-border pb-2 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Academic info */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading text-foreground font-semibold mb-3">Academic Information</h4>
          <div className="space-y-2 text-sm">
            {[
              ["Admission Number", (student as any).admission_number || "—"],
              ["Student ID", (student as any).student_id || "—"],
              ["Class", (student as any).className || "—"],
              ["Results on Record", `${results.length} entries`],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between border-b border-border pb-2 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parents / Guardians */}
      <div className="bg-card rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-heading text-foreground font-semibold">Parents / Guardians</h4>
          <Button size="sm" className="hero-gradient gap-2" onClick={() => { setAddParentOpen(true); setCreatedParent(null); }}>
            <UserPlus size={15} /> Add Parent/Guardian
          </Button>
        </div>
        {parents.length === 0
          ? <p className="text-sm text-muted-foreground">No parents linked yet. Use the button above to add one.</p>
          : <div className="space-y-2">
              {parents.map((p: any) => (
                <div key={p.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {(p.full_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.phone || "No phone on record"}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Recent results */}
      {results.length > 0 && (
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h4 className="font-heading text-foreground font-semibold mb-4">Results</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground">Subject</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Score /30</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Term</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2 font-medium">{r.subjectName}</td>
                    <td className="p-2 text-center font-semibold">{r.total_score ?? "—"}</td>
                    <td className="p-2 text-center font-bold text-primary">{r.grade_letter || "—"}</td>
                    <td className="p-2 text-muted-foreground capitalize text-xs">{r.result_type?.replace("_", " ") || "—"}</td>
                    <td className="p-2 text-muted-foreground text-xs">{r.termName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Student Profile</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
                <div><Label>Last Name</Label><Input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Class</Label>
                  <Select value={editForm.class_id} onValueChange={v => setEditForm({ ...editForm, class_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{allClassesList?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={editForm.school_section} onValueChange={v => setEditForm({ ...editForm, school_section: v })}>
                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creche">Creche</SelectItem>
                      <SelectItem value="nursery">Nursery</SelectItem>
                      <SelectItem value="primary">Primary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={editForm.gender} onValueChange={v => setEditForm({ ...editForm, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date of Birth</Label><Input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Admission Number</Label><Input value={editForm.admission_number} onChange={e => setEditForm({ ...editForm, admission_number: e.target.value })} placeholder="IBS/2024/001" /></div>
                <div><Label>Student ID</Label><Input value={editForm.student_id} onChange={e => setEditForm({ ...editForm, student_id: e.target.value })} placeholder="STU001" /></div>
              </div>
              <Button className="w-full hero-gradient" onClick={() => updateStudent.mutate(editForm)} disabled={updateStudent.isPending}>
                {updateStudent.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Parent Dialog */}
      <Dialog open={addParentOpen} onOpenChange={(open) => { setAddParentOpen(open); if (!open) setCreatedParent(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Parent / Guardian for {sName}</DialogTitle></DialogHeader>
          {createdParent ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <p className="font-semibold text-green-800 text-sm">Account created successfully!</p>
                <div className="bg-white border border-green-100 rounded p-3 font-mono text-sm space-y-1">
                  <p>Email: <strong>{createdParent.email}</strong></p>
                  <p>Password: <strong>{createdParent.password}</strong></p>
                </div>
                <p className="text-xs text-green-700">Share these credentials with the parent. They can log in at itainbellschool.com/login and change their password.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(`Email: ${createdParent.email}\nPassword: ${createdParent.password}`); toast({ title: "Copied to clipboard!" }); }}>
                  <Copy size={14} className="mr-2" /> Copy
                </Button>
                <Button className="flex-1 hero-gradient" onClick={() => { setAddParentOpen(false); setCreatedParent(null); }}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={parentForm.full_name} onChange={e => setParentForm({ ...parentForm, full_name: e.target.value })} placeholder="e.g. Mrs. Sarah Johnson" />
              </div>
              <div>
                <Label>Email Address *</Label>
                <Input type="email" value={parentForm.email} onChange={e => setParentForm({ ...parentForm, email: e.target.value })} placeholder="parent@email.com" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={parentForm.phone} onChange={e => setParentForm({ ...parentForm, phone: e.target.value })} placeholder="+234 800 000 0000" />
              </div>
              <p className="text-xs text-muted-foreground">A secure password will be auto-generated and shown to you after creation.</p>
              <Button className="w-full hero-gradient" onClick={handleAddParent} disabled={addingParent || !parentForm.full_name || !parentForm.email}>
                {addingParent ? "Creating account..." : "Create Parent Account"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ManageSubjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSubject, setNewSubject] = useState({ name: "", class_id: "", teacher_id: "" });
  const [editing, setEditing] = useState<any | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("name", { ascending: true });
      if (error) throw error;
      const rows = data || [];

      const classIds = [...new Set(rows.map((s: any) => s.class_id).filter(Boolean))];
      const teacherIds = [...new Set(rows.map((s: any) => s.teacher_id).filter(Boolean))];

      const [classRes, teacherRes] = await Promise.all([
        classIds.length > 0 ? supabase.from("classes").select("id, name").in("id", classIds) : { data: [] },
        teacherIds.length > 0 ? supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds) : { data: [] },
      ]);

      const classMap: Record<string, string> = {};
      const teacherMap: Record<string, string> = {};
      (classRes.data || []).forEach((c: any) => { classMap[c.id] = c.name; });
      (teacherRes.data || []).forEach((t: any) => { teacherMap[t.user_id] = t.full_name; });

      return rows.map((s: any) => ({ ...s, className: classMap[s.class_id] || null, teacherName: teacherMap[s.teacher_id] || null }));
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-for-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers-for-subjects"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
      const teacherIds = roles?.map((r: any) => r.user_id) || [];
      if (!teacherIds.length) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds).order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").insert([{
        name: newSubject.name,
        class_id: newSubject.class_id || null,
        teacher_id: newSubject.teacher_id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Subject added successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-subjects"] });
      setNewSubject({ name: "", class_id: "", teacher_id: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").update({
        name: editing.name,
        class_id: editing.class_id || null,
        teacher_id: editing.teacher_id || null,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Subject updated" });
      queryClient.invalidateQueries({ queryKey: ["all-subjects"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Subjects</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient"><Plus size={18} className="mr-2" />Add Subject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Subject</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Subject Name</Label>
                <Input value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} placeholder="e.g. Mathematics" />
              </div>
              <div>
                <Label>Class</Label>
                <Select value={newSubject.class_id} onValueChange={(v) => setNewSubject({ ...newSubject, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes?.map((cls: any) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Teacher</Label>
                <Select value={newSubject.teacher_id} onValueChange={(v) => setNewSubject({ ...newSubject, teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>{teachers?.map((t: any) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={() => addSubject.mutate()} className="w-full hero-gradient" disabled={addSubject.isPending || !newSubject.name}>
                {addSubject.isPending ? "Adding..." : "Add Subject"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Subject</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div><Label>Subject Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div>
              <Label>Class</Label>
              <Select value={editing.class_id || ""} onValueChange={v => setEditing({ ...editing, class_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes?.map((cls: any) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teacher</Label>
              <Select value={editing.teacher_id || ""} onValueChange={v => setEditing({ ...editing, teacher_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>{teachers?.map((t: any) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full hero-gradient" onClick={() => updateSubject.mutate()} disabled={updateSubject.isPending || !editing.name}>
              {updateSubject.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Class</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Teacher</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {subjects?.map((subject: any) => (
              <tr key={subject.id} className="border-t border-border">
                <td className="p-3 text-foreground">{subject.name}</td>
                <td className="p-3 text-muted-foreground">{subject.className || "—"}</td>
                <td className="p-3 text-muted-foreground">{subject.teacherName || "—"}</td>
                <td className="p-3"><button onClick={() => setEditing({ ...subject })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageTerms = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTerm, setNewTerm] = useState({ name: "", start_date: "", end_date: "", is_active: false });
  const [editing, setEditing] = useState<any | null>(null);

  const { data: terms } = useQuery({
    queryKey: ["all-terms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("terms").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addTerm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("terms").insert([{
        name: newTerm.name,
        start_date: newTerm.start_date || null,
        end_date: newTerm.end_date || null,
        is_active: newTerm.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Term created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-terms"] });
      setNewTerm({ name: "", start_date: "", end_date: "", is_active: false });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateTerm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("terms").update({
        name: editing.name,
        start_date: editing.start_date || null,
        end_date: editing.end_date || null,
        is_active: editing.is_active,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Term updated" });
      queryClient.invalidateQueries({ queryKey: ["all-terms"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Terms</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient"><Plus size={18} className="mr-2" />Add Term</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Term</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Term Name</Label>
                <Input value={newTerm.name} onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })} placeholder="e.g. First Term 2026" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={newTerm.start_date} onChange={(e) => setNewTerm({ ...newTerm, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={newTerm.end_date} onChange={(e) => setNewTerm({ ...newTerm, end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="active" checked={newTerm.is_active} onChange={(e) => setNewTerm({ ...newTerm, is_active: e.target.checked })} className="rounded" />
                <Label htmlFor="active" className="cursor-pointer">Make this term active</Label>
              </div>
              <Button onClick={() => addTerm.mutate()} className="w-full hero-gradient" disabled={addTerm.isPending || !newTerm.name}>
                {addTerm.isPending ? "Creating..." : "Create Term"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Term</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div><Label>Term Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={editing.start_date?.split("T")[0] || ""} onChange={e => setEditing({ ...editing, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={editing.end_date?.split("T")[0] || ""} onChange={e => setEditing({ ...editing, end_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="edit-active" checked={!!editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} className="rounded" />
              <Label htmlFor="edit-active" className="cursor-pointer">Active term</Label>
            </div>
            <Button className="w-full hero-gradient" onClick={() => updateTerm.mutate()} disabled={updateTerm.isPending || !editing.name}>
              {updateTerm.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Start Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">End Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {terms?.map((term: any) => (
              <tr key={term.id} className="border-t border-border">
                <td className="p-3 text-foreground">{term.name}</td>
                <td className="p-3 text-muted-foreground">{term.start_date ? new Date(term.start_date).toLocaleDateString() : "—"}</td>
                <td className="p-3 text-muted-foreground">{term.end_date ? new Date(term.end_date).toLocaleDateString() : "—"}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${term.is_active ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                    {term.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3"><button onClick={() => setEditing({ ...term })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageAdmissions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "waitlisted">("pending");
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admission-applications", filter],
    queryFn: async () => {
      let q = supabase.from("admission_applications").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("admission_applications").update({
        status,
        admin_notes: notes || null,
        reviewed_by: userData.user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: `Application ${vars.status}` });
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      setSelected(null);
      setNotes("");
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const STATUS_COLORS: Record<string, string> = {
    pending:    "bg-amber-100 text-amber-700",
    approved:   "bg-green-100 text-green-700",
    rejected:   "bg-red-100 text-red-700",
    waitlisted: "bg-blue-100 text-blue-700",
  };

  return (
    <div>
      {selected && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h4 className="font-heading text-foreground">Application Details</h4>
              <button onClick={() => { setSelected(null); setNotes(""); }}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  ["Child Name", selected.child_full_name],
                  ["Gender", selected.gender || "—"],
                  ["Date of Birth", selected.date_of_birth ? new Date(selected.date_of_birth + "T00:00:00").toLocaleDateString() : "—"],
                  ["Section", selected.school_section || "—"],
                  ["Class Applying", selected.class_applying_for || "—"],
                  ["Previous School", selected.previous_school || "—"],
                  ["Parent Name", selected.parent_name],
                  ["Parent Email", selected.parent_email],
                  ["Parent Phone", selected.parent_phone || "—"],
                  ["Applied", new Date(selected.created_at).toLocaleDateString()],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-muted-foreground text-xs">{label}</div>
                    <div className="font-medium text-foreground">{val}</div>
                  </div>
                ))}
              </div>
              {selected.address && (
                <div>
                  <div className="text-muted-foreground text-xs">Address</div>
                  <div className="font-medium text-foreground">{selected.address}</div>
                </div>
              )}
              {selected.additional_info && (
                <div>
                  <div className="text-muted-foreground text-xs">Additional Info</div>
                  <div className="text-foreground bg-muted rounded p-2">{selected.additional_info}</div>
                </div>
              )}
              <div>
                <Label className="text-xs">Admin Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes about this application..." rows={2} className="mt-1" />
              </div>
              {selected.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus.mutate({ id: selected.id, status: "approved" })} disabled={updateStatus.isPending}>
                    <Check size={16} className="mr-1" /> Approve
                  </Button>
                  <Button className="flex-1" variant="outline" onClick={() => updateStatus.mutate({ id: selected.id, status: "waitlisted" })} disabled={updateStatus.isPending}>
                    Waitlist
                  </Button>
                  <Button className="flex-1" variant="destructive" onClick={() => updateStatus.mutate({ id: selected.id, status: "rejected" })} disabled={updateStatus.isPending}>
                    <X size={16} className="mr-1" /> Reject
                  </Button>
                </div>
              )}
              {selected.status !== "pending" && (
                <p className="text-sm text-muted-foreground pt-2">
                  Status: <span className={`font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-lg font-heading text-foreground">Admission Applications</h3>
        <div className="flex gap-2 flex-wrap">
          {(["pending", "approved", "waitlisted", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-card rounded-xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Child</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Section</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Parent</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Applied</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {applications?.map((app: any) => (
                <tr key={app.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium text-foreground">{app.child_full_name}</td>
                  <td className="p-3 text-muted-foreground capitalize">{app.school_section || "—"}</td>
                  <td className="p-3 text-muted-foreground">{app.parent_name}</td>
                  <td className="p-3 text-muted-foreground">{app.parent_email}</td>
                  <td className="p-3 text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[app.status] || "bg-muted text-muted-foreground"}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => { setSelected(app); setNotes(app.admin_notes || ""); }} className="text-xs text-primary hover:underline font-medium">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!applications?.length && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No {filter} applications.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const EVENT_TYPES = ["holiday", "school_event", "sports_day", "exam", "parent_meeting", "other"] as const;

const ManageEvents = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEvent, setNewEvent] = useState({
    title: "", description: "", event_type: "school_event",
    start_date: "", end_date: "", start_time: "", end_time: "", location: "", is_public: true,
  });
  const [editing, setEditing] = useState<any | null>(null);

  const { data: events } = useQuery({
    queryKey: ["all-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("events").insert([{ ...newEvent, created_by: userData.user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
      setNewEvent({ title: "", description: "", event_type: "school_event", start_date: "", end_date: "", start_time: "", end_time: "", location: "", is_public: true });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").update({
        title: editing.title,
        description: editing.description || null,
        event_type: editing.event_type,
        start_date: editing.start_date || null,
        end_date: editing.end_date || null,
        start_time: editing.start_time || null,
        end_time: editing.end_time || null,
        location: editing.location || null,
        is_public: editing.is_public,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event updated" });
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event deleted" });
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const EventFormFields = ({ state, setState }: { state: any; setState: (v: any) => void }) => (
    <div className="space-y-4">
      <div>
        <Label>Event Title</Label>
        <Input value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} placeholder="e.g. Sports Day" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={state.description} onChange={(e) => setState({ ...state, description: e.target.value })} placeholder="Event details..." rows={2} />
      </div>
      <div>
        <Label>Event Type</Label>
        <Select value={state.event_type} onValueChange={(v) => setState({ ...state, event_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Start Date</Label><Input type="date" value={state.start_date} onChange={(e) => setState({ ...state, start_date: e.target.value })} /></div>
        <div><Label>End Date</Label><Input type="date" value={state.end_date} onChange={(e) => setState({ ...state, end_date: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Start Time (optional)</Label><Input type="time" value={state.start_time} onChange={(e) => setState({ ...state, start_time: e.target.value })} /></div>
        <div><Label>End Time (optional)</Label><Input type="time" value={state.end_time} onChange={(e) => setState({ ...state, end_time: e.target.value })} /></div>
      </div>
      <div><Label>Location</Label><Input value={state.location} onChange={(e) => setState({ ...state, location: e.target.value })} placeholder="e.g. School Grounds" /></div>
      <div className="flex items-center space-x-2">
        <input type="checkbox" id="event-public" checked={!!state.is_public} onChange={e => setState({ ...state, is_public: e.target.checked })} className="rounded" />
        <Label htmlFor="event-public" className="cursor-pointer">Visible to all users</Label>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Events</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient"><Plus size={18} className="mr-2" />Add Event</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Event</DialogTitle></DialogHeader>
            <EventFormFields state={newEvent} setState={setNewEvent} />
            <Button onClick={() => addEvent.mutate()} className="w-full hero-gradient mt-2" disabled={addEvent.isPending || !newEvent.title}>
              {addEvent.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          {editing && <>
            <EventFormFields state={editing} setState={setEditing} />
            <Button className="w-full hero-gradient mt-2" onClick={() => updateEvent.mutate()} disabled={updateEvent.isPending || !editing.title}>
              {updateEvent.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </>}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Location</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Public</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {events?.map((event: any) => (
              <tr key={event.id} className="border-t border-border">
                <td className="p-3 text-foreground font-medium">{event.title}</td>
                <td className="p-3 text-muted-foreground capitalize">{event.event_type?.replace("_", " ")}</td>
                <td className="p-3 text-muted-foreground">
                  {event.start_date ? new Date(event.start_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="p-3 text-muted-foreground">{event.location || "—"}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.is_public ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {event.is_public ? "Yes" : "No"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditing({
                      ...event,
                      start_date: event.start_date || "",
                      end_date: event.end_date || "",
                      start_time: event.start_time || "",
                      end_time: event.end_time || "",
                      description: event.description || "",
                      location: event.location || "",
                    })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => { if (confirm("Delete this event?")) deleteEvent.mutate(event.id); }} className="text-destructive hover:opacity-70 transition-opacity"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!events?.length && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No events yet. Add your first event above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getGradeLetterAdmin = (score: number): string => {
  if (score >= 28.5) return "A+";
  if (score >= 27.0) return "A";
  if (score >= 25.5) return "B+";
  if (score >= 24.0) return "B";
  if (score >= 22.5) return "C+";
  if (score >= 21.0) return "C";
  if (score >= 18.0) return "D";
  return "E";
};

const ViewAllResults = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reportCard, setReportCard] = useState<{ studentId: string; termId: string; resultType: "mid_term" | "end_of_term" } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: allData } = useQuery({
    queryKey: ["all-results-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("results").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];

      const studentIds = [...new Set(rows.map((r: any) => r.student_id).filter(Boolean))];
      const subjectIds = [...new Set(rows.map((r: any) => r.subject_id).filter(Boolean))];
      const termIds = [...new Set(rows.map((r: any) => r.term_id).filter(Boolean))];

      const [studentRes, subjectRes, termRes] = await Promise.all([
        studentIds.length > 0 ? supabase.from("students").select("id, first_name, last_name").in("id", studentIds) : { data: [] },
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] },
        termIds.length > 0 ? supabase.from("terms").select("id, name").in("id", termIds) : { data: [] },
      ]);

      const studentMap: Record<string, any> = {};
      const subjectMap: Record<string, string> = {};
      const termMap: Record<string, string> = {};
      (studentRes.data || []).forEach((s: any) => { studentMap[s.id] = s; });
      (subjectRes.data || []).forEach((s: any) => { subjectMap[s.id] = s.name; });
      (termRes.data || []).forEach((t: any) => { termMap[t.id] = t.name; });

      return rows.map((r: any) => ({
        ...r,
        studentData: studentMap[r.student_id] || null,
        subjectName: subjectMap[r.subject_id] || "—",
        termName: termMap[r.term_id] || "—",
      }));
    },
  });

  const results = allData || [];

  const updateResult = useMutation({
    mutationFn: async () => {
      const score = parseFloat(editing.total_score) || 0;
      const { error } = await supabase.from("results").update({
        total_score: score,
        grade_letter: getGradeLetterAdmin(score),
        result_type: editing.result_type,
        teacher_comments: editing.teacher_comments || null,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Result updated" });
      queryClient.invalidateQueries({ queryKey: ["all-results-admin"] });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteResult = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Result deleted" });
      queryClient.invalidateQueries({ queryKey: ["all-results-admin"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const studentTermPairs = Array.from(
    new Map(
      results.map((r: any) => [`${r.student_id}|${r.term_id}`, {
        studentId: r.student_id, termId: r.term_id,
        studentName: r.studentData ? `${r.studentData.first_name} ${r.studentData.last_name}`.trim() : "Student",
        termName: r.termName,
      }])
    ).values()
  );

  const editScore = parseFloat(editing?.total_score) || 0;

  return (
    <div>
      {reportCard && (
        <ReportCard studentId={reportCard.studentId} termId={reportCard.termId} resultType={reportCard.resultType} onClose={() => setReportCard(null)} />
      )}

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Result</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted rounded p-3">
              <span className="font-medium text-foreground">{editing.studentData ? `${editing.studentData.first_name} ${editing.studentData.last_name}` : "Student"}</span>
              {" — "}{editing.subjectName}{" — "}{editing.termName}
            </div>
            <div>
              <Label>Result Type</Label>
              <Select value={editing.result_type} onValueChange={v => setEditing({ ...editing, result_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mid_term">Mid Term</SelectItem>
                  <SelectItem value="end_of_term">End of Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Score (out of 30)</Label>
              <Input type="number" step="0.5" min="0" max="30" value={editing.total_score} onChange={e => setEditing({ ...editing, total_score: e.target.value })} />
              {editing.total_score && (
                <p className="text-xs mt-1 font-semibold text-muted-foreground">Grade: {getGradeLetterAdmin(editScore)}</p>
              )}
            </div>
            <div>
              <Label>Teacher Comment</Label>
              <Textarea value={editing.teacher_comments || ""} onChange={e => setEditing({ ...editing, teacher_comments: e.target.value })} rows={2} placeholder="Optional comment..." />
            </div>
            <Button className="w-full hero-gradient" onClick={() => updateResult.mutate()} disabled={updateResult.isPending}>
              {updateResult.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h3 className="text-lg font-heading text-foreground">All Results</h3>
        {studentTermPairs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {studentTermPairs.map((pair: any) => (
              <span key={`${pair.studentId}|${pair.termId}`} className="flex gap-1">
                <button onClick={() => setReportCard({ ...pair, resultType: "mid_term" })} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                  <Printer size={12} /> {pair.studentName} (Mid)
                </button>
                <button onClick={() => setReportCard({ ...pair, resultType: "end_of_term" })} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors font-medium">
                  <Printer size={12} /> End Term
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Score /30</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {results.map((result: any) => (
              <tr key={result.id} className="border-t border-border">
                <td className="p-3 text-foreground">
                  {result.studentData ? `${result.studentData.first_name} ${result.studentData.last_name}` : "—"}
                </td>
                <td className="p-3 text-muted-foreground">{result.subjectName}</td>
                <td className="p-3 text-foreground font-semibold">{result.total_score ?? "—"}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                    result.grade_letter?.startsWith("A") ? "bg-purple-100 text-purple-700"
                    : result.grade_letter?.startsWith("B") ? "bg-green-100 text-green-700"
                    : result.grade_letter?.startsWith("C") ? "bg-blue-100 text-blue-700"
                    : result.grade_letter === "D" ? "bg-orange-100 text-orange-700"
                    : "bg-red-100 text-red-700"
                  }`}>
                    {result.grade_letter || "—"}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground text-xs capitalize">{result.result_type?.replace("_", " ") || "—"}</td>
                <td className="p-3 text-muted-foreground">{result.termName}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditing({ ...result })} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => { if (confirm("Delete this result?")) deleteResult.mutate(result.id); }} className="text-destructive hover:opacity-70 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!results.length && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No results yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
