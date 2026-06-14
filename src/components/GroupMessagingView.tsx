import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Send, X } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { notifyUsers } from "@/lib/notifications";

const GroupMessagingView = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Get groups user is member of
  const { data: groups } = useQuery({
    queryKey: ["message-groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("message_groups")
        .select("*")
        .in(
          "id",
          (await supabase
            .from("group_members")
            .select("group_id")
            .eq("user_id", user.id)
            .then((r) => r.data?.map((m: any) => m.group_id) || []))
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Get all users for group creation
  const { data: allUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Get group members
  const { data: groupMembers } = useQuery({
    queryKey: ["group-members", selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup?.id) return [];

      const { data, error } = await supabase
        .from("group_members")
        .select("user_id, joined_at, profiles(*)")
        .eq("group_id", selectedGroup.id);

      if (error) throw error;
      return data || [];
    },
  });

  // Get group messages
  const { data: groupMessages } = useQuery({
    queryKey: ["group-messages", selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup?.id) return [];

      const { data, error } = await supabase
        .from("group_messages")
        .select("*, profiles(*)")
        .eq("group_id", selectedGroup.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 3000, // Refetch every 3 seconds
  });

  // Create group
  const createGroup = useMutation({
    mutationFn: async () => {
      if (!groupForm.name.trim()) {
        throw new Error("Group name is required");
      }

      if (selectedMembers.length === 0) {
        throw new Error("Please select at least one member");
      }

      // Create group
      const { data: newGroup, error: groupError } = await supabase
        .from("message_groups")
        .insert({
          name: groupForm.name,
          description: groupForm.description,
          created_by: user!.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members
      const memberInserts = selectedMembers.map((memberId) => ({
        group_id: newGroup.id,
        user_id: memberId,
      }));

      const { error: memberError } = await supabase
        .from("group_members")
        .insert(memberInserts);

      if (memberError) throw memberError;

      return newGroup;
    },
    onSuccess: (newGroup) => {
      toast({ title: "Group created successfully" });
      queryClient.invalidateQueries({ queryKey: ["message-groups"] });
      setCreateOpen(false);
      setGroupForm({ name: "", description: "" });
      setSelectedMembers([]);
      setSelectedGroup(newGroup);
    },
    onError: (err: Error) => {
      toast({ title: "Error creating group", description: err.message, variant: "destructive" });
    },
  });

  // Send group message
  const sendGroupMessage = useMutation({
    mutationFn: async () => {
      if (!selectedGroup?.id || !messageText.trim()) return;

      const { error } = await supabase.from("group_messages").insert({
        group_id: selectedGroup.id,
        sender_id: user!.id,
        content: messageText,
      });

      if (error) throw error;

      try {
        const { data: senderProfile } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).single();
        const memberIds = (groupMembers || []).map((m: any) => m.user_id).filter((id: string) => id !== user!.id);
        await notifyUsers(
          memberIds,
          "message",
          `New message in ${selectedGroup.name} from ${senderProfile?.full_name || "a staff member"}`,
          messageText.length > 200 ? messageText.substring(0, 200) + "…" : messageText,
          "messaging"
        );
      } catch { /* silent fail */ }
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["group-messages"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error sending message", description: err.message, variant: "destructive" });
    },
  });

  // Remove member (admin only)
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", selectedGroup.id)
        .eq("user_id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member removed" });
      queryClient.invalidateQueries({ queryKey: ["group-members"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error removing member", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex gap-6">
      {/* Groups List */}
      <div className="w-64 bg-card rounded-xl p-4 shadow-card">
        <h3 className="font-heading text-lg mb-4">Groups</h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {groups?.map((group: any) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  selectedGroup?.id === group.id
                    ? "bg-hero-gradient text-white"
                    : "hover:bg-accent/10"
                }`}
              >
                <p className="font-medium text-sm">{group.name}</p>
                <p className="text-xs text-muted-foreground">{group.description}</p>
              </button>
            ))}
          </div>
        </ScrollArea>

        {role === "admin" && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mt-4 hero-gradient">
                <Plus size={16} className="mr-2" /> New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">Create Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Group Name</Label>
                  <Input
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="e.g., Teachers 2024"
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    placeholder="Group description..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="mb-3 block">Select Members</Label>
                  <ScrollArea className="h-[300px] border rounded-lg p-3">
                    <div className="space-y-2">
                      {allUsers?.map((u: any) => (
                        <div key={u.user_id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedMembers.includes(u.user_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMembers([...selectedMembers, u.user_id]);
                              } else {
                                setSelectedMembers(selectedMembers.filter((id) => id !== u.user_id));
                              }
                            }}
                          />
                          <label className="text-sm cursor-pointer flex-1">
                            {u.full_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <Button
                  onClick={() => createGroup.mutate()}
                  disabled={createGroup.isPending}
                  className="w-full hero-gradient"
                >
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-card rounded-xl p-6 shadow-card flex flex-col">
        {selectedGroup ? (
          <>
            <div className="border-b pb-4 mb-4 flex justify-between items-start">
              <div>
                <h3 className="font-heading text-lg">{selectedGroup.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
              </div>
              {role === "admin" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Users size={16} className="mr-1" /> Members ({groupMembers?.length || 0})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Group Members</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {groupMembers?.map((member: any) => (
                          <div key={member.user_id} className="flex items-center justify-between p-3 hover:bg-accent/10 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{member.profiles?.full_name}</p>
                              <p className="text-xs text-muted-foreground">Joined {format(new Date(member.joined_at), "MMM d")}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeMember.mutate(member.user_id)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 mb-4 pr-4">
              <div className="space-y-3">
                {groupMessages?.map((msg: any) => (
                  <div key={msg.id} className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{msg.profiles?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(msg.created_at), "h:mm a")}</p>
                    </div>
                    <div className="bg-accent/10 rounded-lg px-3 py-2">
                      <p className="text-sm">{msg.content}</p>
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
                    sendGroupMessage.mutate();
                  }
                }}
              />
              <Button
                onClick={() => sendGroupMessage.mutate()}
                disabled={sendGroupMessage.isPending || !messageText.trim()}
                className="hero-gradient"
              >
                <Send size={16} />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-muted-foreground">Select a group to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMessagingView;
