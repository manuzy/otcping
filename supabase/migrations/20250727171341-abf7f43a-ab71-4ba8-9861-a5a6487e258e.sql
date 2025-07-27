-- Delete the messages in the specific chat between Chainkie and Tom
DELETE FROM messages WHERE chat_id = 'e9464124-bd7b-4c1a-8c13-b167ff19f228';

-- Delete the chat participants for this chat
DELETE FROM chat_participants WHERE chat_id = 'e9464124-bd7b-4c1a-8c13-b167ff19f228';

-- Delete the chat itself
DELETE FROM chats WHERE id = 'e9464124-bd7b-4c1a-8c13-b167ff19f228';