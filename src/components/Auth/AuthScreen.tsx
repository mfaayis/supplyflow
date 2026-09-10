import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../Shared/Logo';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Account created! Check your email to confirm, then log in.' });
        setMode('login');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password reset email sent! Check your inbox.' });
        setMode('login');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    login: { heading: 'Welcome back', sub: 'Sign in to your trading journal' },
    signup: { heading: 'Create account', sub: 'Start tracking your S&D trades' },
    forgot: { heading: 'Reset password', sub: 'Enter your email to receive a reset link' },
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-6 space-y-5">
          {/* Title */}
          <div className="text-center space-y-1">
            <h1 className="text-lg font-bold text-white">{titles[mode].heading}</h1>
            <p className="text-xs text-[#8E95A2]">{titles[mode].sub}</p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                message.type === 'error'
                  ? 'bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171]'
                  : 'bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399]'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525866]" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#525866] focus:border-[#8B5CF6] focus:outline-none transition-colors"
              />
            </div>

            {/* Password — hidden for forgot mode */}
            {mode !== 'forgot' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525866]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-[#525866] focus:border-[#8B5CF6] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525866] hover:text-[#8E95A2] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 disabled:cursor-not-allowed py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="space-y-2 pt-1 text-center text-xs text-[#525866]">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setMessage(null); }}
                  className="hover:text-[#8E95A2] transition-colors cursor-pointer block w-full"
                >
                  Forgot password?
                </button>
                <p>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setMessage(null); }}
                    className="text-[#A78BFA] hover:text-[#8B5CF6] font-semibold cursor-pointer"
                  >
                    Sign up free
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setMessage(null); }}
                  className="text-[#A78BFA] hover:text-[#8B5CF6] font-semibold cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setMessage(null); }}
                className="text-[#A78BFA] hover:text-[#8B5CF6] font-semibold cursor-pointer"
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Tagline */}
        <p className="text-center text-[10px] text-[#525866] mt-6">
          SUPPLYFLOW · Multi-Timeframe Supply & Demand Journal
        </p>
      </div>
    </div>
  );
};
