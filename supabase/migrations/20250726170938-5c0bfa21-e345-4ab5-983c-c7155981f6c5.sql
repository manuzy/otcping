-- Change the default value of is_public column to true
ALTER TABLE public.profiles 
ALTER COLUMN is_public SET DEFAULT true;