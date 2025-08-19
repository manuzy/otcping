-- Fix database function security vulnerabilities by adding proper search_path restrictions

-- Update calculate_user_reputation function
CREATE OR REPLACE FUNCTION public.calculate_user_reputation(user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    avg_rating DECIMAL;
BEGIN
    -- Calculate average rating for the user
    SELECT AVG(rating_value) INTO avg_rating
    FROM ratings
    WHERE rated_user_id = user_id;
    
    -- Update the user's reputation (default to 0 if no ratings)
    UPDATE profiles 
    SET reputation = COALESCE(avg_rating, 0)
    WHERE id = user_id;
END;
$function$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'avatar', '')
    );
    RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Update update_reputation_on_rating_change function
CREATE OR REPLACE FUNCTION public.update_reputation_on_rating_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Update reputation for the rated user
    PERFORM calculate_user_reputation(COALESCE(NEW.rated_user_id, OLD.rated_user_id));
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update update_message_search_vector function
CREATE OR REPLACE FUNCTION public.update_message_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$function$;

-- Update has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- Update get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'moderator' THEN 2
    WHEN 'user' THEN 3
  END
  LIMIT 1;
$function$;

-- Update cleanup_old_audit_logs function
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < now() - interval '2 years';
END;
$function$;

-- Update has_beta_access function
CREATE OR REPLACE FUNCTION public.has_beta_access(check_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update get_beta_settings function
CREATE OR REPLACE FUNCTION public.get_beta_settings()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update validate_profile_input function
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
$function$;

-- Update cleanup_expired_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM wallet_sessions WHERE expires_at < now();
END;
$function$;

-- Update user_is_institution_member function
CREATE OR REPLACE FUNCTION public.user_is_institution_member(institution_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is a member of the institution
  RETURN EXISTS (
    SELECT 1 FROM public.institution_members 
    WHERE institution_members.institution_id = user_is_institution_member.institution_id 
    AND institution_members.user_id = user_is_institution_member.user_id
  );
END;
$function$;

-- Update handle_institution_member_change function
CREATE OR REPLACE FUNCTION public.handle_institution_member_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update user's profile to link to institution and set trader_type to Institutional
        UPDATE public.profiles 
        SET institution_id = NEW.institution_id, 
            trader_type = 'Institutional',
            updated_at = now()
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove institution link from user's profile and reset trader_type to Degen
        UPDATE public.profiles 
        SET institution_id = NULL, 
            trader_type = 'Degen',
            updated_at = now()
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

-- Update handle_new_institution function
CREATE OR REPLACE FUNCTION public.handle_new_institution()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Add the creator as admin of the institution
    INSERT INTO public.institution_members (institution_id, user_id, role, job_title, added_by)
    VALUES (NEW.id, NEW.created_by, 'admin', 'CEO', NEW.created_by);
    
    -- Update the creator's profile to link to this institution and set trader_type
    UPDATE public.profiles 
    SET institution_id = NEW.id, 
        trader_type = 'Institutional',
        updated_at = now()
    WHERE id = NEW.created_by;
    
    RETURN NEW;
END;
$function$;

-- Update handle_new_wallet_user function
CREATE OR REPLACE FUNCTION public.handle_new_wallet_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    wallet_addr TEXT;
BEGIN
    -- Extract wallet address from user metadata
    wallet_addr := NEW.raw_user_meta_data->>'wallet_address';
    
    -- Only proceed if this is a wallet user
    IF wallet_addr IS NOT NULL THEN
        -- Create profile for wallet user
        INSERT INTO public.profiles (
            id, 
            wallet_address, 
            display_name,
            is_public
        )
        VALUES (
            NEW.id,
            wallet_addr,
            COALESCE(
                NEW.raw_user_meta_data->>'display_name',
                SUBSTRING(wallet_addr FROM 1 FOR 8) || '...' || SUBSTRING(wallet_addr FROM LENGTH(wallet_addr) - 5)
            ),
            false
        )
        ON CONFLICT (id) DO UPDATE SET
            wallet_address = EXCLUDED.wallet_address,
            updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Update authenticate_wallet function
CREATE OR REPLACE FUNCTION public.authenticate_wallet(wallet_addr text, signature_msg text, user_signature text, nonce_value text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    session_record wallet_sessions%ROWTYPE;
    verification_nonce TEXT;
BEGIN
    -- Input validation
    IF wallet_addr IS NULL OR LENGTH(wallet_addr) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid wallet address');
    END IF;
    
    IF signature_msg IS NULL OR LENGTH(signature_msg) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid message');
    END IF;
    
    IF user_signature IS NULL OR LENGTH(user_signature) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid signature');
    END IF;
    
    IF nonce_value IS NULL OR LENGTH(nonce_value) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid nonce');
    END IF;

    -- Verify the session exists and hasn't expired
    SELECT * INTO session_record 
    FROM wallet_sessions 
    WHERE wallet_address = wallet_addr 
    AND message = signature_msg
    AND nonce = nonce_value
    AND expires_at > now();
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired session');
    END IF;
    
    -- Generate verification nonce using gen_random_uuid instead of gen_random_bytes
    verification_nonce := replace(gen_random_uuid()::text, '-', '');
    
    -- Clean up the session (prevent replay attacks)
    DELETE FROM wallet_sessions WHERE id = session_record.id;
    
    -- Return success with verification data for client-side auth
    RETURN json_build_object(
        'success', true, 
        'wallet_address', wallet_addr,
        'verification_nonce', verification_nonce
    );
END;
$function$;

-- Update create_wallet_challenge function
CREATE OR REPLACE FUNCTION public.create_wallet_challenge(wallet_addr text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    challenge_nonce TEXT;
    challenge_message TEXT;
    expires_time TIMESTAMP WITH TIME ZONE;
    recent_challenges INTEGER;
BEGIN
    -- Input validation
    IF wallet_addr IS NULL OR LENGTH(wallet_addr) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid wallet address');
    END IF;
    
    -- Rate limiting: Check for recent challenges from this wallet
    SELECT COUNT(*) INTO recent_challenges
    FROM wallet_sessions
    WHERE wallet_address = wallet_addr
    AND created_at > now() - interval '1 minute';
    
    IF recent_challenges >= 5 THEN
        RETURN json_build_object('success', false, 'error', 'Too many requests. Please wait.');
    END IF;
    
    -- Clean up expired sessions for this wallet
    DELETE FROM wallet_sessions 
    WHERE wallet_address = wallet_addr 
    AND expires_at < now();
    
    -- Generate cryptographically secure nonce using gen_random_uuid
    challenge_nonce := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    challenge_message := 'Sign this message to authenticate with OTC Trades. Nonce: ' || challenge_nonce || ' Time: ' || extract(epoch from now())::text;
    expires_time := now() + interval '5 minutes';
    
    -- Store the challenge
    INSERT INTO wallet_sessions (wallet_address, message, nonce, signature, expires_at)
    VALUES (wallet_addr, challenge_message, challenge_nonce, '', expires_time);
    
    RETURN json_build_object(
        'success', true,
        'message', challenge_message,
        'nonce', challenge_nonce,
        'expires_at', expires_time
    );
END;
$function$;

-- Update user_is_institution_creator function
CREATE OR REPLACE FUNCTION public.user_is_institution_creator(institution_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if current user created the institution
  RETURN EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE id = institution_id AND created_by = auth.uid()
  );
END;
$function$;

-- Update increment_unread_count function
CREATE OR REPLACE FUNCTION public.increment_unread_count(chat_id uuid, sender_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE chat_participants 
    SET unread_count = unread_count + 1
    WHERE chat_participants.chat_id = increment_unread_count.chat_id 
    AND chat_participants.user_id != increment_unread_count.sender_id;
END;
$function$;

-- Update auth_uid_test function
CREATE OR REPLACE FUNCTION public.auth_uid_test()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT auth.uid();
$function$;

-- Update user_is_chat_member function
CREATE OR REPLACE FUNCTION public.user_is_chat_member(check_chat_id uuid, check_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user created the chat OR is a participant
  -- Use a simple EXISTS query that won't trigger RLS recursion
  RETURN EXISTS(
    SELECT 1 FROM public.chats 
    WHERE id = check_chat_id AND created_by = check_user_id
  ) OR EXISTS(
    -- This direct query bypasses RLS due to SECURITY DEFINER
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = check_chat_id AND user_id = check_user_id
  );
END;
$function$;

-- Secure reference data tables by requiring authentication
DROP POLICY IF EXISTS "Anyone can view tokens" ON public.data_tokens;
CREATE POLICY "Authenticated users can view tokens" ON public.data_tokens
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view chains" ON public.data_chains;
CREATE POLICY "Authenticated users can view chains" ON public.data_chains
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view licenses" ON public.data_licenses;
CREATE POLICY "Authenticated users can view licenses" ON public.data_licenses
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view active job titles" ON public.institution_job_titles;
CREATE POLICY "Authenticated users can view active job titles" ON public.institution_job_titles
FOR SELECT USING ((is_active = true) AND (auth.uid() IS NOT NULL));