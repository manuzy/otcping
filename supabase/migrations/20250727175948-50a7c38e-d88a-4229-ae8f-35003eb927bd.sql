-- Delete the current chat between Tom and Chainkie
DELETE FROM messages WHERE chat_id = '37099525-6338-45d6-8a8b-10686dc0b670';
DELETE FROM chat_participants WHERE chat_id = '37099525-6338-45d6-8a8b-10686dc0b670';
DELETE FROM chats WHERE id = '37099525-6338-45d6-8a8b-10686dc0b670';