-- Fix RLS policy for chats table to allow authenticated users to create chats
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

CREATE POLICY "Users can create chats" 
ON public.chats 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure chat_participants policies are correct for direct message creation
DROP POLICY IF EXISTS "Users can join chats" ON public.chat_participants;

CREATE POLICY "Users can join chats" 
ON public.chat_participants 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);