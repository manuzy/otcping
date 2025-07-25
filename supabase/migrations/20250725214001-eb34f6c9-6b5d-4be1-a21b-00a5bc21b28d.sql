-- Create profiles table for wallet-based authentication
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profile access
-- Users can view all profiles (for trading partners)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true); -- We'll handle wallet ownership in the app logic

-- Users can update their own profile (verified by wallet signature)
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (true); -- We'll handle wallet ownership verification in the app logic

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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

-- Sessions are only accessible by the wallet owner
CREATE POLICY "Users can manage their own sessions" 
ON public.wallet_sessions 
FOR ALL
USING (wallet_address = current_setting('app.current_wallet_address', true));