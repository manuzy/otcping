-- Fix security warnings by adding SET search_path to functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Fix the member change function as well
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';