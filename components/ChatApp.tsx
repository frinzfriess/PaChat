'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { Moon, Sun, Send, Image as ImageIcon, Search, ArrowLeft, Info, Edit, User, Smile, Heart } from 'lucide-react';
import ProfileModal from './ProfileModal';

export default function ChatApp({ session }: { session: any }) {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<any>({});
  const [showSettings, setShowSettings] = useState(false);
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (myProfile) setProfile(myProfile);

      const { data: myParticipations } = await supabase.from('participants').select('conversation_id').eq('user_id', session.user.id);
      if (myParticipations && myParticipations.length > 0) {
        const convoIds = myParticipations.map(p => p.conversation_id);
        const { data: otherParticipants } = await supabase
          .from('participants')
          .select(`conversation_id, profiles(*)`)
          .in('conversation_id', convoIds)
          .neq('user_id', session.user.id);

        if (otherParticipants) {
          const formattedConvos = otherParticipants.map(p => ({
            id: p.conversation_id,
            partner: p.profiles
          }));
          setConversations(formattedConvos);
        }
      }
    };
    loadInitialData();
  }, [session.user.id]);

  useEffect(() => {
    if (!activeConvo) return;
    const fetchMessages = async () => {
      const { data: msgs } = await supabase
        .from('messages')
        .select(`*, profiles(full_name, avatar_url)`)
        .eq('conversation_id', activeConvo.id)
        .order('created_at', { ascending: true });
      if (msgs) setMessages(msgs);
      scrollToBottom();
    };
    fetchMessages();

    const msgChannel = supabase.channel(`convo_${activeConvo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvo.id}` }, async (payload) => {
        const { data: sender } = await supabase.from('profiles').select('*').eq('id', payload.new.sender_id).single();
        setMessages((prev) => [...prev, { ...payload.new, profiles: sender }]);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
  }, [activeConvo]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', session.user.id)
        .ilike('full_name', `%${searchQuery}%`)
        .limit(10);
      if (data) setSearchResults(data);
    };
    search();
  }, [searchQuery]);

  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const startChat = async (partner: any) => {
    const existing = conversations.find(c => c.partner.id === partner.id);
    if (existing) {
      setActiveConvo(existing);
      setSearchQuery('');
      return;
    }

    const { data: newConvo } = await supabase.from('conversations').insert({}).select().single();
    if (newConvo) {
      await supabase.from('participants').insert([
        { conversation_id: newConvo.id, user_id: session.user.id },
        { conversation_id: newConvo.id, user_id: partner.id }
      ]);
      
      const convoObj = { id: newConvo.id, partner };
      setConversations([convoObj, ...conversations]);
      setActiveConvo(convoObj);
      setSearchQuery('');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo) return;
    const text = newMessage.trim();
    setNewMessage('');
    
    await supabase.from('messages').insert([{ 
      conversation_id: activeConvo.id, 
      sender_id: session.user.id, 
      content: text 
    }]);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-white dark:bg-black text-black dark:text-white overflow-hidden">
      
      {showSettings && <ProfileModal session={session} profile={profile} setProfile={setProfile} onClose={() => setShowSettings(false)} />}

      <div className={`w-full md:w-[350px] lg:w-[400px] border-r border-gray-200 dark:border-[#262626] flex flex-col ${activeConvo ? 'hidden md:flex' : 'flex'}`}>
        
        <div className="h-16 px-5 flex items-center justify-between border-b border-gray-200 dark:border-[#262626]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowSettings(true)}>
            {profile.avatar_url ? (
               <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover" />
            ) : (
               <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#262626] flex items-center justify-center"><User size={16}/></div>
            )}
            <span className="font-bold text-lg">{profile.username || profile.full_name}</span>
          </div>
          <div className="flex gap-4">
             <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Moon size={24} className="dark:hidden"/><Sun size={24} className="hidden dark:block"/></button>
             <button><Edit size={24} /></button>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-gray-100 dark:bg-[#262626] flex items-center rounded-lg px-3 py-1.5">
            <Search size={16} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users to chat..." 
              className="bg-transparent border-none focus:outline-none w-full ml-2 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchQuery ? (
            <div className="px-4">
              <span className="text-xs font-semibold text-gray-500 mb-2 block">SEARCH RESULTS</span>
              {searchResults.map((user) => (
                <div key={user.id} onClick={() => startChat(user)} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#121212] px-2 rounded-lg">
                  {user.avatar_url ? <img src={user.avatar_url} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-[#262626] flex items-center justify-center"><User size={20}/></div>}
                  <div>
                    <p className="font-medium text-sm">{user.full_name}</p>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
               <div className="px-5 mb-2 flex justify-between items-center">
                 <span className="font-bold text-base">Messages</span>
                 <span className="text-sm font-semibold text-gray-400 cursor-pointer">Requests</span>
               </div>
               {conversations.map((convo) => (
                <div key={convo.id} onClick={() => setActiveConvo(convo)} className={`flex items-center gap-3 py-2 px-5 cursor-pointer ${activeConvo?.id === convo.id ? 'bg-gray-100 dark:bg-[#262626]' : 'hover:bg-gray-50 dark:hover:bg-[#121212]'}`}>
                  {convo.partner.avatar_url ? <img src={convo.partner.avatar_url} className="w-14 h-14 rounded-full object-cover" /> : <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-[#262626] flex items-center justify-center"><User size={24}/></div>}
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium">{convo.partner.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">Tap to chat...</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 flex-col ${!activeConvo ? 'hidden md:flex' : 'flex'}`}>
        
        {!activeConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 border-2 border-black dark:border-white rounded-full flex items-center justify-center mb-4">
              <Send size={48} className="ml-2 -mt-1" />
            </div>
            <h2 className="text-xl font-medium mb-1">Your Messages</h2>
            <p className="text-gray-500 text-sm mb-6">Send private photos and messages to a friend or group.</p>
            <button className="bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold py-1.5 px-4 rounded-lg text-sm">Send message</button>
          </div>
        ) : (
          <>
            <div className="h-16 border-b border-gray-200 dark:border-[#262626] flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <button className="md:hidden" onClick={() => setActiveConvo(null)}><ArrowLeft size={24}/></button>
                {activeConvo.partner.avatar_url ? <img src={activeConvo.partner.avatar_url} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#262626] flex items-center justify-center"><User size={16}/></div>}
                <span className="font-semibold">{activeConvo.partner.full_name}</span>
              </div>
              <Info size={24} className="cursor-pointer" />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex flex-col items-center justify-center py-6">
                {activeConvo.partner.avatar_url ? <img src={activeConvo.partner.avatar_url} className="w-24 h-24 rounded-full object-cover mb-2" /> : <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#262626] flex items-center justify-center mb-2"><User size={40}/></div>}
                <h3 className="font-semibold text-lg">{activeConvo.partner.full_name}</h3>
                <p className="text-gray-500 text-sm">@{activeConvo.partner.username} • PaChat</p>
                <button className="mt-3 px-3 py-1 bg-gray-100 dark:bg-[#262626] rounded-lg text-sm font-semibold">View Profile</button>
              </div>

              {messages.map((msg) => {
                const isMe = msg.sender_id === session.user.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                    {!isMe && (
                       activeConvo.partner.avatar_url ? <img src={activeConvo.partner.avatar_url} className="w-7 h-7 rounded-full object-cover mr-2 self-end mb-1" /> : <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[#262626] mr-2 self-end mb-1"></div>
                    )}
                    <div className={`px-4 py-2 text-sm max-w-[70%] ${
                      isMe 
                        ? 'bg-gradient-to-r from-[#8a3ab9] via-[#bc2a8d] to-[#e95950] text-white rounded-3xl rounded-br-sm' 
                        : 'bg-gray-100 dark:bg-[#262626] text-black dark:text-white rounded-3xl rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <div className="p-4">
              <form onSubmit={handleSend} className="flex items-center gap-3 border border-gray-300 dark:border-[#363636] rounded-full px-4 py-2 bg-transparent">
                <Smile size={24} className="text-gray-800 dark:text-gray-300 cursor-pointer" />
                <input
                  type="text"
                  placeholder="Message..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                {newMessage.trim() ? (
                  <button type="submit" className="text-[#0095f6] font-semibold text-sm">Send</button>
                ) : (
                  <div className="flex items-center gap-3 text-gray-800 dark:text-gray-300">
                    <ImageIcon size={24} className="cursor-pointer" />
                    <Heart size={24} className="cursor-pointer" onClick={() => { setNewMessage('❤️'); setTimeout(() => handleSend(new Event('submit') as any), 100) }}/>
                  </div>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}