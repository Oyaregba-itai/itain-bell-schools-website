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
import { Plus, Clock, Pencil, Trash2 } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];

type EventSlot  = { type: "event";   start: string; end: string; label: string; color: string };
type PerDaySlot = { type: "per_day"; start: string; end: string; color: string; dayLabels: Record<string, string> };
type LessonSlot = { type: "lesson";  start: string; end: string };
type Slot = EventSlot | PerDaySlot | LessonSlot;

// Matches the "Academic Man Hour Placement" PDF exactly
const TIME_SLOTS: Slot[] = [
  {
    type: "event", start: "07:00", end: "07:30", label: "Duty",
    color: "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400",
  },
  {
    type: "event", start: "07:30", end: "07:45", label: "Prayer & Brief",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  {
    type: "per_day", start: "07:45", end: "08:15",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    dayLabels: {
      Monday:    "Assembly",
      Tuesday:   "Mental Maths / Morning Drill",
      Wednesday: "Language Assembly",
      Thursday:  "Verbal Reasoning / Morning Drill",
      Friday:    "Assembly / French",
    },
  },
  { type: "lesson", start: "08:20", end: "09:20" },
  {
    type: "event", start: "09:20", end: "09:30", label: "Snack Break",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  { type: "lesson", start: "09:30", end: "10:30" },
  { type: "lesson", start: "10:30", end: "11:30" },
  {
    type: "event", start: "11:30", end: "12:00", label: "Food & Play Break",
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  { type: "lesson", start: "12:00", end: "13:00" },
  { type: "lesson", start: "13:00", end: "14:00" },
  { type: "lesson", start: "14:00", end: "14:30" },
  {
    type: "per_day", start: "14:30", end: "15:15",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    dayLabels: {
      Monday:    "Department Meeting",
      Tuesday:   "—",
      Wednesday: "—",
      Thursday:  "Club Engagement",
      Friday:    "Academic Staff / Teachers' Meeting",
    },
  },
];

type TimetableEntry = {
  id: string;
  class_id: string;
  subject_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
};

const TimetableView = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null);
  const [editSubjectId, setEditSubjectId] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [form, setForm] = useState({ class_id: "", subject_id: "", day_of_week: "", start_time: "", end_time: "" });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // When adding an entry for a specific class, only show subjects assigned to that class
  const { data: classSubjectsForForm } = useQuery({
    queryKey: ["class-subjects-form", form.class_id],
    enabled: !!form.class_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subject_assignments")
        .select("subject_id, subjects(id, name)")
        .eq("class_id", form.class_id);
      return (data || []).map((a: any) => ({ id: a.subject_id, name: a.subjects?.name || "—" }));
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
      if (selectedClass !== "all") query = query.eq("class_id", selectedClass);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TimetableEntry[];
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
      toast({ title: "Entry added" });
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      setAddOpen(false);
      setForm({ class_id: "", subject_id: "", day_of_week: "", start_time: "", end_time: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("timetable_entries")
        .update({ subject_id: editSubjectId })
        .eq("id", editEntry!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Entry updated" });
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      setEditEntry(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Entry removed" });
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      setEditEntry(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const classMap   = new Map((classes  || []).map((c: any) => [c.id, c.name]));
  const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
  const filteredSubjects = form.class_id ? (classSubjectsForForm || []) : (subjects || []);
  const classesToShow = selectedClass === "all"
    ? (classes || [])
    : (classes || []).filter((c: any) => c.id === selectedClass);

  const openEdit = (entry: TimetableEntry) => {
    setEditEntry(entry);
    setEditSubjectId(entry.subject_id);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h3 className="text-lg font-heading text-foreground">Timetable</h3>
        <div className="flex items-center gap-3">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {role === "admin" && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
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

      {/* Edit dialog (admin only) */}
      <Dialog open={!!editEntry} onOpenChange={(o) => { if (!o) setEditEntry(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editEntry && (
              <p className="text-sm text-muted-foreground">
                {classMap.get(editEntry.class_id) || "—"} &middot; {editEntry.day_of_week} &middot; {editEntry.start_time.slice(0, 5)}–{editEntry.end_time.slice(0, 5)}
              </p>
            )}
            <div>
              <Label>Subject</Label>
              <Select value={editSubjectId} onValueChange={setEditSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 hero-gradient"
                disabled={update.isPending}
                onClick={() => update.mutate()}
              >
                Save Changes
              </Button>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => editEntry && remove.mutate(editEntry.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timetable grid */}
      {(!entries || entries.length === 0) ? (
        <div className="bg-card rounded-xl p-8 shadow-card text-center">
          <Clock className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="text-muted-foreground">No timetable entries yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {classesToShow.map((cls: any) => {
            const classEntries = entries.filter((e) => e.class_id === cls.id);
            if (classEntries.length === 0) return null;

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
                      {TIME_SLOTS.map((slot, rowIdx) => {
                        if (slot.type === "event") {
                          return (
                            <tr key={`ev-${slot.start}`} className={slot.color}>
                              <td className="p-2 text-xs font-medium whitespace-nowrap border-r border-black/10">
                                {slot.start}–{slot.end}
                              </td>
                              <td colSpan={5} className="p-2 text-center text-xs font-semibold tracking-wide">
                                {slot.label}
                              </td>
                            </tr>
                          );
                        }

                        if (slot.type === "per_day") {
                          return (
                            <tr key={`pd-${slot.start}`} className={slot.color}>
                              <td className="p-2 text-xs font-medium whitespace-nowrap border-r border-black/10">
                                {slot.start}–{slot.end}
                              </td>
                              {DAYS.map((day) => (
                                <td key={day} className="p-2 text-center text-xs font-medium border-l border-black/10">
                                  {slot.dayLabels[day] || "—"}
                                </td>
                              ))}
                            </tr>
                          );
                        }

                        // Lesson row
                        return (
                          <tr key={slot.start} className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="p-3 text-xs font-medium text-muted-foreground whitespace-nowrap border-r border-border">
                              {slot.start}<br /><span className="opacity-60">– {slot.end}</span>
                            </td>
                            {DAYS.map((day) => {
                              const entry = classEntries.find(
                                (e) => e.day_of_week === day && e.start_time.slice(0, 5) === slot.start
                              );
                              const subjectName = entry ? (subjectMap.get(entry.subject_id) || "—") : "";
                              return (
                                <td key={day} className="p-2 text-center border-l border-border/50">
                                  {entry ? (
                                    <div className="relative group inline-block">
                                      <span className="inline-block bg-primary/10 text-primary rounded-md px-2 py-1 text-xs font-medium leading-tight">
                                        {subjectName}
                                      </span>
                                      {role === "admin" && (
                                        <button
                                          onClick={() => openEdit(entry)}
                                          className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 bg-primary rounded-full items-center justify-center shadow"
                                          title="Edit entry"
                                        >
                                          <Pencil size={8} className="text-primary-foreground" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/30 text-xs">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
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
