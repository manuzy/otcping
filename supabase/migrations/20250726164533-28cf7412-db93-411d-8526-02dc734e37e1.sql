-- Fix security warning: Set proper search path for the function
DROP FUNCTION IF EXISTS public.user_is_chat_member(uuid, uuid);

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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';