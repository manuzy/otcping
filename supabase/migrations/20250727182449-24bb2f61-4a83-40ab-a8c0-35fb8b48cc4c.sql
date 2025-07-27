-- Add email_frequency field to notification_settings table
ALTER TABLE notification_settings 
ADD COLUMN email_frequency TEXT DEFAULT 'first_only' CHECK (email_frequency IN ('all', 'first_only'));