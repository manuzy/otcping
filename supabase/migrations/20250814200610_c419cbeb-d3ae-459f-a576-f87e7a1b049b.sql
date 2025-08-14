-- Fix function search path security warning
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;