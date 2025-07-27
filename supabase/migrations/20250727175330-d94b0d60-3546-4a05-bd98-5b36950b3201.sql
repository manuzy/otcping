-- Delete chat between Tom and Chainkie
DELETE FROM messages WHERE chat_id = 'aebefa18-7fcf-4414-a21d-0a76b6f96233';
DELETE FROM chat_participants WHERE chat_id = 'aebefa18-7fcf-4414-a21d-0a76b6f96233';
DELETE FROM chats WHERE id = 'aebefa18-7fcf-4414-a21d-0a76b6f96233';