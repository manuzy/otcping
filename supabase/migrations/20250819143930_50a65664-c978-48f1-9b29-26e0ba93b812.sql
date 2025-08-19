-- Fix critical RLS policy vulnerabilities (corrected)

-- 1. Fix beta_users table - prevent email harvesting
-- Drop existing overly permissive policy if it exists
DROP POLICY IF EXISTS "Users can view their own beta status" ON public.beta_users;

-- Create secure policy that only allows users to see their own data
CREATE POLICY "Users can view their own beta status"
ON public.beta_users
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Secure institution_financials table (if it exists - add proper RLS)
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

-- 3. Add security monitoring function for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
    resource_type_param text,
    resource_id_param uuid,
    metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    -- Only log if user is authenticated
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            metadata,
            severity
        ) VALUES (
            auth.uid(),
            'VIEW_SENSITIVE_DATA',
            resource_type_param,
            resource_id_param,
            metadata_param,
            'medium'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 4. Add rate limiting table and function for security
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    attempt_count integer NOT NULL DEFAULT 1,
    window_start timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id, action_type, window_start)
);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for rate limits table
CREATE POLICY "Users can view their own rate limits"
ON public.security_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert rate limit records
CREATE POLICY "System can manage rate limits"
ON public.security_rate_limits
FOR ALL
USING (true);

-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    action_type_param text,
    max_attempts integer DEFAULT 10,
    window_minutes integer DEFAULT 60
)
RETURNS boolean AS $$
DECLARE
    current_attempts integer;
    window_start_time timestamp with time zone;
    current_window timestamp with time zone;
BEGIN
    -- Return true if user not authenticated (no rate limiting for anonymous)
    IF auth.uid() IS NULL THEN
        RETURN true;
    END IF;
    
    current_window := date_trunc('hour', now());
    window_start_time := current_window - (window_minutes || ' minutes')::interval;
    
    -- Count attempts in current window
    SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
    FROM public.security_rate_limits
    WHERE user_id = auth.uid()
    AND action_type = action_type_param
    AND window_start >= window_start_time;
    
    -- Clean up old records (older than 24 hours)
    DELETE FROM public.security_rate_limits
    WHERE window_start < now() - interval '24 hours';
    
    -- Check if limit exceeded
    IF current_attempts >= max_attempts THEN
        -- Log rate limit violation
        PERFORM log_sensitive_data_access(
            'rate_limit_violation',
            gen_random_uuid(),
            jsonb_build_object(
                'action_type', action_type_param,
                'current_attempts', current_attempts,
                'max_attempts', max_attempts
            )
        );
        RETURN false;
    END IF;
    
    -- Record this attempt
    INSERT INTO public.security_rate_limits (user_id, action_type, window_start)
    VALUES (auth.uid(), action_type_param, current_window)
    ON CONFLICT (user_id, action_type, window_start) 
    DO UPDATE SET attempt_count = security_rate_limits.attempt_count + 1;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 5. Enhanced security for institution data
-- Add additional checks for institution data access
CREATE OR REPLACE FUNCTION public.secure_institution_access()
RETURNS boolean AS $$
BEGIN
    -- Rate limit institution data access
    IF NOT check_rate_limit('institution_data_access', 50, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded for institution data access';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';