-- Update RLS policy for chat_participants to allow viewing all participants in chats you're part of
DROP POLICY IF EXISTS "Users can view their own chat participations" ON chat_participants;

CREATE POLICY "Users can view participants in chats they participate in"
ON chat_participants
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_id = chat_participants.chat_id 
    AND cp.user_id = auth.uid()
  )
);