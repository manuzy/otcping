-- Fix institutions table RLS policies completely to prevent infinite recursion

-- First, disable RLS temporarily to avoid issues during policy recreation
ALTER TABLE public.institutions DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on institutions table
DROP POLICY IF EXISTS "Users can view institutions they belong to" ON public.institutions;
DROP POLICY IF EXISTS "Users can insert institutions they create" ON public.institutions;
DROP POLICY IF EXISTS "Institution creators can update their institutions" ON public.institutions;
DROP POLICY IF EXISTS "Institution creators can delete their institutions" ON public.institutions;
DROP POLICY IF EXISTS "Authenticated users can create institutions" ON public.institutions;
DROP POLICY IF EXISTS "Institution admins can update their institutions" ON public.institutions;
DROP POLICY IF EXISTS "Institution creators can delete" ON public.institutions;
DROP POLICY IF EXISTS "Institution creators can update" ON public.institutions;
DROP POLICY IF EXISTS "Public institution data viewable by authenticated users" ON public.institutions;
DROP POLICY IF EXISTS "Users can create institutions" ON public.institutions;

-- Create a security definer function to check if user is institution member
CREATE OR REPLACE FUNCTION public.user_is_institution_member(institution_id uuid, user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is a member of the institution
  RETURN EXISTS (
    SELECT 1 FROM public.institution_members 
    WHERE institution_members.institution_id = user_is_institution_member.institution_id 
    AND institution_members.user_id = user_is_institution_member.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Re-enable RLS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Create new safe policies using the security definer function
CREATE POLICY "Users can view institutions they belong to" 
ON public.institutions FOR SELECT 
USING (
  created_by = auth.uid() OR 
  public.user_is_institution_member(id, auth.uid())
);

CREATE POLICY "Users can create institutions" 
ON public.institutions FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Institution creators can update" 
ON public.institutions FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Institution creators can delete" 
ON public.institutions FOR DELETE 
USING (created_by = auth.uid());