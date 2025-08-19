-- Fix critical security vulnerabilities - targeted approach

-- 1. Fix beta_users table - prevent email harvesting
-- Only recreate if policy doesn't already restrict properly
DO $$
BEGIN
    -- Drop and recreate the policy to ensure it's restrictive
    DROP POLICY IF EXISTS "Users can view their own beta status" ON public.beta_users;
    
    -- Create secure policy that only allows users to see their own data
    CREATE POLICY "Users can view their own beta status"
    ON public.beta_users
    FOR SELECT
    USING (auth.uid() = user_id);
    
    -- Ensure admins can still manage all beta users (if policy doesn't exist)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'beta_users' 
        AND policyname = 'Admins can manage all beta users'
    ) THEN
        CREATE POLICY "Admins can manage all beta users"
        ON public.beta_users
        FOR ALL
        USING (has_role(auth.uid(), 'admin'::app_role));
    END IF;
END $$;

-- 2. Add security monitoring function for sensitive data access
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
EXCEPTION
    WHEN OTHERS THEN
        -- Silently fail to avoid breaking functionality
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 3. Add rate limiting table for security (only if doesn't exist)
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    attempt_count integer NOT NULL DEFAULT 1,
    window_start timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id, action_type, window_start)
);

-- Enable RLS and add policies only if table was just created
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;
    
    -- Add policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_rate_limits' 
        AND policyname = 'Users can view their own rate limits'
    ) THEN
        CREATE POLICY "Users can view their own rate limits"
        ON public.security_rate_limits
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_rate_limits' 
        AND policyname = 'System can manage rate limits'
    ) THEN
        CREATE POLICY "System can manage rate limits"
        ON public.security_rate_limits
        FOR ALL
        USING (true);
    END IF;
END $$;

-- 4. Rate limiting function
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
EXCEPTION
    WHEN OTHERS THEN
        -- Allow operation to continue if rate limiting fails
        RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';