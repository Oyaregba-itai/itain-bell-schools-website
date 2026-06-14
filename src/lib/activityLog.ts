import { supabase } from "@/integrations/supabase/client";

export const logActivity = async (action: string, details?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single();

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    actor_name: profile?.full_name || user.email || "Unknown",
    action,
    details: details || null,
  });
};
