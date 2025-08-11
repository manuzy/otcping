-- Fix security issue: Restrict public profile access to authenticated users only
-- This prevents unauthenticated users from accessing personal data for phishing attacks

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create a more secure policy that requires authentication
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
USING (is_public = true AND auth.uid() IS NOT NULL);

-- The existing "Users can view their own profile" policy remains unchanged for self-access