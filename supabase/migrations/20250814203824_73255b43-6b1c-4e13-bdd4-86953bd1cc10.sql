-- Fix infinite recursion in institution_members RLS policies
-- First, drop the existing problematic policies
DROP POLICY IF EXISTS "Users can view institution members" ON public.institution_members;
DROP POLICY IF EXISTS "Institution creators can add members" ON public.institution_members;
DROP POLICY IF EXISTS "Institution creators can update members" ON public.institution_members;
DROP POLICY IF EXISTS "Institution creators can remove members" ON public.institution_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_institution_creator(institution_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if current user created the institution
  RETURN EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE id = institution_id AND created_by = auth.uid()
  );
END;
$$;

-- Create new RLS policies using security definer functions
CREATE POLICY "Users can view institution members" 
ON public.institution_members 
FOR SELECT 
USING (
  -- User is the institution creator OR user is a member of the institution
  user_is_institution_creator(institution_id) OR 
  user_is_institution_member(institution_id, auth.uid())
);

CREATE POLICY "Institution creators can add members" 
ON public.institution_members 
FOR INSERT 
WITH CHECK (
  user_is_institution_creator(institution_id)
);

CREATE POLICY "Institution creators can update members" 
ON public.institution_members 
FOR UPDATE 
USING (
  user_is_institution_creator(institution_id)
);

CREATE POLICY "Institution creators can remove members" 
ON public.institution_members 
FOR DELETE 
USING (
  -- Institution creator can remove any member OR user can remove themselves
  user_is_institution_creator(institution_id) OR 
  (auth.uid() = user_id)
);