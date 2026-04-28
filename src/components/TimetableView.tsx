import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/config";
import { collection, query, orderBy, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TimetableView = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [form, setForm] = useState({ class_id: "", subject_id: "", day_of_week: "", start_time: "", end_time: "" });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const q = query(collection(db, "classes"), orderBy("name"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const q = query(collection(db, "subjects"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const { data: entries } = useQuery({
    queryKey: ["timetable", selectedClass],
    queryFn: async () => {
      const q = query(
        collection(db, "timetable_entries"),
        orderBy("day_of_week"),
        orderBy("start_time")
      );
      const querySnapshot = await getDocs(q);
      let docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (selectedClass && selectedClass !== "all") {
        docs = docs.filter(d => d.class_id === selectedClass);
      }
      
      return docs;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, "timetable_entries"), {
        class_id: form.class_id,
        subject_id: form.subject_id,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        created_at: Timestamp.now(),
      });
    },
    onSuccess: () => {
      toast({ title: "Timetable entry added" });
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      setOpen(false);
      setForm({ class_id: "", subject_id: "", day_of_week: "", start_time: "", end_time: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredSubjects = form.class_id ? subjects?.filter((s: any) => s.class_id === form.class_id) : subjects;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h3 className="text-lg font-heading text-foreground">Timetable</h3>
        <div className="flex items-center gap-3">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Classes</SelectItem>
              {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {role === "admin" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="hero-gradient"><Plus size={16} className="mr-2" /> Add Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">Add Timetable Entry</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
                  <div>
                    <Label>Class</Label>
                    <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v, subject_id: "" })}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>{filteredSubjects?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Day</Label>
                    <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                      <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                      <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required /></div>
                    <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required /></div>
                  </div>
                  <Button type="submit" className="w-full hero-gradient" disabled={create.isPending}>Add Entry</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {(!entries || entries.length === 0) ? (
        <div className="bg-card rounded-xl p-8 shadow-card text-center">
          <Clock className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="text-muted-foreground">No timetable entries yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {DAYS.map(day => {
            const dayEntries = entries.filter(e => e.day_of_week === day);
            if (dayEntries.length === 0) return null;
            return (
              <div key={day}>
                <h4 className="font-heading text-foreground mb-3">{day}</h4>
                <div className="grid gap-2">
                  {dayEntries.map(entry => {
                    const className = classes?.find((c: any) => c.id === entry.class_id)?.name;
                    const subjectName = subjects?.find((s: any) => s.id === entry.subject_id)?.name;
                    return (
                      <div key={entry.id} className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">{subjectName}</div>
                          <div className="text-sm text-muted-foreground">{className}</div>
                        </div>
                        <div className="text-sm font-medium text-primary">{entry.start_time} – {entry.end_time}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimetableView;
