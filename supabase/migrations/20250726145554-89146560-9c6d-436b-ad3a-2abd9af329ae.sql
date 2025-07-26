-- Fix the auth_uid_test function to have a proper search path
DROP FUNCTION IF EXISTS auth_uid_test();

CREATE OR REPLACE FUNCTION auth_uid_test()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;