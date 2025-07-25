-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.trade_type AS ENUM ('buy', 'sell');
CREATE TYPE public.trade_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE public.message_type AS ENUM ('message', 'trade_action', 'system');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_address TEXT UNIQUE,
    display_name TEXT NOT NULL,
    avatar TEXT,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    reputation INTEGER NOT NULL DEFAULT 0,
    successful_trades INTEGER NOT NULL DEFAULT 0,
    total_trades INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trades table
CREATE TABLE public.trades (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chain TEXT NOT NULL,
    pair TEXT NOT NULL,
    size TEXT NOT NULL,
    price TEXT NOT NULL,
    type trade_type NOT NULL,
    status trade_status NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chats table
CREATE TABLE public.chats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_participants table (many-to-many relationship)
CREATE TABLE public.chat_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    unread_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type message_type NOT NULL DEFAULT 'message',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table (user relationships)
CREATE TABLE public.contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, contact_id),
    CHECK (user_id != contact_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (is_public = true);

CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Create RLS Policies for trades
CREATE POLICY "Public trades are viewable by everyone" 
    ON public.trades FOR SELECT 
    USING (true);

CREATE POLICY "Users can create their own trades" 
    ON public.trades FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own trades" 
    ON public.trades FOR UPDATE 
    USING (auth.uid() = created_by);

-- Create RLS Policies for chats
CREATE POLICY "Users can view chats they participate in" 
    ON public.chats FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants 
            WHERE chat_id = chats.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chats" 
    ON public.chats FOR INSERT 
    WITH CHECK (true);

-- Create RLS Policies for chat_participants
CREATE POLICY "Users can view their own chat participations" 
    ON public.chat_participants FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can join chats" 
    ON public.chat_participants FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave chats" 
    ON public.chat_participants FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their participation status" 
    ON public.chat_participants FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create RLS Policies for messages
CREATE POLICY "Users can view messages in chats they participate in" 
    ON public.messages FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants 
            WHERE chat_id = messages.chat_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to chats they participate in" 
    ON public.messages FOR INSERT 
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.chat_participants 
            WHERE chat_id = messages.chat_id AND user_id = auth.uid()
        )
    );

-- Create RLS Policies for contacts
CREATE POLICY "Users can view their own contacts" 
    ON public.contacts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own contacts" 
    ON public.contacts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own contacts" 
    ON public.contacts FOR DELETE 
    USING (auth.uid() = user_id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'avatar', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON public.chats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_trades_created_by ON public.trades(created_by);
CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);

-- Enable realtime for real-time messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;