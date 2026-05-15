import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { BulkCreateStaffUsers } from "@/components/BulkCreateStaffUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, GraduationCap, BookOpen, BarChart3, ClipboardCheck, MessageCircle, UserPlus } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";
import MessagingView from "@/components/MessagingView";
import GroupMessagingView from "@/components/GroupMessagingView";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "users" && <ManageUsers />}
      {activeTab === "classes" && <ManageClasses />}
      {activeTab === "students" && <ManageStudents />}
      {activeTab === "subjects" && <ManageSubjects />}
      {activeTab === "terms" && <ManageTerms />}
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

const ManageUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newUser, setNewUser] = useState({ email: "", full_name: "", role: "teacher" });

  const { data: users } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      // Get profiles with their roles
      // Note: email column may not exist yet, so we'll fetch without it for now
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, created_at");
      
      if (profileError) throw profileError;

      // Get all user roles
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (roleError) throw roleError;

      // Combine profiles with their roles
      const usersWithRoles = profiles?.map((profile: any) => {
        const userRole = roles?.find((r: any) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: "", // Will be filled from profiles if available
          role: userRole?.role || "parent",
          created_at: profile.created_at,
        };
      }) || [];

      return usersWithRoles.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      // Call the create-user edge function to create auth user
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: newUser.email,
            password: Math.random().toString(36).slice(-12),
            full_name: newUser.full_name,
            role: newUser.role,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }
    },
    onSuccess: () => {
      toast({ title: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setNewUser({ email: "", full_name: "", role: "teacher" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Users</h3>
        <div className="flex gap-2">
          <BulkCreateStaffUsers />
          <Dialog>
            <DialogTrigger asChild>
              <Button className="hero-gradient">
                <Plus size={18} className="mr-2" />
                Add User
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="creche_staff">Creche Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createUser.mutate()}
                className="w-full hero-gradient"
                disabled={createUser.isPending}
              >
                {createUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user: any) => (
              <tr key={user.id} className="border-t border-border">
                <td className="p-3 text-foreground">{user.full_name}</td>
                <td className="p-3 text-muted-foreground">{user.email}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-md text-xs font-semibold bg-accent/20 text-accent-foreground">
                    {user.role}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
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
  const [newClass, setNewClass] = useState({ name: "", level: "" });

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
        .insert([{ name: newClass.name, level: parseInt(newClass.level) || null }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Class created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-classes"] });
      setNewClass({ name: "", level: "" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
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
                <Label>Level (optional)</Label>
                <Input
                  type="number"
                  value={newClass.level}
                  onChange={(e) => setNewClass({ ...newClass, level: e.target.value })}
                  placeholder="e.g. 1"
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

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Level</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody>
            {classes?.map((cls: any) => (
              <tr key={cls.id} className="border-t border-border">
                <td className="p-3 text-foreground">{cls.name}</td>
                <td className="p-3 text-muted-foreground">{cls.level || "—"}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(cls.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageStudents = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newStudent, setNewStudent] = useState({
    first_name: "",
    last_name: "",
    student_id: "",
    class_id: "",
    date_of_birth: "",
  });

  const { data: students } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes:class_id(name)")
        .order("first_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-for-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addStudent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("students").insert([
        {
          first_name: newStudent.first_name,
          last_name: newStudent.last_name,
          student_id: newStudent.student_id,
          class_id: newStudent.class_id,
          date_of_birth: newStudent.date_of_birth || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Student added successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
      setNewStudent({ first_name: "", last_name: "", student_id: "", class_id: "", date_of_birth: "" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Students</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient">
              <Plus size={18} className="mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={newStudent.last_name}
                    onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Student ID</Label>
                <Input
                  value={newStudent.student_id}
                  onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                  placeholder="e.g. STU001"
                />
              </div>
              <div>
                <Label>Class</Label>
                <Select value={newStudent.class_id} onValueChange={(v) => setNewStudent({ ...newStudent, class_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Birth (optional)</Label>
                <Input
                  type="date"
                  value={newStudent.date_of_birth}
                  onChange={(e) => setNewStudent({ ...newStudent, date_of_birth: e.target.value })}
                />
              </div>
              <Button
                onClick={() => addStudent.mutate()}
                className="w-full hero-gradient"
                disabled={addStudent.isPending || !newStudent.first_name || !newStudent.last_name}
              >
                {addStudent.isPending ? "Adding..." : "Add Student"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Student ID</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Class</th>
              <th className="text-left p-3 font-medium text-muted-foreground">DOB</th>
            </tr>
          </thead>
          <tbody>
            {students?.map((student: any) => (
              <tr key={student.id} className="border-t border-border">
                <td className="p-3 text-foreground">
                  {student.first_name} {student.last_name}
                </td>
                <td className="p-3 text-muted-foreground">{student.student_id}</td>
                <td className="p-3 text-muted-foreground">{student.classes?.name || "—"}</td>
                <td className="p-3 text-muted-foreground">
                  {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageSubjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSubject, setNewSubject] = useState({ name: "", class_id: "", teacher_id: "" });

  const { data: subjects } = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*, classes:class_id(name), users:teacher_id(full_name)")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-for-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers-for-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "teacher");
      if (error) throw error;
      return data || [];
    },
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").insert([
        {
          name: newSubject.name,
          class_id: newSubject.class_id,
          teacher_id: newSubject.teacher_id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Subject added successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-subjects"] });
      setNewSubject({ name: "", class_id: "", teacher_id: "" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Subjects</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient">
              <Plus size={18} className="mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Subject Name</Label>
                <Input
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div>
                <Label>Class</Label>
                <Select value={newSubject.class_id} onValueChange={(v) => setNewSubject({ ...newSubject, class_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Teacher</Label>
                <Select value={newSubject.teacher_id} onValueChange={(v) => setNewSubject({ ...newSubject, teacher_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => addSubject.mutate()}
                className="w-full hero-gradient"
                disabled={addSubject.isPending || !newSubject.name}
              >
                {addSubject.isPending ? "Adding..." : "Add Subject"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Class</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Teacher</th>
            </tr>
          </thead>
          <tbody>
            {subjects?.map((subject: any) => (
              <tr key={subject.id} className="border-t border-border">
                <td className="p-3 text-foreground">{subject.name}</td>
                <td className="p-3 text-muted-foreground">{subject.classes?.name || "—"}</td>
                <td className="p-3 text-muted-foreground">{subject.users?.full_name || "—"}</td>
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

  const { data: terms } = useQuery({
    queryKey: ["all-terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addTerm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("terms").insert([
        {
          name: newTerm.name,
          start_date: newTerm.start_date,
          end_date: newTerm.end_date,
          is_active: newTerm.is_active,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Term created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-terms"] });
      setNewTerm({ name: "", start_date: "", end_date: "", is_active: false });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Terms</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient">
              <Plus size={18} className="mr-2" />
              Add Term
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Term</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Term Name</Label>
                <Input
                  value={newTerm.name}
                  onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                  placeholder="e.g. First Term 2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newTerm.start_date}
                    onChange={(e) => setNewTerm({ ...newTerm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newTerm.end_date}
                    onChange={(e) => setNewTerm({ ...newTerm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={newTerm.is_active}
                  onChange={(e) => setNewTerm({ ...newTerm, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Make this term active
                </Label>
              </div>
              <Button
                onClick={() => addTerm.mutate()}
                className="w-full hero-gradient"
                disabled={addTerm.isPending || !newTerm.name}
              >
                {addTerm.isPending ? "Creating..." : "Create Term"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Start Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">End Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {terms?.map((term: any) => (
              <tr key={term.id} className="border-t border-border">
                <td className="p-3 text-foreground">{term.name}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(term.start_date).toLocaleDateString()}
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(term.end_date).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      term.is_active
                        ? "bg-secondary/10 text-secondary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {term.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManageEvents = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "school_event",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    location: "",
    is_public: true,
  });

  const { data: events } = useQuery({
    queryKey: ["all-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("events").insert([
        {
          ...newEvent,
          created_by: userData.user?.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event created successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
      setNewEvent({
        title: "",
        description: "",
        event_type: "school_event",
        start_date: "",
        end_date: "",
        start_time: "",
        end_time: "",
        location: "",
        is_public: true,
      });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Manage Events</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="hero-gradient">
              <Plus size={18} className="mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Event Title</Label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g. Sports Day"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event details..."
                />
              </div>
              <div>
                <Label>Event Type</Label>
                <Select
                  value={newEvent.event_type}
                  onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="school_event">School Event</SelectItem>
                    <SelectItem value="sports_day">Sports Day</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="parent_meeting">Parent Meeting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time (optional)</Label>
                  <Input
                    type="time"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Time (optional)</Label>
                  <Input
                    type="time"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="e.g. School Grounds"
                />
              </div>
              <Button
                onClick={() => addEvent.mutate()}
                className="w-full hero-gradient"
                disabled={addEvent.isPending || !newEvent.title}
              >
                {addEvent.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Location</th>
            </tr>
          </thead>
          <tbody>
            {events?.map((event: any) => (
              <tr key={event.id} className="border-t border-border">
                <td className="p-3 text-foreground">{event.title}</td>
                <td className="p-3 text-muted-foreground">{event.event_type}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(event.start_date).toLocaleDateString()}
                </td>
                <td className="p-3 text-muted-foreground">{event.location || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ViewAllResults = () => {
  const { data: results } = useQuery({
    queryKey: ["all-results-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select(
          `
          *,
          students:student_id(first_name, last_name),
          subjects:subject_id(name),
          terms:term_id(name)
        `
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div>
      <h3 className="text-lg font-heading text-foreground mb-6">All Results</h3>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Total Score</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
            </tr>
          </thead>
          <tbody>
            {results?.map((result: any) => (
              <tr key={result.id} className="border-t border-border">
                <td className="p-3 text-foreground">
                  {result.students?.first_name} {result.students?.last_name}
                </td>
                <td className="p-3 text-muted-foreground">{result.subjects?.name || "—"}</td>
                <td className="p-3 text-foreground font-semibold">{result.total_score || "—"}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-md text-xs font-semibold bg-accent/20 text-accent-foreground">
                    {result.grade_letter || "—"}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{result.terms?.name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
