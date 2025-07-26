-- Fix search path security warnings for remaining functions

-- Fix validate_profile_input function
CREATE OR REPLACE FUNCTION public.validate_profile_input()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Validate display_name length and content
    IF NEW.display_name IS NOT NULL THEN
        NEW.display_name := SUBSTRING(trim(NEW.display_name) FROM 1 FOR 100);
        IF LENGTH(NEW.display_name) = 0 THEN
            NEW.display_name := NEW.wallet_address;
        END IF;
    END IF;
    
    -- Validate and sanitize description
    IF NEW.description IS NOT NULL THEN
        NEW.description := SUBSTRING(trim(NEW.description) FROM 1 FOR 500);
    END IF;
    
    -- Validate avatar URL (basic check)
    IF NEW.avatar IS NOT NULL AND LENGTH(NEW.avatar) > 0 THEN
        IF NOT (NEW.avatar ~ '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$') THEN
            NEW.avatar := NULL; -- Remove invalid URLs
        ELSE
            NEW.avatar := SUBSTRING(NEW.avatar FROM 1 FOR 500); -- Limit URL length
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix cleanup_expired_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    DELETE FROM wallet_sessions WHERE expires_at < now();
END;
$$;