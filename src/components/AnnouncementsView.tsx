import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Megaphone } from "lucide-react";
import { format } from "date-fns";

const AnnouncementsView = () => {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", target_role: "all" });

  const { data: announcements } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        title: form.title,
        content: form.content,
        target_role: form.target_role,
        created_by: user!.id,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Announcement posted" });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setOpen(false);
      setForm({ title: "", content: "", target_role: "all" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Announcements</h3>
        {role === "admin" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="hero-gradient"><Plus size={16} className="mr-2" /> New Announcement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Post Announcement</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Announcement title" /></div>
                <div><Label>Content</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required placeholder="Write your announcement..." rows={4} /></div>
                <div>
                  <Label>Visible To</Label>
                  <Select value={form.target_role} onValueChange={(v) => setForm({ ...form, target_role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="teacher">Teachers Only</SelectItem>
                      <SelectItem value="parent">Parents Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full hero-gradient" disabled={create.isPending}>Post Announcement</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(!announcements || announcements.length === 0) ? (
        <div className="bg-card rounded-xl p-8 shadow-card text-center">
          <Megaphone className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="text-muted-foreground">No announcements yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-card rounded-xl p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-heading text-foreground text-base">{a.title}</h4>
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{a.content}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy • h:mm a")}</span>
                    {a.target_role !== "all" && (
                      <span className="px-2 py-0.5 rounded-md bg-accent/20 text-accent-foreground text-xs capitalize">{a.target_role}s only</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsView;
