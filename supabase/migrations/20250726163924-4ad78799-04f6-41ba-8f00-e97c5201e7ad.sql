-- Fix infinite recursion in chat_participants RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in chats they participate in" ON chat_participants;

-- Create a safer policy that uses chats table instead of self-referencing chat_participants
CREATE POLICY "Users can view participants in their chats"
ON chat_participants
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM chats c 
    WHERE c.id = chat_participants.chat_id 
    AND (
      c.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM chat_participants cp2 
        WHERE cp2.chat_id = c.id 
        AND cp2.user_id = auth.uid()
      )
    )
  )
);