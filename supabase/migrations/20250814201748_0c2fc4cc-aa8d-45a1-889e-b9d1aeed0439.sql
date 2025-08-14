-- Fix the database trigger to update trader_type when institution membership changes
CREATE OR REPLACE FUNCTION public.handle_institution_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update user's profile to link to institution and set trader_type to Institutional
        UPDATE public.profiles 
        SET institution_id = NEW.institution_id, 
            trader_type = 'Institutional',
            updated_at = now()
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove institution link from user's profile and reset trader_type to Degen
        UPDATE public.profiles 
        SET institution_id = NULL, 
            trader_type = 'Degen',
            updated_at = now()
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

-- Fix existing profiles that have institution_id but wrong trader_type
UPDATE public.profiles 
SET trader_type = 'Institutional', updated_at = now()
WHERE institution_id IS NOT NULL AND trader_type != 'Institutional';

-- Also fix the handle_new_institution trigger to set trader_type correctly
CREATE OR REPLACE FUNCTION public.handle_new_institution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Add the creator as admin of the institution
    INSERT INTO public.institution_members (institution_id, user_id, role, job_title, added_by)
    VALUES (NEW.id, NEW.created_by, 'admin', 'CEO', NEW.created_by);
    
    -- Update the creator's profile to link to this institution and set trader_type
    UPDATE public.profiles 
    SET institution_id = NEW.id, 
        trader_type = 'Institutional',
        updated_at = now()
    WHERE id = NEW.created_by;
    
    RETURN NEW;
END;
$function$;