-- Extend direct messages with email-style internal correspondence.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'chat';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS batch_id uuid;

DO $$ BEGIN
  ALTER TABLE public.messages ADD CONSTRAINT messages_type_check CHECK (message_type IN ('chat', 'mail'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.messages ADD CONSTRAINT messages_priority_check CHECK (priority IN ('normal', 'important', 'urgent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_type_created ON public.messages(recipient_id, message_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type_created ON public.messages(sender_id, message_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_batch ON public.messages(batch_id) WHERE batch_id IS NOT NULL;
