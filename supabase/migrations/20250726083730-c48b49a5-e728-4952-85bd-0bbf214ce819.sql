-- Tighten wallet sessions RLS policy for better security
DROP POLICY IF EXISTS "Users can view their own active sessions" ON public.wallet_sessions;

CREATE POLICY "Users can view only their own wallet sessions" 
ON public.wallet_sessions 
FOR SELECT 
USING (wallet_address = (
  SELECT raw_user_meta_data->>'wallet_address' 
  FROM auth.users 
  WHERE id = auth.uid()
) AND expires_at > now());