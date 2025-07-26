-- Add created_by column to chats table
ALTER TABLE public.chats 
ADD COLUMN created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid();

-- Drop existing RLS policies for chats
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;

-- Create updated RLS policies for chats
CREATE POLICY "Users can create their own chats" 
ON public.chats 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view chats they created or participate in" 
ON public.chats 
FOR SELECT 
USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_participants.chat_id = chats.id 
    AND chat_participants.user_id = auth.uid()
  )
);