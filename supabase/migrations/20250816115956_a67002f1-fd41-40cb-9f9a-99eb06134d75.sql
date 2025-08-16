-- Fix the search path security warning for update_message_search_vector function
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$;