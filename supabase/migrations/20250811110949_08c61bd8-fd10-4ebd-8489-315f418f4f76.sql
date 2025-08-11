-- Add KYC verification tracking table
CREATE TABLE public.kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sumsub_applicant_id TEXT UNIQUE,
  review_status TEXT,
  verification_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on kyc_verifications
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for kyc_verifications
CREATE POLICY "Users can view their own KYC verifications" 
ON public.kyc_verifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own KYC verifications" 
ON public.kyc_verifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own KYC verifications" 
ON public.kyc_verifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add Sumsub integration columns to profiles table
ALTER TABLE public.profiles ADD COLUMN sumsub_applicant_id TEXT;
ALTER TABLE public.profiles ADD COLUMN kyc_verification_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN kyc_documents_status JSONB DEFAULT '{}'::jsonb;

-- Create trigger for automatic timestamp updates on kyc_verifications
CREATE TRIGGER update_kyc_verifications_updated_at
BEFORE UPDATE ON public.kyc_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();