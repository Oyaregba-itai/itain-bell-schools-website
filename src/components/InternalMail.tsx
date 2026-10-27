import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, Check, Inbox, Mail, PenLine, Printer, Search, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { notifyUsers } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Profile = { user_id: string; full_name: string; email?: string | null; role: "admin" | "teacher" | "parent" | "creche_staff" };
type MailRow = { id: string; sender_id: string; recipient_id: string; subject: string | null; content: string; priority: "normal" | "important" | "urgent"; batch_id: string | null; read_at: string | null; created_at: string };

const db = supabase as any;
const priorityStyle = { normal: "bg-muted text-muted-foreground", important: "bg-amber-100 text-amber-800", urgent: "bg-red-100 text-red-700" };

const InternalMail = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [selected, setSelected] = useState<MailRow | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("normal");
  const [recipientGroup, setRecipientGroup] = useState<"all" | "staff" | "parents">("all");

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["internal-mail-profiles"],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await db.rpc("get_internal_mail_recipients");
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });

  const { data: mail = [], isLoading } = useQuery<MailRow[]>({
    queryKey: ["internal-mail", folder, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      let query = db.from("messages").select("*").eq("message_type", "mail").order("created_at", { ascending: false });
      query = folder === "inbox" ? query.eq("recipient_id", user!.id) : query.eq("sender_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MailRow[];
    },
  });

  const profileMap = useMemo(() => new Map(profiles.map((item) => [item.user_id, item])), [profiles]);
  const visibleRecipients = useMemo(() => profiles.filter((item) => recipientGroup === "all" || (recipientGroup === "parents" ? item.role === "parent" : item.role !== "parent")), [profiles, recipientGroup]);
  const displayedMail = useMemo(() => {
    const seen = new Set<string>();
    return mail.filter((item) => {
      if (folder === "sent" && item.batch_id) {
        if (seen.has(item.batch_id)) return false;
        seen.add(item.batch_id);
      }
      const other = profileMap.get(folder === "inbox" ? item.sender_id : item.recipient_id)?.full_name || "Staff member";
      return `${item.subject || ""} ${item.content} ${other}`.toLowerCase().includes(search.toLowerCase());
    });
  }, [mail, folder, profileMap, search]);

  const openMail = async (item: MailRow) => {
    setSelected(item);
    if (folder === "inbox" && !item.read_at) {
      await db.from("messages").update({ read_at: new Date().toISOString() }).eq("id", item.id);
      queryClient.invalidateQueries({ queryKey: ["internal-mail"] });
    }
  };

  const sendMail = useMutation({
    mutationFn: async () => {
      if (!user?.id || recipients.length === 0 || !subject.trim() || !body.trim()) throw new Error("Choose recipients and complete the subject and message.");
      const batchId = crypto.randomUUID();
      const rows = recipients.map((recipientId) => ({ sender_id: user.id, recipient_id: recipientId, content: body.trim(), subject: subject.trim(), priority, message_type: "mail", batch_id: batchId }));
      const { error } = await db.from("messages").insert(rows);
      if (error) throw error;
      await notifyUsers(recipients, "message", `Internal mail: ${subject.trim()}`, `${profile?.full_name || "A staff member"} sent you an internal message.`, "messaging");
    },
    onSuccess: () => {
      toast({ title: "Internal mail sent", description: `Delivered to ${recipients.length} staff member${recipients.length === 1 ? "" : "s"}.` });
      setComposeOpen(false); setRecipients([]); setSubject(""); setBody(""); setPriority("normal");
      queryClient.invalidateQueries({ queryKey: ["internal-mail"] });
    },
    onError: (error: Error) => toast({ title: "Could not send mail", description: error.message, variant: "destructive" }),
  });

  const recipientNames = selected?.batch_id && folder === "sent"
    ? mail.filter((item) => item.batch_id === selected.batch_id).map((item) => profileMap.get(item.recipient_id)?.full_name || "Staff member")
    : [profileMap.get(selected?.recipient_id || "")?.full_name || "Staff member"];
  const senderName = folder === "inbox" ? profileMap.get(selected?.sender_id || "")?.full_name || "Staff member" : profile?.full_name || "Staff member";

  return <div className="space-y-4">
    <style>{`@media print { body * { visibility: hidden !important; } #internal-mail-print, #internal-mail-print * { visibility: visible !important; } #internal-mail-print { position: absolute; inset: 0; width: 100%; padding: 28px; background: white; color: black; } .mail-no-print { display: none !important; } }`}</style>
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg bg-muted p-1">
        <button onClick={() => { setFolder("inbox"); setSelected(null); }} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${folder === "inbox" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><Inbox size={15} />Inbox</button>
        <button onClick={() => { setFolder("sent"); setSelected(null); }} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${folder === "sent" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><Send size={15} />Sent</button>
      </div>
      <div className="relative flex-1 min-w-52 max-w-md"><Search size={15} className="absolute left-3 top-3 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search internal mail" className="pl-9" /></div>
      <Button className="hero-gradient ml-auto" onClick={() => setComposeOpen(true)}><PenLine size={16} className="mr-2" />Compose</Button>
    </div>

    <div className="grid min-h-[560px] gap-5 lg:grid-cols-[340px_1fr]">
      <div className="rounded-xl bg-card shadow-card overflow-hidden"><div className="border-b border-border px-4 py-3 text-sm font-heading">{folder === "inbox" ? "Inbox" : "Sent mail"} <span className="text-muted-foreground">({displayedMail.length})</span></div><ScrollArea className="h-[515px]"><div className="divide-y divide-border">{displayedMail.map((item) => {
        const other = profileMap.get(folder === "inbox" ? item.sender_id : item.recipient_id)?.full_name || "Staff member";
        return <button key={item.id} onClick={() => openMail(item)} className={`block w-full p-4 text-left hover:bg-muted/60 ${selected?.id === item.id ? "bg-primary/5" : ""} ${folder === "inbox" && !item.read_at ? "font-semibold" : ""}`}><div className="flex gap-2"><span className="truncate text-sm flex-1">{other}</span>{folder === "inbox" && !item.read_at && <span className="h-2 w-2 rounded-full bg-primary mt-1.5" />}</div><p className="mt-1 truncate text-sm">{item.subject || "(No subject)"}</p><div className="mt-2 flex items-center justify-between"><span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${priorityStyle[item.priority]}`}>{item.priority}</span><span className="text-xs font-normal text-muted-foreground">{format(new Date(item.created_at), "MMM d")}</span></div></button>;
      })}{!isLoading && displayedMail.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground"><Mail className="mx-auto mb-3 opacity-30" />No internal mail here.</div>}</div></ScrollArea></div>

      <div className="rounded-xl bg-card p-6 shadow-card">{selected ? <article id="internal-mail-print" className="max-w-3xl mx-auto">
        <div className="mail-no-print flex justify-end mb-2"><Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={15} className="mr-2" />Print</Button></div>
        <header className="border-b-2 border-primary pb-5"><div className="flex items-center gap-3"><Mail className="text-primary" /><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Itain-Bell Schools</p><h2 className="font-heading text-xl">Internal Correspondence</h2></div></div></header>
        <div className="border-b border-border py-5 space-y-2 text-sm"><div><span className="inline-block w-16 text-muted-foreground">From:</span><strong>{senderName}</strong></div><div><span className="inline-block w-16 text-muted-foreground">To:</span>{recipientNames.join(", ")}</div><div><span className="inline-block w-16 text-muted-foreground">Date:</span>{format(new Date(selected.created_at), "EEEE, d MMMM yyyy 'at' h:mm a")}</div><div><span className="inline-block w-16 text-muted-foreground">Priority:</span><span className={`rounded px-2 py-1 text-xs uppercase ${priorityStyle[selected.priority]}`}>{selected.priority}</span></div></div>
        <h1 className="font-heading text-2xl mt-7">{selected.subject || "(No subject)"}</h1><div className="mt-6 whitespace-pre-wrap leading-7 text-foreground">{selected.content}</div>
        <footer className="mt-16 border-t border-border pt-4 text-xs text-muted-foreground">Printed from the Itain-Bell Schools internal correspondence system on {format(new Date(), "d MMMM yyyy, h:mm a")}.</footer>
      </article> : <div className="flex h-full min-h-[450px] flex-col items-center justify-center text-center text-muted-foreground"><Mail size={48} className="mb-4 opacity-20" /><p>Select a message to read or print it.</p></div>}</div>
    </div>

    <Dialog open={composeOpen} onOpenChange={setComposeOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>New Internal Mail</DialogTitle></DialogHeader><div className="space-y-5">
      <div><div className="flex flex-wrap items-center justify-between gap-2"><Label>Recipients</Label><div className="flex rounded-md bg-muted p-1">{([['all','All'],['staff','Staff'],['parents','Parents']] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setRecipientGroup(id)} className={`rounded px-3 py-1 text-xs ${recipientGroup === id ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{label}</button>)}</div></div><div className="mt-2 flex justify-end"><button type="button" className="text-xs text-primary" onClick={() => { const ids=visibleRecipients.map((item) => item.user_id); const allSelected=ids.every((id) => recipients.includes(id)); setRecipients(allSelected ? recipients.filter((id) => !ids.includes(id)) : [...new Set([...recipients,...ids])]); }}>{visibleRecipients.every((item) => recipients.includes(item.user_id)) ? `Clear ${recipientGroup}` : `Select all ${recipientGroup}`}</button></div><ScrollArea className="mt-2 h-44 rounded-lg border border-border p-3"><div className="grid gap-2 sm:grid-cols-2">{visibleRecipients.map((item) => <label key={item.user_id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted"><Checkbox checked={recipients.includes(item.user_id)} onCheckedChange={(checked) => setRecipients(checked ? [...recipients, item.user_id] : recipients.filter((id) => id !== item.user_id))} /><span className="min-w-0 text-sm"><span className="block truncate">{item.full_name}</span><span className="text-[10px] uppercase text-muted-foreground">{item.role.replace('_',' ')}</span></span></label>)}</div></ScrollArea><p className="mt-1 text-xs text-muted-foreground">{recipients.length} selected · {profiles.filter((item) => item.role === 'parent').length} parents available</p></div>
      <div className="grid gap-4 sm:grid-cols-[1fr_150px]"><div><Label>Subject</Label><Input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={180} placeholder="Purpose of this correspondence" /></div><div><Label>Priority</Label><Select value={priority} onValueChange={(value: "normal" | "important" | "urgent") => setPriority(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="important">Important</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div></div>
      <div><Label>Message</Label><Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} placeholder="Write the internal correspondence here…" /></div>
      {priority === "urgent" && <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} />Urgent mail should only be used for time-sensitive school matters.</div>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button><Button className="hero-gradient" onClick={() => sendMail.mutate()} disabled={sendMail.isPending || recipients.length === 0 || !subject.trim() || !body.trim()}>{sendMail.isPending ? "Sending…" : <><Send size={15} className="mr-2" />Send internal mail</>}</Button></div>
    </div></DialogContent></Dialog>
  </div>;
};

export default InternalMail;
