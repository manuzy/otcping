-- Add message threading support
ALTER TABLE messages ADD COLUMN parent_message_id UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN thread_root_id UUID REFERENCES messages(id);

-- Add message search index for better search capabilities
ALTER TABLE messages ADD COLUMN search_vector tsvector;

-- Create index for search performance
CREATE INDEX IF NOT EXISTS messages_search_idx ON messages USING gin(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS messages_search_vector_update ON messages;
CREATE TRIGGER messages_search_vector_update
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();

-- Update existing messages search vectors
UPDATE messages SET search_vector = to_tsvector('english', content);

-- Create chat folders table for organization
CREATE TABLE chat_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'hsl(var(--primary))',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat folders
ALTER TABLE chat_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for chat folders
CREATE POLICY "Users can manage their own folders" 
ON chat_folders 
FOR ALL 
USING (auth.uid() = user_id);

-- Create chat folder assignments table
CREATE TABLE chat_folder_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES chat_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Enable RLS on chat folder assignments
ALTER TABLE chat_folder_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for chat folder assignments
CREATE POLICY "Users can manage their own chat folder assignments" 
ON chat_folder_assignments 
FOR ALL 
USING (auth.uid() = user_id);

-- Add message reactions table for better engagement
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on message reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for message reactions
CREATE POLICY "Users can manage reactions in chats they participate in" 
ON message_reactions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_reactions.message_id 
    AND cp.user_id = auth.uid()
  )
);

-- Add message mentions table for @mentions functionality
CREATE TABLE message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, mentioned_user_id)
);

-- Enable RLS on message mentions
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;

-- Create policies for message mentions
CREATE POLICY "Users can view mentions in chats they participate in" 
ON message_mentions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_mentions.message_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create mentions in chats they participate in" 
ON message_mentions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_mentions.message_id 
    AND cp.user_id = auth.uid()
  )
);