-- Fix KYC verifications security issues

-- First, ensure all existing records have valid user_ids
UPDATE kyc_verifications 
SET user_id = (
    SELECT id FROM auth.users LIMIT 1
) 
WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent RLS bypass
ALTER TABLE kyc_verifications 
ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint to link to profiles table
ALTER TABLE kyc_verifications 
ADD CONSTRAINT fk_kyc_verifications_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add unique constraint to ensure one KYC record per user
ALTER TABLE kyc_verifications 
ADD CONSTRAINT unique_kyc_per_user 
UNIQUE (user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id 
ON kyc_verifications(user_id);