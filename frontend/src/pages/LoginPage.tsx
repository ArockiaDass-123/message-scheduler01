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
  Info,
  Settings,
  X,
  Check,
  Copy,
  ExternalLink
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

  // Google OAuth configuration modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [cfgClientId, setCfgClientId] = useState('');
  const [cfgClientSecret, setCfgClientSecret] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

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
          'Google Cloud OAuth Client ID is not yet connected to the backend. Click "Configure Google OAuth" below to connect it now.'
        );
        setShowConfigModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Google authentication service.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Save Google OAuth credentials
  const handleSaveGoogleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgClientId.trim() || !cfgClientSecret.trim()) {
      setError('Please provide both Client ID and Client Secret from your Google Cloud Console.');
      return;
    }

    setSavingConfig(true);
    setError(null);
    try {
      await api.configureGoogleOAuth(
        cfgClientId.trim(),
        cfgClientSecret.trim(),
        window.location.origin
      );
      setShowConfigModal(false);
      setAdminNotice(null);
      // Immediately launch Google Sign In flow!
      const statusRes = await api.getGoogleLoginUrl(window.location.origin);
      if (statusRes.configured && statusRes.auth_url) {
        window.location.href = statusRes.auth_url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Google credentials.');
    } finally {
      setSavingConfig(false);
    }
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2500);
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

          {/* Admin Notice with Configure Button */}
          {adminNotice && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium space-y-2">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>{adminNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure Google Client ID & Secret</span>
              </button>
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

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Gmail API OAuth 2.0
              </span>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="text-brand-600 hover:text-brand-700 font-semibold underline flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                Setup Google Credentials
              </button>
            </div>
          </div>

        </div>

        {/* Security & Standard footer */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Google Identity Services • OAuth 2.0 • Gmail API</span>
        </div>

      </div>

      {/* Google OAuth Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Connect Google Cloud Credentials</h3>
                  <p className="text-xs text-slate-500">From your open Google Cloud Console tab</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Checklist */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs text-slate-700">
              <p className="font-bold text-slate-900">In your Google Cloud Console tab:</p>
              <div className="space-y-1.5">
                <div>1. Set <strong>Authorized JavaScript origins</strong>:</div>
                <div className="flex items-center gap-2 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                  <span className="truncate">{window.location.origin}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div>2. Set <strong>Authorized redirect URIs</strong>:</div>
                <div className="flex items-center justify-between font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                  <span className="truncate">{window.location.origin}</span>
                  <button
                    type="button"
                    onClick={copyRedirectUri}
                    className="ml-2 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-sans font-semibold flex items-center gap-1 text-slate-700"
                  >
                    {copiedRedirect ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRedirect ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveGoogleConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Client ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456789-xxxxxxxx.apps.googleusercontent.com"
                  value={cfgClientId}
                  onChange={(e) => setCfgClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Client Secret <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="e.g. GOCSPX-xxxxxxxxxxxxxxxx"
                  value={cfgClientSecret}
                  onChange={(e) => setCfgClientSecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span>{savingConfig ? 'Saving...' : 'Save & Continue with Google'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
