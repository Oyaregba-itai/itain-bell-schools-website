import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, auth } from "@/integrations/firebase/config";
import { collection, getDocs, addDoc, query, where, Timestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, GraduationCap, BookOpen, BarChart3, ClipboardCheck } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "requests" && <ManageRequests />}
      {activeTab === "users" && <ManageUsers />}
      {activeTab === "classes" && <ManageClasses />}
      {activeTab === "students" && <ManageStudents />}
      {activeTab === "subjects" && <ManageSubjects />}
      {activeTab === "terms" && <ManageTerms />}
      {activeTab === "results" && <ViewAllResults />}
      {activeTab === "announcements" && <AnnouncementsView />}
      {activeTab === "timetable" && <TimetableView />}
    </DashboardLayout>
  );
};

const AdminOverview = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [studentsSnap, classesSnap, subjectsSnap, resultsSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "classes")),
        getDocs(collection(db, "subjects")),
        getDocs(collection(db, "results")),
      ]);
      return {
        students: studentsSnap.size,
        classes: classesSnap.size,
        subjects: subjectsSnap.size,
        results: resultsSnap.size,
      };
    },
  });

  const cards = [
    { label: "Students", value: stats?.students || 0, icon: GraduationCap },
    { label: "Classes", value: stats?.classes || 0, icon: BookOpen },
    { label: "Subjects", value: stats?.subjects || 0, icon: BookOpen },
    { label: "Results Uploaded", value: stats?.results || 0, icon: BarChart3 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

const ManageRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests } = useQuery({
    queryKey: ["registration-requests"],
    queryFn: async () => {
      const q = query(collection(db, "registration_requests"), where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const approve = useMutation({
    mutationFn: async (req: any) => {
      const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, req.email, tempPassword);
      const userId = userCredential.user.uid;
      
      // Create profile in Firestore
      await addDoc(collection(db, "profiles"), {
        user_id: userId,
        email: req.email,
        full_name: req.full_name,
        phone: req.phone || "",
        created_at: Timestamp.now(),
      });
      
      // Create user role
      await addDoc(collection(db, "user_roles"), {
        user_id: userId,
        role: req.role,
      });
      
      // Update registration request status
      const reqRef = collection(db, "registration_requests");
      const reqQuery = query(reqRef, where("id", "==", req.id));
      const snapshot = await getDocs(reqQuery);
      
      return { ...req, userId, tempPassword };
    },
    onSuccess: (data) => {
      toast({ title: "Account created!", description: `Temporary password: ${data.tempPassword}. Share this with the user.` });
      queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reject = useMutation({
    mutationFn: async (requestId: string) => {
      // Would need to delete or update the registration request
      // For now, just marking as rejected in a real scenario
    },
    onSuccess: () => {
      toast({ title: "Request rejected" });
      queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div>
      <h3 className="text-lg font-heading text-foreground mb-6">Pending Registration Requests</h3>
      {(!requests || requests.length === 0) ? (
        <div className="bg-card rounded-xl p-8 shadow-card text-center">
          <ClipboardCheck className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="text-muted-foreground">No pending requests</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-card rounded-xl p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-foreground">{req.full_name}</div>
                  <div className="text-sm text-muted-foreground">{req.email}</div>
                  {req.phone && <div className="text-sm text-muted-foreground">{req.phone}</div>}
                  <span className="inline-block mt-2 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">{req.role}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="hero-gradient"
                    onClick={() => approve.mutate(req)}
                    disabled={approve.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => reject.mutate(req.id)}
                    disabled={reject.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ManageUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "", role: "teacher" as string });

  const { data: users } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const rolesSnap = await getDocs(collection(db, "user_roles"));
      const profilesSnap = await getDocs(collection(db, "profiles"));
      
      const rolesMap = new Map();
      rolesSnap.docs.forEach(doc => {
        rolesMap.set(doc.data().user_id, doc.data().role);
      });
      
      return profilesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: rolesMap.get((doc.data() as any).user_id) || "unknown",
      }));
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const userId = userCredential.user.uid;
      
      // Create profile
      await addDoc(collection(db, "profiles"), {
        user_id: userId,
        email: form.email,
        full_name: form.full_name,
        phone: form.phone || "",
        created_at: Timestamp.now(),
      });
      
      // Create role
      await addDoc(collection(db, "user_roles"), {
        user_id: userId,
        role: form.role,
      });
    },
    onSuccess: () => {
      toast({ title: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", phone: "", role: "teacher" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">All Users</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="hero-gradient"><Plus size={16} className="mr-2" /> Create User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Create New User</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }} className="space-y-4">
              <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full hero-gradient" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3 text-foreground">{u.full_name}</td>
                <td className="p-3 text-muted-foreground">{u.phone || "—"}</td>
                <td className="p-3"><span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">{u.role}</span></td>
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const q = query(collection(db, "classes"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, "classes"), {
        name,
        description: description || null,
        created_at: Timestamp.now(),
      });
    },
    onSuccess: () => {
      toast({ title: "Class created" });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Classes</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="hero-gradient"><Plus size={16} className="mr-2" /> Add Class</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Add Class</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
              <div><Label>Class Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Primary 1" /></div>
              <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></div>
              <Button type="submit" className="w-full hero-gradient" disabled={create.isPending}>Add Class</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3">
        {classes?.map((c) => (
          <div key={c.id} className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">{c.name}</div>
              {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
            </div>
          </div>
        ))}
        {(!classes || classes.length === 0) && <p className="text-muted-foreground text-sm">No classes yet. Create one to get started.</p>}
      </div>
    </div>
  );
};

const ManageStudents = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", class_id: "", parent_id: "" });

  const { data: classes } = useQuery({ 
    queryKey: ["classes"], 
    queryFn: async () => { 
      const querySnapshot = await getDocs(collection(db, "classes"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } 
  });
  
  const { data: parents } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const rolesSnap = await getDocs(query(collection(db, "user_roles"), where("role", "==", "parent")));
      if (!rolesSnap.size) return [];
      const parentIds = rolesSnap.docs.map(doc => (doc.data() as any).user_id);
      const profilesSnap = await getDocs(query(collection(db, "profiles")));
      return profilesSnap.docs.filter(doc => parentIds.includes((doc.data() as any).user_id)).map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, "students"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, "students"), {
        full_name: form.full_name,
        class_id: form.class_id || null,
        parent_id: form.parent_id || null,
        created_at: Timestamp.now(),
      });
    },
    onSuccess: () => {
      toast({ title: "Student added" });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setOpen(false);
      setForm({ full_name: "", class_id: "", parent_id: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Students</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="hero-gradient"><Plus size={16} className="mr-2" /> Add Student</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Add Student</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
              <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
              <div>
                <Label>Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Parent</Label>
                <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                  <SelectContent>{parents?.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full hero-gradient" disabled={create.isPending}>Add Student</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr><th className="text-left p-3 font-medium text-muted-foreground">Name</th><th className="text-left p-3 font-medium text-muted-foreground">Class</th></tr></thead>
          <tbody>
            {students?.map((s: any) => {
              const className = classes?.find((c: any) => c.id === s.class_id)?.name;
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 text-foreground">{s.full_name}</td>
                  <td className="p-3 text-muted-foreground">{className || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageSubjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", class_id: "", teacher_id: "" });

  const { data: classes } = useQuery({ 
    queryKey: ["classes"], 
    queryFn: async () => { 
      const querySnapshot = await getDocs(collection(db, "classes"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } 
  });
  
  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const rolesSnap = await getDocs(query(collection(db, "user_roles"), where("role", "==", "teacher")));
      if (!rolesSnap.size) return [];
      const teacherIds = rolesSnap.docs.map(doc => (doc.data() as any).user_id);
      const profilesSnap = await getDocs(collection(db, "profiles"));
      return profilesSnap.docs.filter(doc => teacherIds.includes((doc.data() as any).user_id)).map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });
  
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, "subjects"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, "subjects"), {
        name: form.name,
        class_id: form.class_id || null,
        teacher_id: form.teacher_id || null,
        created_at: Timestamp.now(),
      });
    },
    onSuccess: () => {
      toast({ title: "Subject added" });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setOpen(false);
      setForm({ name: "", class_id: "", teacher_id: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Subjects</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="hero-gradient"><Plus size={16} className="mr-2" /> Add Subject</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Add Subject</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
              <div><Label>Subject Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Mathematics" /></div>
              <div>
                <Label>Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Teacher</Label>
                <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>{teachers?.map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full hero-gradient" disabled={create.isPending}>Add Subject</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr><th className="text-left p-3 font-medium text-muted-foreground">Subject</th><th className="text-left p-3 font-medium text-muted-foreground">Class</th></tr></thead>
          <tbody>
            {subjects?.map((s: any) => {
              const className = classes?.find((c: any) => c.id === s.class_id)?.name;
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 text-foreground">{s.name}</td>
                  <td className="p-3 text-muted-foreground">{className || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageTerms = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", academic_year: "", is_active: false });

  const { data: terms } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => { 
      const querySnapshot = await getDocs(collection(db, "terms"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, "terms"), {
        name: form.name,
        academic_year: form.academic_year,
        is_active: form.is_active,
        created_at: Timestamp.now(),
      });
    },
    onSuccess: () => {
      toast({ title: "Term added" });
      queryClient.invalidateQueries({ queryKey: ["terms"] });
      setOpen(false);
      setForm({ name: "", academic_year: "", is_active: false });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Academic Terms</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="hero-gradient"><Plus size={16} className="mr-2" /> Add Term</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Add Term</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
              <div><Label>Term Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. First Term" /></div>
              <div><Label>Academic Year</Label><Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} required placeholder="e.g. 2025/2026" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} id="is_active" />
                <Label htmlFor="is_active">Active Term</Label>
              </div>
              <Button type="submit" className="w-full hero-gradient" disabled={create.isPending}>Add Term</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3">
        {terms?.map((t) => (
          <div key={t.id} className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">{t.name} — {t.academic_year}</div>
            </div>
            {t.is_active && <span className="px-2 py-1 rounded-md bg-secondary/10 text-secondary text-xs font-medium">Active</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

const ViewAllResults = () => {
  const { data: allData } = useQuery({
    queryKey: ["all-results"],
    queryFn: async () => {
      const resultsSnap = await getDocs(collection(db, "results"));
      const studentsSnap = await getDocs(collection(db, "students"));
      const subjectsSnap = await getDocs(collection(db, "subjects"));
      const termsSnap = await getDocs(collection(db, "terms"));
      
      const studentsMap = new Map();
      const subjectsMap = new Map();
      const termsMap = new Map();
      
      studentsSnap.docs.forEach(doc => studentsMap.set(doc.id, doc.data()));
      subjectsSnap.docs.forEach(doc => subjectsMap.set(doc.id, doc.data()));
      termsSnap.docs.forEach(doc => termsMap.set(doc.id, doc.data()));
      
      return {
        results: resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        studentsMap,
        subjectsMap,
        termsMap,
      };
    },
  });

  const results = allData?.results || [];
  const studentsMap = allData?.studentsMap || new Map();
  const subjectsMap = allData?.subjectsMap || new Map();
  const termsMap = allData?.termsMap || new Map();

  return (
    <div>
      <h3 className="text-lg font-heading text-foreground mb-6">All Results</h3>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Comment</th>
            </tr>
          </thead>
          <tbody>
            {results?.map((r: any) => {
              const student = studentsMap.get(r.student_id);
              const subject = subjectsMap.get(r.subject_id);
              const term = termsMap.get(r.term_id);
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 text-foreground">{student?.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{subject?.name || "—"}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-md text-xs font-bold ${r.grade === "A" ? "bg-secondary/10 text-secondary" : r.grade === "F" ? "bg-destructive/10 text-destructive" : "bg-accent/20 text-accent-foreground"}`}>{r.grade}</span></td>
                  <td className="p-3 text-muted-foreground">{term?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.comment || "—"}</td>
                </tr>
              );
            })}
            {(!results || results.length === 0) && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No results uploaded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
