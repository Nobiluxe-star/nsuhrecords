'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const schoolSlug = searchParams.get('school');
  const token = searchParams.get('token');

  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function validateInvite() {
      if (!schoolSlug || !token) {
        setErrorMsg('Invalid or missing registration link.');
        setLoading(false);
        return;
      }

      const { data: invite, error } = await supabase
        .from('invite_links')
        .select('*, schools(*)')
        .eq('token', token)
        .single();

      if (error || !invite || invite.used) {
        setErrorMsg('This invite link is invalid, expired, or has already been used.');
      } else {
        setSchool(invite.schools);
      }
      setLoading(false);
    }

    validateInvite();
  }, [schoolSlug, token]);

  async function handleRegister(e) {
    e.preventDefault();
    setErrorMsg('');

    const { data: invite } = await supabase
      .from('invite_links')
      .select('*')
      .eq('token', token)
      .single();

    if (!invite) return;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invite.email,
      password: password,
    });

    if (authError) {
      setErrorMsg(authError.message);
      return;
    }

    if (authData?.user) {
      await supabase.from('profiles').insert([
        {
          id: authData.user.id,
          full_name: fullName,
          role: 'admin',
          school_id: school.id,
        }
      ]);

      await supabase
        .from('invite_links')
        .update({ used: true })
        .eq('token', token);

      // Sign out immediately so they log in fresh on the login screen
      await supabase.auth.signOut();

      alert('School Admin Account Created Successfully! Please sign in with your new credentials.');
      router.push('/admin-login');
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">Verifying invite link...</div>;
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-800 p-6 rounded-lg border border-red-500/50 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-300">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 max-w-md w-full">
        <h1 className="text-2xl font-black text-amber-500 uppercase tracking-wider mb-1">Administrator Setup</h1>
        <p className="text-sm text-slate-400 mb-6">Registering for <span className="text-white font-bold">{school?.name}</span></p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Principal John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Set Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded text-sm transition">
            Complete Registration & Proceed to Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}