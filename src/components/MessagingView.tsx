import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, Check } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

const MessagingView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

  // Get list of all users for messaging
  const { data: users } = useQuery({
    queryKey: ["users-for-messaging"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("user_id", user?.id)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Get conversations (users with recent messages)
  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: sent, error: errorSent } = await supabase
        .from("messages")
        .select("recipient_id")
        .eq("sender_id", user.id);

      const { data: received, error: errorRec } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("recipient_id", user.id);

      if (errorSent || errorRec) throw errorSent || errorRec;

      const userIds = new Set([
        ...(sent || []).map((m: any) => m.recipient_id),
        ...(received || []).map((m: any) => m.sender_id),
      ]);

      const { data: convUsers, error: errorConv } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", Array.from(userIds));

      if (errorConv) throw errorConv;
      return convUsers || [];
    },
  });

  // Get messages with selected user
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

      // Mark received messages as read
      if (data) {
        const unreadIds = data
          .filter((m: any) => m.recipient_id === user.id && !m.read_at)
          .map((m: any) => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadIds);
        }
      }

      return data || [];
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedUser?.user_id || !messageText.trim()) return;

      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id,
        recipient_id: selectedUser.user_id,
        content: messageText,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUser?.user_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error sending message", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex gap-6">
      {/* Conversations List */}
      <div className="w-64 bg-card rounded-xl p-4 shadow-card">
        <h3 className="font-heading text-lg mb-4">Messages</h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {conversations?.map((conv: any) => (
              <button
                key={conv.user_id}
                onClick={() => setSelectedUser(conv)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  selectedUser?.user_id === conv.user_id
                    ? "bg-hero-gradient text-white"
                    : "hover:bg-accent/10"
                }`}
              >
                <p className="font-medium text-sm">{conv.full_name}</p>
                <p className="text-xs text-muted-foreground">{conv.role || "User"}</p>
              </button>
            ))}
          </div>
        </ScrollArea>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full mt-4 hero-gradient">
              <MessageCircle size={16} className="mr-2" /> New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {users?.map((u: any) => (
                <button
                  key={u.user_id}
                  onClick={() => {
                    setSelectedUser(u);
                    queryClient.invalidateQueries({ queryKey: ["conversations"] });
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-accent/10 rounded-lg transition"
                >
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-sm text-muted-foreground">{u.phone || "No phone"}</p>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-card rounded-xl p-6 shadow-card flex flex-col">
        {selectedUser ? (
          <>
            <div className="border-b pb-4 mb-4">
              <h3 className="font-heading text-lg">{selectedUser.full_name}</h3>
              <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 mb-4 pr-4 space-y-3">
              <div className="space-y-3">
                {messages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender_id === user?.id
                          ? "bg-hero-gradient text-white rounded-br-none"
                          : "bg-accent/20 text-foreground rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-xs opacity-70">{format(new Date(msg.created_at), "h:mm a")}</p>
                        {msg.sender_id === user?.id && msg.read_at && (
                          <Check size={12} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage.mutate();
                  }
                }}
              />
              <Button
                onClick={() => sendMessage.mutate()}
                disabled={sendMessage.isPending || !messageText.trim()}
                className="hero-gradient"
              >
                <Send size={16} />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-muted-foreground">Select a user to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingView;
