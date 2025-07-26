-- Create function to increment unread count for chat participants
CREATE OR REPLACE FUNCTION increment_unread_count(chat_id UUID, sender_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE chat_participants 
    SET unread_count = unread_count + 1
    WHERE chat_participants.chat_id = increment_unread_count.chat_id 
    AND chat_participants.user_id != increment_unread_count.sender_id;
END;
$$;