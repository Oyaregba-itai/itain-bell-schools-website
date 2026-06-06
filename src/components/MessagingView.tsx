import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, Check, Users } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import GroupMessagingView from "@/components/GroupMessagingView";

const MessagingView = () => {
  const [mode, setMode] = useState<"direct" | "groups">("direct");

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-64">
        <button
          onClick={() => setMode("direct")}
          className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-md font-medium transition-colors ${mode === "direct" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <MessageCircle size={14} /> Direct
        </button>
        <button
          onClick={() => setMode("groups")}
          className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-md font-medium transition-colors ${mode === "groups" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Users size={14} /> Groups
        </button>
      </div>

      {mode === "direct" ? <DirectMessages /> : <GroupMessagingView />}
    </div>
  );
};

const DirectMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users-for-messaging"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").neq("user_id", user?.id).order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: sent } = await supabase.from("messages").select("recipient_id").eq("sender_id", user.id);
      const { data: received } = await supabase.from("messages").select("sender_id").eq("recipient_id", user.id);
      const userIds = new Set([
        ...(sent || []).map((m: any) => m.recipient_id),
        ...(received || []).map((m: any) => m.sender_id),
      ]);
      if (!userIds.size) return [];
      const { data: convUsers } = await supabase.from("profiles").select("*").in("user_id", Array.from(userIds));
      return convUsers || [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser?.user_id || !user?.id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUser.user_id}),and(sender_id.eq.${selectedUser.user_id},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data) {
        const unreadIds = data.filter((m: any) => m.recipient_id === user.id && !m.read_at).map((m: any) => m.id);
        if (unreadIds.length > 0) await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
      }
      return data || [];
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedUser?.user_id || !messageText.trim()) return;
      const { error } = await supabase.from("messages").insert({ sender_id: user!.id, recipient_id: selectedUser.user_id, content: messageText });
      if (error) throw error;

      // Send email notification to recipient
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: senderProfile } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).single();
        if (session) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              type: "messages",
              title: `New message from ${senderProfile?.full_name || "a staff member"}`,
              body: messageText.length > 200 ? messageText.substring(0, 200) + "…" : messageText,
              recipients: [selectedUser.user_id],
            }),
          });
        }
      } catch { /* silent fail */ }
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUser?.user_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: Error) => toast({ title: "Error sending message", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="flex gap-6">
      {/* Conversations List */}
      <div className="w-64 bg-card rounded-xl p-4 shadow-card flex-shrink-0">
        <h3 className="font-heading text-base mb-3 text-foreground">Direct Messages</h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {conversations?.map((conv: any) => (
              <button
                key={conv.user_id}
                onClick={() => setSelectedUser(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selectedUser?.user_id === conv.user_id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <p className="font-medium text-sm">{conv.full_name}</p>
              </button>
            ))}
            {!conversations?.length && <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>}
          </div>
        </ScrollArea>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full mt-3 hero-gradient" size="sm">
              <MessageCircle size={14} className="mr-2" /> New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Start a Conversation</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {users?.map((u: any) => (
                <button
                  key={u.user_id}
                  onClick={() => { setSelectedUser(u); queryClient.invalidateQueries({ queryKey: ["conversations"] }); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted rounded-lg transition-colors"
                >
                  <p className="font-medium text-sm">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.phone || "No phone"}</p>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-card rounded-xl p-6 shadow-card flex flex-col min-h-[500px]">
        {selectedUser ? (
          <>
            <div className="border-b border-border pb-4 mb-4">
              <h3 className="font-heading text-base text-foreground">{selectedUser.full_name}</h3>
              {selectedUser.phone && <p className="text-xs text-muted-foreground">{selectedUser.phone}</p>}
            </div>
            <ScrollArea className="flex-1 mb-4 pr-2">
              <div className="space-y-3">
                {messages?.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${msg.sender_id === user?.id ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                      <p>{msg.content}</p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <p className="text-xs opacity-60">{format(new Date(msg.created_at), "h:mm a")}</p>
                        {msg.sender_id === user?.id && msg.read_at && <Check size={11} className="opacity-60" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage.mutate(); }}
              />
              <Button onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || !messageText.trim()} className="hero-gradient">
                <Send size={16} />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center gap-3">
            <MessageCircle size={40} className="text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Select a conversation or start a new message</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingView;
