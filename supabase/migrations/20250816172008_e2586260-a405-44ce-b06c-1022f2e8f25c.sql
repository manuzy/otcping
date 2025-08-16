-- Enable real-time for message_bookmarks table
ALTER TABLE public.message_bookmarks REPLICA IDENTITY FULL;

-- Add message_bookmarks to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_bookmarks;