-- Fix institution_contacts RLS policies with more restrictive approach
-- Drop all existing policies first
DROP POLICY IF EXISTS "Authenticated users only" ON public.institution_contacts;
DROP POLICY IF EXISTS "Deny anonymous access" ON public.institution_contacts;
DROP POLICY IF EXISTS "Institution creators can manage contacts" ON public.institution_contacts;
DROP POLICY IF EXISTS "Institution members can view contacts" ON public.institution_contacts;

-- Create new restrictive policies that explicitly deny all access by default

-- Policy 1: Institution creators can manage all aspects of contacts for their institutions
CREATE POLICY "Institution creators full access"
ON public.institution_contacts
FOR ALL
TO authenticated
USING (user_is_institution_creator(institution_id))
WITH CHECK (user_is_institution_creator(institution_id));

-- Policy 2: Institution members can only view contacts for their institutions  
CREATE POLICY "Institution members read access"
ON public.institution_contacts
FOR SELECT
TO authenticated
USING (user_is_institution_member(institution_id, auth.uid()));

-- Ensure RLS is enabled (it should already be, but double-check)
ALTER TABLE public.institution_contacts ENABLE ROW LEVEL SECURITY;

-- Force RLS for owners as well (this ensures even table owners must follow RLS)
ALTER TABLE public.institution_contacts FORCE ROW LEVEL SECURITY;