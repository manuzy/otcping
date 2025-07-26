-- Fix wallet authentication flow by redesigning database functions

-- 1. Update authenticate_wallet to only verify signatures (remove auth.users manipulation)
CREATE OR REPLACE FUNCTION public.authenticate_wallet(
    wallet_addr text, 
    signature_msg text, 
    user_signature text, 
    nonce_value text
)
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
    
    -- Generate verification nonce for client-side auth
    verification_nonce := encode(gen_random_bytes(32), 'hex');
    
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

-- 2. Create trigger function for automatic profile creation
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

-- 3. Create trigger for wallet user profile creation
DROP TRIGGER IF EXISTS on_auth_wallet_user_created ON auth.users;
CREATE TRIGGER on_auth_wallet_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_wallet_user();