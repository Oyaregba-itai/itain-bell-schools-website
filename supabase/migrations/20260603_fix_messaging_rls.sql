-- Fix broken RLS policies on message_groups and group_members
-- The original migration used has_role() without the public. prefix

-- message_groups policies
DROP POLICY IF EXISTS "Admins can create groups" ON public.message_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON public.message_groups;

CREATE POLICY "Admins can create groups" ON public.message_groups
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their groups" ON public.message_groups
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- group_members policies
DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view group membership" ON public.group_members;

CREATE POLICY "Admins can manage members" ON public.group_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view group membership" ON public.group_members
  FOR SELECT TO authenticated
  USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );
