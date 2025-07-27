-- Delete all messages and chats between Chainkie-Tom and Talent-Tom
-- Chat between Chainkie and Tom (ID: 3d512f09-71e8-45fb-9882-ee4d5f5848ed)
DELETE FROM messages WHERE chat_id = '3d512f09-71e8-45fb-9882-ee4d5f5848ed';
DELETE FROM chat_participants WHERE chat_id = '3d512f09-71e8-45fb-9882-ee4d5f5848ed';
DELETE FROM chats WHERE id = '3d512f09-71e8-45fb-9882-ee4d5f5848ed';

-- Chat between Talent and Tom (ID: d4e82cca-0711-4bd1-9950-340485db3725)
DELETE FROM messages WHERE chat_id = 'd4e82cca-0711-4bd1-9950-340485db3725';
DELETE FROM chat_participants WHERE chat_id = 'd4e82cca-0711-4bd1-9950-340485db3725';
DELETE FROM chats WHERE id = 'd4e82cca-0711-4bd1-9950-340485db3725';