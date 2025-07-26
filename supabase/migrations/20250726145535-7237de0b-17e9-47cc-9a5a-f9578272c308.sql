-- Create a simple function to test auth.uid() context
CREATE OR REPLACE FUNCTION auth_uid_test()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;