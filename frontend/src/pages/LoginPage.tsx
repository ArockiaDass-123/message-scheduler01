import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { User } from '../types';
import {
  Calendar,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Mail,
  CheckCircle2,
  Zap,
  Users,
  Clock,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for OAuth redirect errors on mount
  useEffect(() => {
    const oauthError = sessionStorage.getItem('oauth_error');
    if (oauthError) {
      setError(oauthError);
      sessionStorage.removeItem('oauth_error');
    }
  }, []);

  // 1-Click "Continue with Google" — Direct OAuth flow, no config modal
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const redirectUri = window.location.origin;
      const statusRes = await api.getGoogleLoginUrl(redirectUri);

      if (statusRes.configured && statusRes.auth_url) {
        // Redirect directly to Google consent screen
        window.location.href = statusRes.auth_url;
      } else {
        setError(
          'Google OAuth is not configured yet. Please contact the administrator to set up Google Cloud credentials on the backend server.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Google authentication service. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 flex flex-col items-center justify-center p-4 selection:bg-brand-500 selection:text-white">
      <div className="max-w-md w-full space-y-6">
        
        {/* App Logo & Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 text-white flex items-center justify-center shadow-xl shadow-brand-500/25 mx-auto ring-4 ring-brand-50">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">MESSAGE SCHEDULER</h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Schedule & automate email messages to your contacts with Gmail
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 space-y-6">
          
          {/* Error Notice */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In — Primary Action */}
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Sign in to get started</h2>
              <p className="text-xs text-slate-500">
                Connect your Google account to start scheduling emails
              </p>
            </div>

            <button
              type="button"
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3.5 px-5 bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-800 font-bold text-sm flex items-center justify-center gap-3 disabled:opacity-60 group"
            >
              <svg className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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
              <span className="text-[15px]">{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              {googleLoading && (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
              )}
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-800">Gmail Auto-Connect</span>
                <span className="text-slate-500"> — Sign in with Google and your Gmail is instantly ready to send</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-800">Send to Anyone</span>
                <span className="text-slate-500"> — Email any contact, no restrictions</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-800">Auto-Schedule</span>
                <span className="text-slate-500"> — Set it once, mails go out automatically</span>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5">
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              How it works
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto text-xs font-black">1</div>
                <p className="text-[10px] text-slate-600 font-medium leading-tight">Sign in with Google</p>
              </div>
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto text-xs font-black">2</div>
                <p className="text-[10px] text-slate-600 font-medium leading-tight">Add recipients & message</p>
              </div>
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto text-xs font-black">3</div>
                <p className="text-[10px] text-slate-600 font-medium leading-tight">Schedule & auto-send</p>
              </div>
            </div>
          </div>

        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secured with Google OAuth 2.0 • Your data stays private</span>
        </div>

      </div>
    </div>
  );
};
