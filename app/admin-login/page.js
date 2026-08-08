'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [step, setStep] = useState('login'); // 'login' | 'forgot-email' | 'reset-password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin-dashboard');
      } else {
        alert(data.message || 'Invalid login details.');
      }
    } catch (err) {
      alert('An error occurred during login.');
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      alert('Please enter your email address');
      return;
    }
    setStep('reset-password');
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!newPassword) {
      alert('Please enter a new password');
      return;
    }
    alert('Password successfully reset! Please sign in.');
    setPassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setStep('login');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center relative px-4 text-white">
      {/* Login Card Container */}
      <div className="bg-[#111827]/85 backdrop-blur-md border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md relative">
        
        {/* Back to Home Arrow Button (Only shown on main login screen) */}
        {step === 'login' && (
          <Link 
            href="/" 
            className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
            title="Return to Home Page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        )}

        {/* Back arrow for recovery screens */}
        {step !== 'login' && (
          <button 
            type="button"
            onClick={() => setStep(step === 'reset-password' ? 'forgot-email' : 'login')}
            className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
            title="Go back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}

        {/* STEP 1: LOGIN SCREEN */}
        {step === 'login' && (
          <>
            <div className="mt-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
              <p className="text-sm text-gray-400 mt-1">Enter your credentials to access your portal.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Username / Email
                </label>
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setStep('forgot-email')}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg shadow-lg transition-all mt-2"
              >
                Sign In
              </button>
            </form>
          </>
        )}

        {/* STEP 2: FORGOT PASSWORD - ENTER EMAIL SCREEN */}
        {step === 'forgot-email' && (
          <>
            <div className="mt-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Password Recovery</h1>
              <p className="text-sm text-gray-400 mt-1">Enter your email address to begin recovery.</p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg shadow-lg transition-all mt-2"
              >
                Continue
              </button>
            </form>
          </>
        )}

        {/* STEP 3: RESET PASSWORD SCREEN */}
        {step === 'reset-password' && (
          <>
            <div className="mt-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
              <p className="text-sm text-gray-400 mt-1">Create a new secure password for your account.</p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  New Password
                </label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Confirm Password
                </label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg shadow-lg transition-all mt-2"
              >
                Reset Password
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}