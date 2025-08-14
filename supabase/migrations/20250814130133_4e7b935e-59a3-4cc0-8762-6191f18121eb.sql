-- Phase 11: Security & Configuration Hardening
-- Step 1: Database performance indexes for common query patterns

-- Index for profile lookups by wallet address (used frequently in auth)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_wallet_address 
ON public.profiles(wallet_address) WHERE wallet_address IS NOT NULL;

-- Index for chat participant lookups (used in message queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_participants_chat_user 
ON public.chat_participants(chat_id, user_id);

-- Index for unread message counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_participants_unread 
ON public.chat_participants(user_id, unread_count) WHERE unread_count > 0;

-- Index for active trades lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_status_created 
ON public.trades(status, created_at) WHERE status = 'active';

-- Index for KYC verification lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kyc_verifications_user_level 
ON public.kyc_verifications(user_id, verification_level);

-- Index for ratings by rated user (for reputation calculation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_rated_user_value 
ON public.ratings(rated_user_id, rating_value);

-- Step 2: Create audit logging table for sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND id = '2f5dd2ac-16b8-4e42-b1d5-3990c6a96b8f'
    )
);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);

-- Step 3: Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_values JSONB := NULL;
    new_values JSONB := NULL;
BEGIN
    -- Capture old values for UPDATE and DELETE
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        old_values := to_jsonb(OLD);
    END IF;
    
    -- Capture new values for INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        new_values := to_jsonb(NEW);
    END IF;
    
    -- Insert audit record
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_values,
        new_values
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Add audit triggers to sensitive tables
CREATE TRIGGER audit_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_kyc_verifications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.kyc_verifications
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_trades_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Step 5: Create API usage tracking table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    api_endpoint TEXT NOT NULL,
    request_method TEXT NOT NULL,
    response_status INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on API usage logs
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view API usage logs
CREATE POLICY "Admins can view API usage logs" ON public.api_usage_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND id = '2f5dd2ac-16b8-4e42-b1d5-3990c6a96b8f'
    )
);

-- System can insert API usage logs
CREATE POLICY "System can insert API usage logs" ON public.api_usage_logs
FOR INSERT WITH CHECK (true);

-- Step 6: Add indexes for audit and API logs for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_created 
ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_table_action 
ON public.audit_logs(table_name, action, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_logs_endpoint_created 
ON public.api_usage_logs(api_endpoint, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_logs_user_created 
ON public.api_usage_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;