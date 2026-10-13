import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { User } from '../types';
import {
  Calendar,
  ShieldCheck,
  AlertCircle,
  Info,
  ArrowRight,
  Server,
  Lock,
  Mail,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optional collapsible developer fallback login for local testing when offline
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devEmail, setDevEmail] = useState('arockiadass123@gmail.com');
  const [devPassword, setDevPassword] = useState('admin123');
  const [devLoading, setDevLoading] = useState(false);

  // Check for OAuth redirect errors on mount
  useEffect(() => {
    const oauthError = sessionStorage.getItem('oauth_error');
    if (oauthError) {
      setError(oauthError);
      sessionStorage.removeItem('oauth_error');
    }
  }, []);

  // Official 1-Click "Continue with Google" Action
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setAdminNotice(null);

    try {
      const redirectUri = window.location.origin;
      const statusRes = await api.getGoogleLoginUrl(redirectUri);

      if (statusRes.configured && statusRes.auth_url) {
        // Direct redirect to official Google OAuth 2.0 authorization screen
        window.location.href = statusRes.auth_url;
      } else {
        // Informative administrator setup message on the server side
        setAdminNotice(
          statusRes.message ||
          'Google Sign-In is pending server-side configuration. The system administrator must set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Google authentication service. Please check your backend connection.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevLoading(true);
    setError(null);
    try {
      try {
        const res = await api.login(devEmail, devPassword);
        onLoginSuccess(res.user);
        return;
      } catch (loginErr: any) {
        if (loginErr.message?.includes('Incorrect email') || loginErr.message?.includes('not found')) {
          const regRes = await api.register(devEmail, devPassword, 'Arockiadass');
          onLoginSuccess(regRes.user);
          return;
        }
        throw loginErr;
      }
    } catch (err: any) {
      setError(err.message || 'Developer demo login failed');
    } finally {
      setDevLoading(false);
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

          {/* PROMINENT OFFICIAL "CONTINUE WITH GOOGLE" BUTTON */}
          <div className="space-y-3">
            <button
              type="button"
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3.5 px-5 bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm hover:shadow transition-all text-slate-800 font-bold text-sm flex items-center justify-center gap-3.5 disabled:opacity-60 group"
            >
              {/* Official Google 'G' Logo */}
              <svg className="w-5 h-5 flex-shrink-0 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
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
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Uses Google's official OAuth 2.0 authorization with verified Gmail send permissions.</span>
            </div>
          </div>

          {/* Discreet Developer / Offline Demo Access */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDevLogin(!showDevLogin)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-medium py-1 flex items-center justify-center gap-1 transition-colors"
            >
              <span>Developer & Demo Mode</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDevLogin ? 'rotate-180' : ''}`} />
            </button>

            {showDevLogin && (
              <form onSubmit={handleDevSubmit} className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="text-[11px] font-semibold text-slate-600">
                  Local Admin Demo Credentials:
                </div>
                <div>
                  <input
                    type="email"
                    required
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="admin@scheduler.local"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={devLoading}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span>{devLoading ? 'Signing in...' : 'Sign In as Arockiadass'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
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
