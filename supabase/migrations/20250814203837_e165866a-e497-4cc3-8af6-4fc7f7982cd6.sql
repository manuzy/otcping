-- Fix the search_path security warning for the function
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