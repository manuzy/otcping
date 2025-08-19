-- Critical Security Fix: Secure Beta Users Table
-- Remove public access to sensitive data like emails, display names, and Telegram handles

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Anyone can apply for beta" ON public.beta_users;
DROP POLICY IF EXISTS "Users can view their own beta status" ON public.beta_users;

-- Create secure policies that prevent data harvesting
CREATE POLICY "Users can apply for beta access" 
ON public.beta_users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view only their own beta status" 
ON public.beta_users 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins retain full access for management
CREATE POLICY "Admins can manage all beta users" 
ON public.beta_users 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add audit logging for sensitive data access on critical tables
CREATE OR REPLACE FUNCTION log_institution_data_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log access to sensitive institution data
    PERFORM log_sensitive_data_access(
        CASE 
            WHEN TG_TABLE_NAME = 'institution_contacts' THEN 'institution_contact'
            WHEN TG_TABLE_NAME = 'institution_aml_program' THEN 'institution_aml'
            WHEN TG_TABLE_NAME = 'institution_financials' THEN 'institution_financial'
            WHEN TG_TABLE_NAME = 'institution_ownership' THEN 'institution_ownership'
            ELSE TG_TABLE_NAME
        END,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'institution_id', COALESCE(NEW.institution_id, OLD.institution_id)
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit logging triggers for sensitive institution tables
CREATE TRIGGER audit_institution_contacts_access
    AFTER SELECT ON institution_contacts
    FOR EACH ROW
    EXECUTE FUNCTION log_institution_data_access();

CREATE TRIGGER audit_institution_aml_access
    AFTER SELECT ON institution_aml_program
    FOR EACH ROW
    EXECUTE FUNCTION log_institution_data_access();

CREATE TRIGGER audit_institution_ownership_access
    AFTER SELECT ON institution_ownership
    FOR EACH ROW
    EXECUTE FUNCTION log_institution_data_access();

-- Add rate limiting for bulk data access attempts
CREATE OR REPLACE FUNCTION check_bulk_access_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- Rate limit bulk institution data access
    IF NOT check_rate_limit('bulk_institution_access', 50, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded for bulk data access. Please try again later.'
            USING HINT = 'Too many data access requests in a short period.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply rate limiting to sensitive tables
CREATE TRIGGER rate_limit_institution_contacts
    BEFORE SELECT ON institution_contacts
    FOR EACH ROW
    EXECUTE FUNCTION check_bulk_access_rate_limit();

CREATE TRIGGER rate_limit_institution_aml
    BEFORE SELECT ON institution_aml_program
    FOR EACH ROW
    EXECUTE FUNCTION check_bulk_access_rate_limit();

-- Add enhanced audit logging for beta user access attempts
CREATE TRIGGER audit_beta_users_access
    AFTER SELECT ON beta_users
    FOR EACH ROW
    EXECUTE FUNCTION log_institution_data_access();