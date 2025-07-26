-- Fix the create_wallet_challenge function to use available random generation
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
$function$