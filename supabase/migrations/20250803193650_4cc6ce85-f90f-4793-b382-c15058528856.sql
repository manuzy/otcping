-- Add unique constraint on user_id to allow upsert operations
ALTER TABLE public.admin_settings 
ADD CONSTRAINT admin_settings_user_id_unique UNIQUE (user_id);