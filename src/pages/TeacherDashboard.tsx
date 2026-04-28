import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/config";
import { collection, getDocs, addDoc, query, where, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, BookOpen } from "lucide-react";
import AnnouncementsView from "@/components/AnnouncementsView";
import TimetableView from "@/components/TimetableView";

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview" && <TeacherOverview />}
      {activeTab === "upload" && <UploadResults />}
      {activeTab === "my-results" && <MyResults />}
      {activeTab === "timetable" && <TimetableView />}
      {activeTab === "announcements" && <AnnouncementsView />}
    </DashboardLayout>
  );
};

const TeacherOverview = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["teacher-stats", user?.id],
    queryFn: async () => {
      const subjectsSnap = await getDocs(query(collection(db, "subjects"), where("teacher_id", "==", user!.id)));
      const resultsSnap = await getDocs(query(collection(db, "results"), where("uploaded_by", "==", user!.id)));
      return { subjects: subjectsSnap.size, results: resultsSnap.size };
    },
    enabled: !!user,
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-card rounded-xl p-5 shadow-card">
        <BookOpen className="text-primary mb-2" size={24} />
        <div className="text-2xl font-heading text-foreground">{stats?.subjects || 0}</div>
        <div className="text-sm text-muted-foreground">My Subjects</div>
      </div>
      <div className="bg-card rounded-xl p-5 shadow-card">
        <GraduationCap className="text-primary mb-2" size={24} />
        <div className="text-2xl font-heading text-foreground">{stats?.results || 0}</div>
        <div className="text-sm text-muted-foreground">Results Uploaded</div>
      </div>
    </div>
  );
};

const UploadResults = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ student_id: "", subject_id: "", term_id: "", grade: "", comment: "" });

  const { data: subjects } = useQuery({
    queryKey: ["my-subjects", user?.id],
    queryFn: async () => {
      const querySnapshot = await getDocs(query(collection(db, "subjects"), where("teacher_id", "==", user!.id)));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user,
  });

  const { data: terms } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => { 
      const querySnapshot = await getDocs(collection(db, "terms"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  // Get students for the selected subject's class
  const selectedSubject = subjects?.find((s: any) => s.id === form.subject_id);
  const { data: students } = useQuery({
    queryKey: ["class-students", selectedSubject?.class_id],
    queryFn: async () => {
      const querySnapshot = await getDocs(query(collection(db, "students"), where("class_id", "==", selectedSubject!.class_id)));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!selectedSubject?.class_id,
  });

  const upload = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, "results"), {
        student_id: form.student_id,
        subject_id: form.subject_id,
        term_id: form.term_id,
        grade: form.grade,
        comment: form.comment || null,
        uploaded_by: user!.id,
        created_at: Timestamp.now(),
      });
    },
    onSuccess: () => {
      toast({ title: "Result uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["my-results"] });
      setForm({ student_id: "", subject_id: form.subject_id, term_id: form.term_id, grade: "", comment: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-lg">
      <h3 className="text-lg font-heading text-foreground mb-6">Upload Result</h3>
      <form onSubmit={(e) => { e.preventDefault(); upload.mutate(); }} className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <div>
          <Label>Subject</Label>
          <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v, student_id: "" })}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{subjects?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Student</Label>
          <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>{students?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Term</Label>
          <Select value={form.term_id} onValueChange={(v) => setForm({ ...form, term_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
            <SelectContent>{terms?.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — {t.academic_year}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Grade</Label>
          <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
            <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent>
              {["A", "B", "C", "D", "F"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Comment (optional)</Label>
          <Input value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="e.g. Excellent performance" />
        </div>
        <Button type="submit" className="w-full hero-gradient" disabled={upload.isPending}>
          {upload.isPending ? "Uploading..." : "Upload Result"}
        </Button>
      </form>
    </div>
  );
};

const MyResults = () => {
  const { user } = useAuth();

  const { data: allData } = useQuery({
    queryKey: ["my-results", user?.id],
    queryFn: async () => {
      const resultsSnap = await getDocs(query(collection(db, "results"), where("uploaded_by", "==", user!.id)));
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
    enabled: !!user,
  });

  const results = allData?.results || [];
  const studentsMap = allData?.studentsMap || new Map();
  const subjectsMap = allData?.subjectsMap || new Map();
  const termsMap = allData?.termsMap || new Map();

  return (
    <div>
      <h3 className="text-lg font-heading text-foreground mb-6">Results I've Uploaded</h3>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
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
                </tr>
              );
            })}
            {(!results || results.length === 0) && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No results uploaded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherDashboard;
