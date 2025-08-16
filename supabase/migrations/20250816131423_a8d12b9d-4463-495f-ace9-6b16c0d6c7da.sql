-- Add foreign key constraints for proper relationships
ALTER TABLE public.message_attachments 
ADD CONSTRAINT fk_message_attachments_message_id 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

ALTER TABLE public.message_status 
ADD CONSTRAINT fk_message_status_message_id 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

ALTER TABLE public.pinned_messages 
ADD CONSTRAINT fk_pinned_messages_chat_id 
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

ALTER TABLE public.pinned_messages 
ADD CONSTRAINT fk_pinned_messages_message_id 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

ALTER TABLE public.message_drafts 
ADD CONSTRAINT fk_message_drafts_chat_id 
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;