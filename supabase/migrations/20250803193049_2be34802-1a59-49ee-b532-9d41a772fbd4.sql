-- Create admin_settings table
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skip_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin-only access
CREATE POLICY "Admins can view their own settings" 
ON public.admin_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create their own settings" 
ON public.admin_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update their own settings" 
ON public.admin_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();