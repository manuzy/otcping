-- Create message scheduling system
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  recurring_pattern TEXT, -- cron-like pattern for recurring messages
  template_id UUID,
  mentions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Create message templates
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb, -- array of variable names like ["userName", "currentPrice"]
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blast messaging system
CREATE TABLE public.blast_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blast recipients
CREATE TABLE public.blast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blast_message_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user', 'chat', 'institution')),
  recipient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'opened')),
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message bookmarks
CREATE TABLE public.message_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID NOT NULL,
  chat_id UUID NOT NULL,
  category TEXT DEFAULT 'general',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Create message priorities
CREATE TABLE public.message_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL UNIQUE,
  priority_level TEXT NOT NULL DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
  requires_acknowledgment BOOLEAN DEFAULT false,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message acknowledgments
CREATE TABLE public.message_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_messages
CREATE POLICY "Users can view scheduled messages in chats they participate in"
ON public.scheduled_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = scheduled_messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create scheduled messages in chats they participate in"
ON public.scheduled_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = scheduled_messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own scheduled messages"
ON public.scheduled_messages FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own scheduled messages"
ON public.scheduled_messages FOR DELETE
USING (auth.uid() = sender_id);

-- RLS Policies for message_templates
CREATE POLICY "Users can view their own templates and public templates"
ON public.message_templates FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage their own templates"
ON public.message_templates FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for blast_messages
CREATE POLICY "Users can manage their own blast messages"
ON public.blast_messages FOR ALL
USING (auth.uid() = sender_id);

-- RLS Policies for blast_recipients
CREATE POLICY "Users can view recipients of their blast messages"
ON public.blast_recipients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM blast_messages 
    WHERE id = blast_recipients.blast_message_id AND sender_id = auth.uid()
  )
);

CREATE POLICY "Users can manage recipients of their blast messages"
ON public.blast_recipients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM blast_messages 
    WHERE id = blast_recipients.blast_message_id AND sender_id = auth.uid()
  )
);

-- RLS Policies for message_bookmarks
CREATE POLICY "Users can manage their own bookmarks"
ON public.message_bookmarks FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for message_priorities
CREATE POLICY "Users can view priorities in chats they participate in"
ON public.message_priorities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_priorities.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create priorities for messages in chats they participate in"
ON public.message_priorities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_priorities.message_id AND cp.user_id = auth.uid()
  )
);

-- RLS Policies for message_acknowledgments
CREATE POLICY "Users can manage acknowledgments in chats they participate in"
ON public.message_acknowledgments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_acknowledgments.message_id AND cp.user_id = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_scheduled_messages_updated_at
BEFORE UPDATE ON public.scheduled_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blast_messages_updated_at
BEFORE UPDATE ON public.blast_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();