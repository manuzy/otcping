-- Fix the security definer function by dropping dependencies first
-- Drop the policy that depends on the function
DROP POLICY IF EXISTS "Users can view participants in chats they belong to" ON chat_participants;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS public.user_is_chat_member(uuid, uuid);

-- Create a simpler security definer function that avoids recursion
CREATE OR REPLACE FUNCTION public.user_is_chat_member(check_chat_id uuid, check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user created the chat OR is a participant
  -- Use a simple EXISTS query that won't trigger RLS recursion
  RETURN EXISTS(
    SELECT 1 FROM public.chats 
    WHERE id = check_chat_id AND created_by = check_user_id
  ) OR EXISTS(
    -- This direct query bypasses RLS due to SECURITY DEFINER
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = check_chat_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate the policy
CREATE POLICY "Users can view participants in chats they belong to"
ON chat_participants
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  public.user_is_chat_member(chat_participants.chat_id, auth.uid())
);