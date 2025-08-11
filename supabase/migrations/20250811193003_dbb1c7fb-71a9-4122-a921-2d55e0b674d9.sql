-- Fix remaining security issues with trades and chats access

-- First, let's see what RLS policies currently exist on chats
-- The security scan indicates chats are also publicly readable

-- Drop any overly permissive chat policies
DROP POLICY IF EXISTS "Anyone can view public chats with trades" ON public.chats;

-- Create secure chat policies
-- 1. Users can always view chats they created
CREATE POLICY "Users can view their own chats" 
ON public.chats 
FOR SELECT 
USING (auth.uid() = created_by);

-- 2. Users can view chats they participate in
CREATE POLICY "Users can view chats they participate in" 
ON public.chats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_participants.chat_id = chats.id 
    AND chat_participants.user_id = auth.uid()
  )
);

-- 3. Only allow public chats with trades to be viewed by authenticated users
-- This is more restrictive than the previous "anyone can view" policy
CREATE POLICY "Public chats with trades viewable by authenticated users" 
ON public.chats 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_public = true 
  AND trade_id IS NOT NULL
);

-- Additional security: Ensure trades can only be accessed through proper chat relationships
-- Update the trades policy to be more explicit about the relationship
DROP POLICY IF EXISTS "Public trades viewable through public chats only" ON public.trades;

CREATE POLICY "Trades viewable through authorized chat access" 
ON public.trades 
FOR SELECT 
USING (
  -- Users can see their own trades
  auth.uid() = created_by 
  OR 
  -- Users can see trades through chats they have access to
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.trade_id = trades.id 
    AND (
      -- Either they created the chat
      chats.created_by = auth.uid()
      OR 
      -- Or they participate in the chat
      EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE chat_participants.chat_id = chats.id 
        AND chat_participants.user_id = auth.uid()
      )
      OR
      -- Or it's a public chat with a trade (for public trading functionality)
      (chats.is_public = true AND chats.trade_id IS NOT NULL AND auth.uid() IS NOT NULL)
    )
  )
);