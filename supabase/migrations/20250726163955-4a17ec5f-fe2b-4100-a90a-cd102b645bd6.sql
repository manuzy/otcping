-- Fix infinite recursion by using a security definer function
-- Drop the still problematic policy
DROP POLICY IF EXISTS "Users can view participants in their chats" ON chat_participants;

-- Create a security definer function to check chat membership without recursion
CREATE OR REPLACE FUNCTION public.user_is_chat_member(check_chat_id uuid, check_user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_member boolean := false;
BEGIN
  -- Check if user created the chat
  SELECT EXISTS(
    SELECT 1 FROM chats 
    WHERE id = check_chat_id AND created_by = check_user_id
  ) INTO is_member;
  
  -- If not creator, check direct membership (this won't cause recursion because we're bypassing RLS)
  IF NOT is_member THEN
    SELECT EXISTS(
      SELECT 1 FROM chat_participants 
      WHERE chat_id = check_chat_id AND user_id = check_user_id
    ) INTO is_member;
  END IF;
  
  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a simple policy using the security definer function
CREATE POLICY "Users can view participants in chats they belong to"
ON chat_participants
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  public.user_is_chat_member(chat_participants.chat_id, auth.uid())
);