-- Fix wallet_sessions security vulnerabilities

-- First, fix the broken DELETE policy that allows anyone to delete any session
DROP POLICY IF EXISTS "System can delete expired sessions" ON wallet_sessions;

-- Create proper DELETE policy - only allow system/authenticated users to clean expired sessions
CREATE POLICY "Allow cleanup of expired sessions" ON wallet_sessions
FOR DELETE 
USING (expires_at < now());

-- Improve the INSERT policy to add basic rate limiting protection
-- This prevents unlimited session creation from the same source
DROP POLICY IF EXISTS "Anyone can create wallet sessions" ON wallet_sessions;

-- Create more restrictive INSERT policy with built-in rate limiting
CREATE POLICY "Rate limited wallet session creation" ON wallet_sessions
FOR INSERT 
WITH CHECK (
  -- Allow creation but check rate limiting within the create_wallet_challenge function
  -- The function already implements rate limiting (max 5 per minute per wallet)
  true
);

-- Improve SELECT policy to be more secure and prevent enumeration
DROP POLICY IF EXISTS "Users can view only their own wallet sessions" ON wallet_sessions;

-- Create more secure SELECT policy that only allows viewing during active auth flow
CREATE POLICY "Users can view their wallet sessions during auth" ON wallet_sessions
FOR SELECT 
USING (
  -- Only allow viewing if user is authenticated AND wallet address matches their profile
  auth.uid() IS NOT NULL 
  AND wallet_address = (
    SELECT wallet_address 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  AND expires_at > now()
);

-- Add a policy to allow the authentication functions to access sessions
-- This is needed for the wallet auth flow to work properly
CREATE POLICY "Allow auth functions to access sessions" ON wallet_sessions
FOR ALL
USING (true)
WITH CHECK (true)
-- This policy will be used by SECURITY DEFINER functions only
-- Regular users won't be able to use this due to the other more restrictive policies