-- Add KYB verification fields to profiles table for institutional users

-- Create enum types for KYB status and verification type
CREATE TYPE public.kyb_status AS ENUM ('verified', 'not_verified', 'pending');
CREATE TYPE public.kyb_verification_type AS ENUM ('basic', 'full');

-- Add KYB fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN kyb_status kyb_status DEFAULT 'not_verified',
ADD COLUMN kyb_provider TEXT,
ADD COLUMN kyb_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN kyb_verification_type kyb_verification_type;

-- Set default kyb_status for existing institutional users
UPDATE public.profiles 
SET kyb_status = 'not_verified' 
WHERE trader_type = 'Institutional';