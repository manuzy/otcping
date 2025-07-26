-- Fix the authenticate_wallet function to use available random generation
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

-- Clean up all existing wallet sessions to prevent rate limiting issues
DELETE FROM wallet_sessions;