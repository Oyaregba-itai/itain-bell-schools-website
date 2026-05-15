-- Direct Messages Table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" ON public.messages
  FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

-- Message Groups Table
CREATE TABLE public.message_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups they are members of" ON public.message_groups
  FOR SELECT TO authenticated USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can create groups" ON public.message_groups
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update groups" ON public.message_groups
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Group Members Table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.message_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group members for their groups" ON public.group_members
  FOR SELECT TO authenticated USING (
    group_id IN (SELECT id FROM public.message_groups WHERE id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Admins can manage group members" ON public.group_members
  FOR ALL TO authenticated USING (
    group_id IN (SELECT id FROM public.message_groups WHERE created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  ) WITH CHECK (
    group_id IN (SELECT id FROM public.message_groups WHERE created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  );

-- Group Messages Table
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.message_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group messages for their groups" ON public.group_messages
  FOR SELECT TO authenticated USING (
    group_id IN (SELECT id FROM public.message_groups WHERE id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Group members can send group messages" ON public.group_messages
  FOR INSERT TO authenticated WITH CHECK (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_messages_group ON public.group_messages(group_id);
CREATE INDEX idx_group_messages_created_at ON public.group_messages(created_at DESC);
