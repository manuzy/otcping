-- Critical Security Fix: Secure Beta Users Table
-- Fix customer email and phone number exposure vulnerability

-- Drop existing problematic policies that allow unauthorized access
DROP POLICY IF EXISTS "Anyone can apply for beta" ON public.beta_users;
DROP POLICY IF EXISTS "Users can view their own beta status" ON public.beta_users;
DROP POLICY IF EXISTS "Admins can manage all beta users" ON public.beta_users;

-- Create secure policies that prevent data harvesting
CREATE POLICY "Users can apply for beta access" 
ON public.beta_users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view only their own beta status" 
ON public.beta_users 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins retain full access for management purposes
CREATE POLICY "Admins can manage all beta users" 
ON public.beta_users 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add audit logging function for sensitive data access
CREATE OR REPLACE FUNCTION log_beta_user_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log sensitive beta user data access
    PERFORM log_sensitive_data_access(
        'beta_user',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'operation', TG_OP,
            'user_id', COALESCE(NEW.user_id, OLD.user_id),
            'email_accessed', CASE WHEN NEW.email IS NOT NULL OR OLD.email IS NOT NULL THEN true ELSE false END
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit logging for beta user modifications
CREATE TRIGGER audit_beta_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON beta_users
    FOR EACH ROW
    EXECUTE FUNCTION log_beta_user_access();