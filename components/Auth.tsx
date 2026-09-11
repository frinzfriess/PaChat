'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] justify-center items-center bg-gray-50 dark:bg-black p-4">
      <div className="w-full max-w-[350px] bg-white dark:bg-black border border-gray-300 dark:border-gray-800 p-10 py-12 rounded-sm flex flex-col items-center">
        <h1 className="text-4xl font-semibold mb-8 style-script italic" style={{fontFamily: 'cursive'}}>PaChat</h1>
        
        <form onSubmit={handleAuth} className="w-full space-y-2.5">
          <input type="email" placeholder="Phone number, username, or email" required className="w-full p-2.5 text-xs bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-[3px] focus:outline-none focus:border-gray-400 dark:focus:border-gray-500" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" required className="w-full p-2.5 text-xs bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-[3px] focus:outline-none focus:border-gray-400 dark:focus:border-gray-500" value={password} onChange={(e) => setPassword(e.target.value)} />
          
          <button type="submit" disabled={loading} className="w-full bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold py-1.5 rounded-lg text-sm mt-4 transition disabled:opacity-50">
            {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Log in')}
          </button>
        </form>
      </div>

      <div className="w-full max-w-[350px] bg-white dark:bg-black border border-gray-300 dark:border-gray-800 p-5 mt-3 text-center rounded-sm text-sm">
        {isSignUp ? 'Have an account?' : "Don't have an account?"}{' '}
        <button onClick={() => setIsSignUp(!isSignUp)} className="text-[#0095f6] font-semibold">
          {isSignUp ? 'Log in' : 'Sign up'}
        </button>
      </div>
    </div>
  );
}