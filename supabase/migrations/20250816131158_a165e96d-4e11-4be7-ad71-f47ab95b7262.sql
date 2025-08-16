-- Create message_attachments table for file storage
CREATE TABLE public.message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for message attachments
CREATE POLICY "Users can view attachments in chats they participate in"
ON public.message_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_attachments.message_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create attachments in chats they participate in"
ON public.message_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_attachments.message_id 
    AND cp.user_id = auth.uid()
  )
);

-- Create message_status table for persistent delivery/read receipts
CREATE TABLE public.message_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

-- Create policies for message status
CREATE POLICY "Users can view message status in chats they participate in"
ON public.message_status
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_status.message_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update message status in chats they participate in"
ON public.message_status
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_status.message_id 
    AND cp.user_id = auth.uid()
  )
);

-- Create pinned_messages table
CREATE TABLE public.pinned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL,
  message_id UUID NOT NULL,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, message_id)
);

-- Enable RLS
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for pinned messages
CREATE POLICY "Users can view pinned messages in chats they participate in"
ON public.pinned_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.chat_id = pinned_messages.chat_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can pin/unpin messages in chats they participate in"
ON public.pinned_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.chat_id = pinned_messages.chat_id 
    AND cp.user_id = auth.uid()
  )
);

-- Create message_drafts table
CREATE TABLE public.message_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for message drafts
CREATE POLICY "Users can manage their own drafts"
ON public.message_drafts
FOR ALL
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_message_drafts_updated_at
BEFORE UPDATE ON public.message_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', false);

-- Create storage policies for message attachments
CREATE POLICY "Users can view attachments in their chats"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1 FROM message_attachments ma
    JOIN messages m ON ma.message_id = m.id
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE ma.file_url LIKE '%' || name AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);