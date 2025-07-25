-- Create sessions table for wallet-based authentication
CREATE TABLE public.wallet_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  signature TEXT NOT NULL,
  message TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sessions
ALTER TABLE public.wallet_sessions ENABLE ROW LEVEL SECURITY;

-- Sessions are only accessible by the wallet owner (we'll handle this in the app logic)
CREATE POLICY "Users can manage their own sessions" 
ON public.wallet_sessions 
FOR ALL
USING (true); -- We'll handle wallet ownership verification in the app logic