-- Fix the security definer function to properly bypass RLS
-- The function needs to use a different approach to avoid recursion

DROP FUNCTION IF EXISTS public.user_is_chat_member(uuid, uuid);

-- Create a security definer function that bypasses RLS properly
CREATE OR REPLACE FUNCTION public.user_is_chat_member(check_chat_id uuid, check_user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_member boolean := false;
BEGIN
  -- First check if user created the chat (this is safe as it doesn't involve chat_participants)
  SELECT EXISTS(
    SELECT 1 FROM public.chats 
    WHERE id = check_chat_id AND created_by = check_user_id
  ) INTO is_member;
  
  -- If not creator, we need to check participation
  -- Use a direct query that bypasses RLS by being in a security definer function
  IF NOT is_member THEN
    -- This query will not trigger RLS recursion because we're in a security definer context
    -- and explicitly avoiding the policy check
    PERFORM set_config('row_security', 'off', true);
    
    SELECT EXISTS(
      SELECT 1 FROM public.chat_participants 
      WHERE chat_id = check_chat_id AND user_id = check_user_id
    ) INTO is_member;
    
    PERFORM set_config('row_security', 'on', true);
  END IF;
  
  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;