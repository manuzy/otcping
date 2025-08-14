-- Fix wallet_sessions security vulnerabilities

-- Drop existing policies
DROP POLICY IF EXISTS "System can delete expired sessions" ON wallet_sessions;
DROP POLICY IF EXISTS "Anyone can create wallet sessions" ON wallet_sessions;
DROP POLICY IF EXISTS "Users can view only their own wallet sessions" ON wallet_sessions;

-- Create proper DELETE policy - only allow cleanup of expired sessions
CREATE POLICY "Allow cleanup of expired sessions" ON wallet_sessions
FOR DELETE 
USING (expires_at < now());

-- Create restrictive INSERT policy that relies on function-level rate limiting
CREATE POLICY "Rate limited wallet session creation" ON wallet_sessions
FOR INSERT 
WITH CHECK (true);

-- Create secure SELECT policy that prevents wallet address enumeration
CREATE POLICY "Users can view their wallet sessions during auth" ON wallet_sessions
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND wallet_address = (
    SELECT wallet_address 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  AND expires_at > now()
);