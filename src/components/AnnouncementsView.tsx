import { useRef, useState } from "react";
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
import { Plus, Megaphone, ImagePlus, X } from "lucide-react";
import { format } from "date-fns";
import { notifyUsers } from "@/lib/notifications";

const AnnouncementsView = () => {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", target_role: "all" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `announcement-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("profile-pictures").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("profile-pictures").getPublicUrl(path).data.publicUrl;
  };

  const sendEmailNotifications = async (title: string, content: string, targetRole: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let query = supabase.from("user_roles").select("user_id");
      if (targetRole !== "all") query = query.eq("role", targetRole);
      const { data: roleData } = await query;
      const recipients = (roleData || []).map((r: any) => r.user_id);
      if (!recipients.length) return;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ type: "announcements", title, body: content, recipients }),
      });
    } catch { /* silent fail */ }
  };

  const createInAppNotifications = async (title: string, content: string, targetRole: string) => {
    try {
      let query = supabase.from("user_roles").select("user_id");
      if (targetRole !== "all") query = query.eq("role", targetRole);
      const { data: roleData } = await query;
      const recipients = (roleData || [])
        .map((r: any) => r.user_id as string)
        .filter((id) => id !== user!.id);
      await notifyUsers(recipients, "announcement", title, content, "announcements");
    } catch { /* silent fail */ }
  };

  const create = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let image_url: string | null = null;
      try {
        if (imageFile) image_url = await uploadImage(imageFile);
      } finally {
        setUploading(false);
      }
      const { error } = await supabase.from("announcements").insert({
        title: form.title,
        content: form.content,
        target_role: form.target_role,
        created_by: user!.id,
        created_at: new Date().toISOString(),
        image_url,
      });
      if (error) throw error;
      sendEmailNotifications(form.title, form.content, form.target_role);
      createInAppNotifications(form.title, form.content, form.target_role);
    },
    onSuccess: () => {
      toast({ title: "Announcement posted" });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setOpen(false);
      setForm({ title: "", content: "", target_role: "all" });
      clearImage();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-heading text-foreground">Announcements</h3>
        {role === "admin" && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { clearImage(); setForm({ title: "", content: "", target_role: "all" }); } }}>
            <DialogTrigger asChild>
              <Button className="hero-gradient"><Plus size={16} className="mr-2" /> New Announcement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-heading">Post Announcement</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Announcement title" /></div>
                <div><Label>Content</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required placeholder="Write your announcement..." rows={4} /></div>

                {/* Image / flyer upload */}
                <div className="space-y-2">
                  <Label>Image / Flyer (optional)</Label>
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-border" />
                      <button type="button" onClick={clearImage} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      <ImagePlus size={24} className="text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">Click to upload image or flyer</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF · max 5MB</p>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </div>

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
                <Button type="submit" className="w-full hero-gradient" disabled={create.isPending || uploading}>
                  {uploading ? "Uploading image…" : create.isPending ? "Posting…" : "Post Announcement"}
                </Button>
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
          {announcements.map((a: any) => (
            <div key={a.id} className="bg-card rounded-xl shadow-card overflow-hidden">
              {a.image_url && (
                <img src={a.image_url} alt={a.title} className="w-full max-h-72 object-cover" />
              )}
              <div className="p-5">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsView;
