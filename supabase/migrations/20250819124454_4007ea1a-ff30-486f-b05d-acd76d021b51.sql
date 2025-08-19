-- Create beta_settings table for global beta phase control
CREATE TABLE public.beta_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_beta_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create beta_users table for approved beta users
CREATE TABLE public.beta_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  display_name text NOT NULL,
  email text,
  telegram text,
  referral_name text,
  is_active boolean NOT NULL DEFAULT true,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(wallet_address)
);

-- Enable RLS
ALTER TABLE public.beta_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for beta_settings (admin only)
CREATE POLICY "Admins can view beta settings" 
ON public.beta_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update beta settings" 
ON public.beta_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert beta settings" 
ON public.beta_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for beta_users
CREATE POLICY "Admins can manage all beta users" 
ON public.beta_users 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own beta status" 
ON public.beta_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can apply for beta" 
ON public.beta_users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to check beta access
CREATE OR REPLACE FUNCTION public.has_beta_access(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    beta_active boolean;
    user_approved boolean;
BEGIN
    -- Check if beta is active
    SELECT is_beta_active INTO beta_active
    FROM beta_settings
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If beta is not active, everyone has access
    IF beta_active IS NULL OR beta_active = false THEN
        RETURN true;
    END IF;
    
    -- If beta is active, check if user is approved
    SELECT is_active INTO user_approved
    FROM beta_users
    WHERE user_id = check_user_id;
    
    RETURN COALESCE(user_approved, false);
END;
$$;

-- Create function to get beta settings
CREATE OR REPLACE FUNCTION public.get_beta_settings()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    settings_record beta_settings%ROWTYPE;
BEGIN
    SELECT * INTO settings_record
    FROM beta_settings
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Return default settings if none exist
        RETURN json_build_object('is_beta_active', false);
    END IF;
    
    RETURN row_to_json(settings_record);
END;
$$;

-- Insert default beta settings (inactive by default)
INSERT INTO public.beta_settings (is_beta_active) VALUES (false);

-- Migrate existing users to beta_users table
INSERT INTO public.beta_users (user_id, wallet_address, display_name, email, is_active, approved_by)
SELECT 
    p.id,
    COALESCE(p.wallet_address, 'unknown'),
    p.display_name,
    au.email,
    true,
    p.id -- Self-approved for existing users
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
ON CONFLICT (user_id) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_beta_settings_updated_at
    BEFORE UPDATE ON public.beta_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beta_users_updated_at
    BEFORE UPDATE ON public.beta_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();