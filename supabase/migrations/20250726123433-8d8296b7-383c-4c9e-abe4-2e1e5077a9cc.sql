-- Update the validate_profile_input function to allow trusted API domains without file extensions
CREATE OR REPLACE FUNCTION public.validate_profile_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- Validate avatar URL with support for API domains
    IF NEW.avatar IS NOT NULL AND LENGTH(NEW.avatar) > 0 THEN
        -- Limit URL length first
        NEW.avatar := SUBSTRING(NEW.avatar FROM 1 FOR 500);
        
        -- Check if it's a valid HTTPS URL
        IF NOT (NEW.avatar ~ '^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/') THEN
            NEW.avatar := NULL;
        ELSE
            -- Define trusted API domains that don't require file extensions
            DECLARE
                trusted_api_domains TEXT[] := ARRAY[
                    'avatars.githubusercontent.com',
                    'ui-avatars.com', 
                    'avataaars.io',
                    'gravatar.com',
                    'www.gravatar.com',
                    'secure.gravatar.com'
                ];
                domain_pattern TEXT;
                is_trusted_api BOOLEAN := FALSE;
                url_domain TEXT;
            BEGIN
                -- Extract domain from URL
                url_domain := SUBSTRING(NEW.avatar FROM 'https://([^/]+)');
                
                -- Check if domain is in trusted API list
                FOREACH domain_pattern IN ARRAY trusted_api_domains LOOP
                    IF url_domain = domain_pattern OR url_domain LIKE '%.' || domain_pattern THEN
                        is_trusted_api := TRUE;
                        EXIT;
                    END IF;
                END LOOP;
                
                -- If it's not a trusted API domain, require file extension
                IF NOT is_trusted_api THEN
                    IF NOT (NEW.avatar ~ '^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$') THEN
                        NEW.avatar := NULL;
                    END IF;
                END IF;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$