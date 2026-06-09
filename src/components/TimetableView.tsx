import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Canonical time slots in display order
const TIME_SLOTS = [
  { start: "08:20", end: "09:20" },
  { start: "09:30", end: "10:30" },
  { start: "10:30", end: "11:30" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "14:30" },
];

const TimetableView = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [form, setForm] = useState({ class_id: "", subject_id: "", day_of_week: "", start_time: "", end_time: "" });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: entries } = useQuery({
    queryKey: ["timetable", selectedClass],
    queryFn: async () => {
      let query = supabase
        .from("timetable_entries")
        .select("*")
        .order("day_of_week")
        .order("start_time");
      
      if (selectedClass && selectedClass !== "all") {
        query = query.eq("class_id", selectedClass);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("timetable_entries").insert({
        class_id: form.class_id,
        subject_id: form.subject_id,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
      });
      if (error) throw error;
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

  // Build lookup: classId → className
  const classMap = new Map((classes || []).map((c: any) => [c.id, c.name]));
  const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));

  // Classes to render tables for
  const classesToShow =
    selectedClass === "all"
      ? (classes || [])
      : (classes || []).filter((c: any) => c.id === selectedClass);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h3 className="text-lg font-heading text-foreground">Timetable</h3>
        <div className="flex items-center gap-3">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
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
        <div className="space-y-8">
          {classesToShow.map((cls: any) => {
            const classEntries = entries.filter((e: any) => e.class_id === cls.id);
            if (classEntries.length === 0) return null;

            // Determine which time slots actually have data for this class
            const usedSlots = TIME_SLOTS.filter(slot =>
              classEntries.some((e: any) => e.start_time.slice(0, 5) === slot.start)
            );

            return (
              <div key={cls.id}>
                {selectedClass === "all" && (
                  <h4 className="font-heading text-foreground mb-3">{cls.name}</h4>
                )}
                <div className="bg-card rounded-xl shadow-card overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="p-3 text-left font-medium whitespace-nowrap w-28 rounded-tl-xl">Time</th>
                        {DAYS.map((day, i) => (
                          <th key={day} className={`p-3 text-center font-medium ${i === DAYS.length - 1 ? "rounded-tr-xl" : ""}`}>
                            <span className="hidden sm:inline">{day}</span>
                            <span className="sm:hidden">{DAY_SHORT[i]}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usedSlots.map((slot, rowIdx) => (
                        <tr key={slot.start} className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/40"}>
                          <td className="p-3 text-xs font-medium text-muted-foreground whitespace-nowrap border-r border-border">
                            {slot.start}<br /><span className="opacity-60">– {slot.end}</span>
                          </td>
                          {DAYS.map(day => {
                            const entry = classEntries.find(
                              (e: any) =>
                                e.day_of_week === day &&
                                e.start_time.slice(0, 5) === slot.start
                            );
                            const subject = entry ? (subjectMap.get(entry.subject_id) || "—") : "";
                            return (
                              <td key={day} className="p-3 text-center border-l border-border/50">
                                {entry ? (
                                  <span className="inline-block bg-primary/10 text-primary rounded-md px-2 py-1 text-xs font-medium leading-tight">
                                    {subject}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40 text-xs">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
