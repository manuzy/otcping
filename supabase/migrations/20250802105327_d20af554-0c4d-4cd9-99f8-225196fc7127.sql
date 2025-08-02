-- Add RLS policy for viewing public chats with trades
CREATE POLICY "Anyone can view public chats with trades" 
ON public.chats 
FOR SELECT 
USING (is_public = true AND trade_id IS NOT NULL);