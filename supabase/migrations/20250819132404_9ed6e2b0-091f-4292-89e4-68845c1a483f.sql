-- Ensure institution_contacts table is properly secured
-- First, let's add a policy that explicitly denies access to unauthenticated users
-- and users who are not members of the institution

-- Drop existing policies to recreate them with more explicit security
DROP POLICY IF EXISTS "Institution creators can manage contacts" ON public.institution_contacts;
DROP POLICY IF EXISTS "Institution members can view contacts" ON public.institution_contacts;

-- Create comprehensive RLS policies that explicitly deny unauthorized access

-- Policy 1: Only authenticated users can access contacts
CREATE POLICY "Authenticated users only"
ON public.institution_contacts
FOR ALL
TO authenticated
USING (false); -- This acts as a base denial policy

-- Policy 2: Institution creators can manage all aspects of contacts
CREATE POLICY "Institution creators can manage contacts"
ON public.institution_contacts
FOR ALL
TO authenticated
USING (user_is_institution_creator(institution_id))
WITH CHECK (user_is_institution_creator(institution_id));

-- Policy 3: Institution members can only view contacts
CREATE POLICY "Institution members can view contacts"
ON public.institution_contacts
FOR SELECT
TO authenticated
USING (user_is_institution_member(institution_id, auth.uid()));

-- Policy 4: Explicit denial for anonymous users
CREATE POLICY "Deny anonymous access"
ON public.institution_contacts
FOR ALL
TO anon
USING (false);