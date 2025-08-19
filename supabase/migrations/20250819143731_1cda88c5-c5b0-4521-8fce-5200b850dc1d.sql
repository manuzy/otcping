-- Fix critical RLS policy vulnerabilities

-- 1. Fix beta_users table - prevent email harvesting
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Users can view their own beta status" ON public.beta_users;

-- Create secure policy that only allows users to see their own data
CREATE POLICY "Users can view their own beta status"
ON public.beta_users
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can still view all (this policy already exists and is secure)

-- 2. Secure institution_financials table (if it exists - add proper RLS)
-- First check if table exists and add RLS if missing
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'institution_financials') THEN
        -- Enable RLS if not already enabled
        ALTER TABLE public.institution_financials ENABLE ROW LEVEL SECURITY;
        
        -- Drop any overly permissive policies
        DROP POLICY IF EXISTS "Public access to institution financials" ON public.institution_financials;
        
        -- Create secure policies
        CREATE POLICY "Institution creators can manage financials"
        ON public.institution_financials
        FOR ALL
        USING (user_is_institution_creator(institution_id));
        
        CREATE POLICY "Institution members can view financials"
        ON public.institution_financials
        FOR SELECT
        USING (user_is_institution_member(institution_id, auth.uid()));
    END IF;
END $$;

-- 3. Add audit logging trigger for sensitive beta data access
CREATE OR REPLACE FUNCTION public.audit_beta_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when admin views beta user data
    IF auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role) THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            metadata,
            severity
        ) VALUES (
            auth.uid(),
            'VIEW_BETA_USER_DATA',
            'beta_users',
            NEW.id,
            jsonb_build_object(
                'viewed_user_id', NEW.user_id,
                'wallet_address', NEW.wallet_address,
                'email', NEW.email
            ),
            'medium'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Add trigger for beta user data access auditing
DROP TRIGGER IF EXISTS audit_beta_access_trigger ON public.beta_users;
CREATE TRIGGER audit_beta_access_trigger
    AFTER SELECT ON public.beta_users
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_beta_access();

-- 4. Enhance institution contact security with audit logging
CREATE OR REPLACE FUNCTION public.audit_institution_data_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log access to sensitive institution data
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        metadata,
        severity
    ) VALUES (
        auth.uid(),
        'VIEW_INSTITUTION_DATA',
        TG_TABLE_NAME,
        NEW.id,
        jsonb_build_object(
            'institution_id', NEW.institution_id,
            'table', TG_TABLE_NAME
        ),
        'medium'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Add audit triggers to sensitive institution tables
DROP TRIGGER IF EXISTS audit_institution_contacts_access ON public.institution_contacts;
CREATE TRIGGER audit_institution_contacts_access
    AFTER SELECT ON public.institution_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_institution_data_access();

DROP TRIGGER IF EXISTS audit_institution_aml_access ON public.institution_aml_program;
CREATE TRIGGER audit_institution_aml_access
    AFTER SELECT ON public.institution_aml_program
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_institution_data_access();

-- 5. Add rate limiting for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    action_count integer NOT NULL DEFAULT 1,
    window_start timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
ON public.security_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    action_type_param text,
    max_attempts integer DEFAULT 10,
    window_minutes integer DEFAULT 60
)
RETURNS boolean AS $$
DECLARE
    current_attempts integer;
    window_start_time timestamp with time zone;
BEGIN
    window_start_time := now() - (window_minutes || ' minutes')::interval;
    
    -- Count attempts in current window
    SELECT COALESCE(SUM(action_count), 0) INTO current_attempts
    FROM public.security_rate_limits
    WHERE user_id = auth.uid()
    AND action_type = action_type_param
    AND window_start > window_start_time;
    
    -- Clean up old records
    DELETE FROM public.security_rate_limits
    WHERE window_start < window_start_time;
    
    -- Check if limit exceeded
    IF current_attempts >= max_attempts THEN
        RETURN false;
    END IF;
    
    -- Record this attempt
    INSERT INTO public.security_rate_limits (user_id, action_type)
    VALUES (auth.uid(), action_type_param)
    ON CONFLICT (user_id, action_type, window_start) 
    DO UPDATE SET action_count = security_rate_limits.action_count + 1;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';