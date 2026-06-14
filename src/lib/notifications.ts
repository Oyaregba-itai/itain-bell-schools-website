import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "message" | "announcement" | "event" | "request" | "report";

export const notifyUsers = async (
  userIds: (string | null | undefined)[],
  type: NotificationType,
  title: string,
  body?: string,
  link_tab?: string
) => {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  if (!ids.length) return;

  await supabase.from("notifications").insert(
    ids.map((user_id) => ({
      user_id,
      type,
      title,
      body: body || null,
      link_tab: link_tab || null,
    }))
  );
};

export const getAdminUserIds = async (excludeUserId?: string) => {
  const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  return (data || [])
    .map((r: any) => r.user_id as string)
    .filter((id) => id !== excludeUserId);
};
