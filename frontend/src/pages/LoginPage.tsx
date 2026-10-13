import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { User } from '../types';
import {
  Calendar,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  Info
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('arockiadass123@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  // Check for OAuth redirect errors on mount
  useEffect(() => {
    const oauthError = sessionStorage.getItem('oauth_error');
    if (oauthError) {
      setError(oauthError);
      sessionStorage.removeItem('oauth_error');
    }
  }, []);

  // Email & Password login (with seamless auto-register for instant onboarding)
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAdminNotice(null);

    try {
      try {
        const res = await api.login(email.trim(), password);
        onLoginSuccess(res.user);
        return;
      } catch (loginErr: any) {
        if (loginErr.message?.includes('Incorrect email') || loginErr.message?.includes('not found')) {
          const regRes = await api.register(email.trim(), password, 'Arockiadass');
          onLoginSuccess(regRes.user);
          return;
        }
        throw loginErr;
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click "Continue with Google" Action
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setAdminNotice(null);

    try {
      const redirectUri = window.location.origin;
      const statusRes = await api.getGoogleLoginUrl(redirectUri);

      if (statusRes.configured && statusRes.auth_url) {
        window.location.href = statusRes.auth_url;
      } else {
        setAdminNotice(
          'Google Cloud OAuth is not yet configured on your server. You can sign in directly using the email form above, then connect Gmail in Settings!'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Google authentication service.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col items-center justify-center p-4 selection:bg-brand-500 selection:text-white">
      <div className="max-w-md w-full space-y-6">
        
        {/* App Logo & Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-xl shadow-brand-500/25 mx-auto ring-4 ring-brand-50">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">MESSAGE SCHEDULER</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Automated message scheduling and dispatches powered by Google Gmail API.
            </p>
          </div>
        </div>

        {/* Main Clean Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 space-y-6">
          
          {/* General Error Notice */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Admin Notice */}
          {adminNotice && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span>{adminNotice}</span>
            </div>
          )}

          {/* Primary Email Sign In Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arockiadass123@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
              or
            </span>
          </div>

          {/* Continue with Google Button */}
          <div className="space-y-3">
            <button
              type="button"
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3 px-5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all text-slate-700 font-bold text-sm flex items-center justify-center gap-3 disabled:opacity-60 group"
            >
              <svg className="w-4 h-4 flex-shrink-0 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Official Google OAuth 2.0 & Gmail API Support</span>
            </div>
          </div>

        </div>

        {/* Security & Standard footer */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Google Identity Services • OAuth 2.0 • Gmail API</span>
        </div>

      </div>
    </div>
  );
};
