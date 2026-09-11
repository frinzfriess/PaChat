'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

export default function ProfileModal({ session, profile, setProfile, onClose }: any) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('profiles').update({ full_name: fullName, username }).eq('id', session.user.id);
    setProfile({ ...profile, full_name: fullName, username });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#262626] rounded-xl max-w-sm w-full p-6 text-black dark:text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Edit Profile</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border-b border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:border-black dark:focus:border-white py-1" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border-b border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:border-black dark:focus:border-white py-1" required />
          </div>
          <button type="submit" className="w-full bg-[#0095f6] text-white py-2 rounded-lg font-semibold mt-4">Done</button>
          <button type="button" onClick={() => supabase.auth.signOut()} className="w-full text-red-500 py-2 rounded-lg font-semibold mt-2">Log Out</button>
        </form>
      </div>
    </div>
  );
}