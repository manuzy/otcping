-- Add global_theme field to admin_settings table
ALTER TABLE public.admin_settings 
ADD COLUMN global_theme text DEFAULT 'system';