-- Create message_templates table for storing reusable message templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  variables TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for message templates
CREATE POLICY "Users can view their own templates and public templates"
ON public.message_templates
FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates"
ON public.message_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.message_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.message_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_message_templates_updated_at();