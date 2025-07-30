-- First, set some demo reputation values for existing profiles
UPDATE profiles SET 
  reputation = 4.5, 
  successful_trades = 28, 
  total_trades = 32 
WHERE display_name = 'SHIBtoTHEmoon';

UPDATE profiles SET 
  reputation = 4.8, 
  successful_trades = 45, 
  total_trades = 48 
WHERE display_name = '420inch';

UPDATE profiles SET 
  reputation = 3.2, 
  successful_trades = 12, 
  total_trades = 20 
WHERE display_name = 'Token Harry';

-- Create ratings table for proper rating system
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rater_id UUID NOT NULL,
  rated_user_id UUID NOT NULL,
  trade_id UUID,
  rating_value INTEGER NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rater_id, rated_user_id, trade_id)
);

-- Enable RLS on ratings table
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for ratings
CREATE POLICY "Users can view ratings for public profiles" 
ON public.ratings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = ratings.rated_user_id 
    AND profiles.is_public = true
  )
);

CREATE POLICY "Users can create ratings" 
ON public.ratings 
FOR INSERT 
WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users can view their own ratings" 
ON public.ratings 
FOR SELECT 
USING (auth.uid() = rater_id OR auth.uid() = rated_user_id);

CREATE POLICY "Users can update their own ratings" 
ON public.ratings 
FOR UPDATE 
USING (auth.uid() = rater_id);

-- Create function to calculate and update user reputation
CREATE OR REPLACE FUNCTION public.calculate_user_reputation(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    avg_rating DECIMAL;
BEGIN
    -- Calculate average rating for the user
    SELECT AVG(rating_value) INTO avg_rating
    FROM ratings
    WHERE rated_user_id = user_id;
    
    -- Update the user's reputation (default to 0 if no ratings)
    UPDATE profiles 
    SET reputation = COALESCE(avg_rating, 0)
    WHERE id = user_id;
END;
$function$;

-- Create trigger to automatically update reputation when ratings change
CREATE OR REPLACE FUNCTION public.update_reputation_on_rating_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Update reputation for the rated user
    PERFORM calculate_user_reputation(COALESCE(NEW.rated_user_id, OLD.rated_user_id));
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers for rating changes
CREATE TRIGGER update_reputation_after_insert
    AFTER INSERT ON public.ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_reputation_on_rating_change();

CREATE TRIGGER update_reputation_after_update
    AFTER UPDATE ON public.ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_reputation_on_rating_change();

CREATE TRIGGER update_reputation_after_delete
    AFTER DELETE ON public.ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_reputation_on_rating_change();

-- Add trigger for updated_at on ratings
CREATE TRIGGER update_ratings_updated_at
    BEFORE UPDATE ON public.ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();