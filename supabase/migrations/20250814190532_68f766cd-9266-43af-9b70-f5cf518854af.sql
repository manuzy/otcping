-- Fix infinite recursion in institution_members RLS policies
-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Institution admins can manage members" ON public.institution_members;
DROP POLICY IF EXISTS "Users can view members of institutions they belong to" ON public.institution_members;
DROP POLICY IF EXISTS "Users can join institutions" ON public.institution_members;

-- Create safe policies that don't cause recursion
-- Policy 1: Users can view members of institutions they created OR institutions they belong to
CREATE POLICY "Users can view institution members" 
ON public.institution_members 
FOR SELECT 
USING (
  -- User created the institution
  EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE institutions.id = institution_members.institution_id 
    AND institutions.created_by = auth.uid()
  )
  OR 
  -- User is a member of the institution (direct check without recursion)
  EXISTS (
    SELECT 1 FROM public.institution_members im2
    WHERE im2.institution_id = institution_members.institution_id 
    AND im2.user_id = auth.uid()
  )
);

-- Policy 2: Only institution creators can add members
CREATE POLICY "Institution creators can add members" 
ON public.institution_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE institutions.id = institution_members.institution_id 
    AND institutions.created_by = auth.uid()
  )
);

-- Policy 3: Only institution creators can update member roles
CREATE POLICY "Institution creators can update members" 
ON public.institution_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE institutions.id = institution_members.institution_id 
    AND institutions.created_by = auth.uid()
  )
);

-- Policy 4: Institution creators and users themselves can remove members
CREATE POLICY "Institution creators can remove members" 
ON public.institution_members 
FOR DELETE 
USING (
  -- Institution creator can remove any member
  EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE institutions.id = institution_members.institution_id 
    AND institutions.created_by = auth.uid()
  )
  OR 
  -- Users can remove themselves
  auth.uid() = user_id
);