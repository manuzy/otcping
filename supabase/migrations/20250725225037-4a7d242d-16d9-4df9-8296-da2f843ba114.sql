-- Fix security issues by setting proper search_path
CREATE OR REPLACE FUNCTION public.authenticate_wallet(
    wallet_addr TEXT,
    signature_msg TEXT,
    user_signature TEXT,
    nonce_value TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    session_record wallet_sessions%ROWTYPE;
    user_id UUID;
    result json;
BEGIN
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
    
    -- Create or get user profile
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (gen_random_uuid(), wallet_addr || '@wallet.local', json_build_object('wallet_address', wallet_addr))
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO user_id;
    
    -- Get user ID if already exists
    IF user_id IS NULL THEN
        SELECT id INTO user_id FROM auth.users WHERE email = wallet_addr || '@wallet.local';
    END IF;
    
    -- Update or create profile
    INSERT INTO public.profiles (id, wallet_address, display_name)
    VALUES (user_id, wallet_addr, wallet_addr)
    ON CONFLICT (id) DO UPDATE SET 
        wallet_address = EXCLUDED.wallet_address,
        updated_at = now();
    
    -- Clean up the session
    DELETE FROM wallet_sessions WHERE id = session_record.id;
    
    RETURN json_build_object('success', true, 'user_id', user_id);
END;
$$;

-- Fix security issues by setting proper search_path
CREATE OR REPLACE FUNCTION public.create_wallet_challenge(wallet_addr TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    challenge_nonce TEXT;
    challenge_message TEXT;
    expires_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate nonce and message
    challenge_nonce := encode(gen_random_bytes(16), 'hex');
    challenge_message := 'Sign this message to authenticate with OTC Trades. Nonce: ' || challenge_nonce;
    expires_time := now() + interval '10 minutes';
    
    -- Store the challenge
    INSERT INTO wallet_sessions (wallet_address, message, nonce, signature, expires_at)
    VALUES (wallet_addr, challenge_message, challenge_nonce, '', expires_time);
    
    RETURN json_build_object(
        'message', challenge_message,
        'nonce', challenge_nonce,
        'expires_at', expires_time
    );
END;
$$;