-- Delete the empty chat between Tom and Harry
-- First delete the chat participants to maintain referential integrity
DELETE FROM chat_participants 
WHERE chat_id = '9219d211-9101-4127-8388-397030dcbe2f';

-- Then delete the empty chat itself
DELETE FROM chats 
WHERE id = '9219d211-9101-4127-8388-397030dcbe2f';