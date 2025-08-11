-- Fix critical security vulnerability: Restrict trades table access
-- Currently ALL trades are publicly readable, exposing sensitive trading data

-- Drop the overly permissive policy that allows everyone to see all trades
DROP POLICY IF EXISTS "Public trades are viewable by everyone" ON public.trades;

-- Create secure policies that protect sensitive trading data
-- 1. Users can always view their own trades
CREATE POLICY "Users can view their own trades" 
ON public.trades 
FOR SELECT 
USING (auth.uid() = created_by);

-- 2. Trades are only viewable by others if they're associated with a public chat
-- This maintains the public trading functionality while protecting sensitive data
CREATE POLICY "Public trades viewable through public chats only" 
ON public.trades 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.trade_id = trades.id 
    AND chats.is_public = true
  )
);