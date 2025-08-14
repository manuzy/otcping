-- Create institution tables with full audit support
CREATE TABLE public.institutions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    logo TEXT,
    public_description TEXT,
    private_description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    kyb_status TEXT NOT NULL DEFAULT 'not_verified' CHECK (kyb_status IN ('not_verified', 'pending', 'verified')),
    kyb_provider TEXT,
    kyb_verified_at TIMESTAMP WITH TIME ZONE
);

-- Create institution members table
CREATE TABLE public.institution_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    job_title TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    added_by UUID NOT NULL,
    UNIQUE(user_id) -- One user can only belong to one institution
);

-- Create job titles reference table
CREATE TABLE public.institution_job_titles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add institution_id to profiles table
ALTER TABLE public.profiles ADD COLUMN institution_id UUID REFERENCES public.institutions(id);

-- Insert predefined job titles
INSERT INTO public.institution_job_titles (title, description) VALUES
('CEO', 'Chief Executive Officer'),
('CTO', 'Chief Technology Officer'),
('CFO', 'Chief Financial Officer'),
('Head of Trading', 'Head of Trading Operations'),
('Senior Trader', 'Senior Trading Professional'),
('Trader', 'Trading Professional'),
('Risk Manager', 'Risk Management Professional'),
('Compliance Officer', 'Compliance and Regulatory Professional'),
('Operations Manager', 'Operations Management'),
('Analyst', 'Financial/Technical Analyst'),
('Portfolio Manager', 'Portfolio Management Professional'),
('Quantitative Analyst', 'Quantitative Research Professional');

-- Enable RLS on all institution tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_job_titles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for institutions
CREATE POLICY "Users can view institutions they belong to" 
ON public.institutions 
FOR SELECT 
USING (
    auth.uid() = created_by OR 
    EXISTS (
        SELECT 1 FROM public.institution_members 
        WHERE institution_id = institutions.id AND user_id = auth.uid()
    )
);

CREATE POLICY "Public institution data viewable by authenticated users" 
ON public.institutions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create institutions" 
ON public.institutions 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Institution admins can update their institutions" 
ON public.institutions 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members 
        WHERE institution_id = institutions.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Create RLS policies for institution members
CREATE POLICY "Users can view members of institutions they belong to" 
ON public.institution_members 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members im2 
        WHERE im2.institution_id = institution_members.institution_id 
        AND im2.user_id = auth.uid()
    )
);

CREATE POLICY "Institution admins can manage members" 
ON public.institution_members 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members 
        WHERE institution_id = institution_members.institution_id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
);

CREATE POLICY "Users can join institutions" 
ON public.institution_members 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for job titles
CREATE POLICY "Anyone can view active job titles" 
ON public.institution_job_titles 
FOR SELECT 
USING (is_active = true);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_institutions_updated_at
    BEFORE UPDATE ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically add creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_institution()
RETURNS TRIGGER AS $$
BEGIN
    -- Add the creator as admin of the institution
    INSERT INTO public.institution_members (institution_id, user_id, role, job_title, added_by)
    VALUES (NEW.id, NEW.created_by, 'admin', 'CEO', NEW.created_by);
    
    -- Update the creator's profile to link to this institution
    UPDATE public.profiles 
    SET institution_id = NEW.id, updated_at = now()
    WHERE id = NEW.created_by;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run the function
CREATE TRIGGER on_institution_created
    AFTER INSERT ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_institution();

-- Create function to handle member profile updates
CREATE OR REPLACE FUNCTION public.handle_institution_member_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update user's profile to link to institution
        UPDATE public.profiles 
        SET institution_id = NEW.institution_id, updated_at = now()
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove institution link from user's profile
        UPDATE public.profiles 
        SET institution_id = NULL, updated_at = now()
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for member changes
CREATE TRIGGER on_institution_member_change
    AFTER INSERT OR DELETE ON public.institution_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_institution_member_change();