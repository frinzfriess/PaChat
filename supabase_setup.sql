-- COMPLETE IG-STYLE SETUP (Run this entirely)

-- Drop old tables if they exist to start fresh (WARNING: Clears old messages!)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  username text UNIQUE,
  avatar_url text,
  bio text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Conversations (1-on-1 chats)
CREATE TABLE public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Participants (Links users to conversations)
CREATE TABLE public.participants (
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

-- 4. Messages
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text,
  image_url text,
  reaction text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Storage (Ignore errors if already exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-photos', 'chat-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view, only owner can update
CREATE POLICY "Public profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Participants & Conversations: Only users IN the conversation can view/interact
CREATE POLICY "View own participations" ON public.participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert participations" ON public.participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "View conversations" ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = id AND user_id = auth.uid())
);
CREATE POLICY "Create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Messages: Only participants can read/insert
CREATE POLICY "View conversation messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Insert conversation messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Update messages (reactions)" ON public.messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);

-- Auto-Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (new.id, split_part(new.email, '@', 1), split_part(new.email, '@', 1) || '_' || floor(random() * 1000)::text);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
