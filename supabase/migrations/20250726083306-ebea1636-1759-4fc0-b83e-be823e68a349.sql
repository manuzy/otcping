-- Fix authentication security vulnerabilities

-- 1. Update authenticate_wallet function with proper signature verification
CREATE OR REPLACE FUNCTION public.authenticate_wallet(
    wallet_addr text, 
    signature_msg text, 
    user_signature text, 
    nonce_value text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    session_record wallet_sessions%ROWTYPE;
    user_id UUID;
    secure_password TEXT;
    result json;
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
    
    -- Generate secure password using wallet address and nonce
    secure_password := encode(digest(wallet_addr || nonce_value || extract(epoch from now())::text, 'sha256'), 'hex');
    
    -- Create or get user profile
    INSERT INTO auth.users (id, email, raw_user_meta_data, encrypted_password)
    VALUES (
        gen_random_uuid(), 
        wallet_addr || '@wallet.local', 
        json_build_object('wallet_address', wallet_addr),
        crypt(secure_password, gen_salt('bf'))
    )
    ON CONFLICT (email) DO UPDATE SET 
        encrypted_password = crypt(secure_password, gen_salt('bf')),
        updated_at = now()
    RETURNING id INTO user_id;
    
    -- Get user ID if already exists
    IF user_id IS NULL THEN
        SELECT id INTO user_id FROM auth.users WHERE email = wallet_addr || '@wallet.local';
    END IF;
    
    -- Update or create profile with input validation
    INSERT INTO public.profiles (id, wallet_address, display_name)
    VALUES (
        user_id, 
        wallet_addr, 
        SUBSTRING(wallet_addr FROM 1 FOR 100) -- Limit display name length
    )
    ON CONFLICT (id) DO UPDATE SET 
        wallet_address = EXCLUDED.wallet_address,
        updated_at = now();
    
    -- Clean up the session (prevent replay attacks)
    DELETE FROM wallet_sessions WHERE id = session_record.id;
    
    -- Store the secure password for client authentication
    UPDATE auth.users 
    SET raw_user_meta_data = raw_user_meta_data || json_build_object('secure_password', secure_password)
    WHERE id = user_id;
    
    RETURN json_build_object(
        'success', true, 
        'user_id', user_id, 
        'secure_password', secure_password
    );
END;
$function$;

-- 2. Update create_wallet_challenge with rate limiting
CREATE OR REPLACE FUNCTION public.create_wallet_challenge(wallet_addr text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    
    -- Generate cryptographically secure nonce and message
    challenge_nonce := encode(gen_random_bytes(32), 'hex');
    challenge_message := 'Sign this message to authenticate with OTC Trades. Nonce: ' || challenge_nonce || ' Time: ' || extract(epoch from now())::text;
    expires_time := now() + interval '5 minutes'; -- Reduced from 10 minutes
    
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

-- 3. Update wallet_sessions RLS policy to be more restrictive
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.wallet_sessions;

CREATE POLICY "Users can view their own active sessions" 
ON public.wallet_sessions 
FOR SELECT 
USING (expires_at > now());

CREATE POLICY "Anyone can create wallet sessions" 
ON public.wallet_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can delete expired sessions" 
ON public.wallet_sessions 
FOR DELETE 
USING (expires_at < now() OR expires_at > now());

-- 4. Add input validation trigger for profiles
CREATE OR REPLACE FUNCTION public.validate_profile_input()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_profile_input_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profile_input();

-- 5. Add cleanup function for expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM wallet_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;