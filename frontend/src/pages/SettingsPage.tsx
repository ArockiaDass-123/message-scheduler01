import React, { useState, useEffect } from 'react';
import { User, Integration } from '../types';
import { api } from '../api/client';
import { Mail, MessageSquare, Globe, UserCheck, ShieldCheck, CheckCircle2, AlertCircle, Send, Check } from 'lucide-react';

interface SettingsPageProps {
  user: User | null;
  onUpdateUser: (user: User) => void;
  onShowToast: (type: 'success' | 'error', text: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateUser, onShowToast }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);

  // Timezone state
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [savingTz, setSavingTz] = useState(false);

  // Gmail / SMTP modal state
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [gmailSenderName, setGmailSenderName] = useState('Message Scheduler');
  const [gmailSmtpHost, setGmailSmtpHost] = useState('smtp.gmail.com');
  const [gmailSmtpPort, setGmailSmtpPort] = useState(465);
  const [showAdvancedSmtp, setShowAdvancedSmtp] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);

  // WhatsApp modal state
  const [showWaModal, setShowWaModal] = useState(false);
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [connectingWa, setConnectingWa] = useState(false);

  // Test email state
  const [testEmailTo, setTestEmailTo] = useState(user?.email || '');
  const [sendingTest, setSendingTest] = useState(false);

  const loadIntegrations = async () => {
    try {
      const data = await api.getIntegrations();
      setIntegrations(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const gmailIntegration = integrations.find((i) => i.provider === 'gmail');
  const isGmailConnected = gmailIntegration?.status === 'connected';

  const waIntegration = integrations.find((i) => i.provider === 'whatsapp');
  const isWaConnected = waIntegration?.status === 'connected';

  // Handle Timezone Save
  const handleSaveTimezone = async () => {
    setSavingTz(true);
    try {
      await api.updateTimezone(timezone);
      if (user) {
        onUpdateUser({ ...user, timezone });
      }
      onShowToast('success', `Timezone set to ${timezone}`);
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to update timezone');
    } finally {
      setSavingTz(false);
    }
  };

  // Handle Connect Gmail modal
  const handleConnectGmail = () => {
    setShowGmailModal(true);
  };

  const handleManualGmailSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailEmail.trim()) {
      onShowToast('error', 'Please enter your email address');
      return;
    }
    if (!gmailPassword.trim()) {
      onShowToast('error', 'Please enter your 16-character Google App Password');
      return;
    }
    setConnectingGmail(true);
    try {
      await api.connectGmail({
        account_email: gmailEmail.trim(),
        password: gmailPassword.trim(),
        sender_name: gmailSenderName.trim() || 'Message Scheduler',
        smtp_host: gmailSmtpHost.trim() || 'smtp.gmail.com',
        smtp_port: Number(gmailSmtpPort) || 465,
      });
      await loadIntegrations();
      setShowGmailModal(false);
      onShowToast('success', `Email successfully verified & connected for ${gmailEmail}!`);
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to connect email');
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm('Are you sure you want to disconnect this email account?')) return;
    try {
      await api.disconnectGmail();
      await loadIntegrations();
      onShowToast('success', 'Email account disconnected');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to disconnect');
    }
  };

  // WhatsApp Connect
  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waPhoneId.trim() || !waToken.trim()) return;
    setConnectingWa(true);
    try {
      await api.connectWhatsApp(waPhoneId.trim(), waToken.trim());
      await loadIntegrations();
      setShowWaModal(false);
      onShowToast('success', 'WhatsApp Business Cloud API connected successfully!');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to connect WhatsApp');
    } finally {
      setConnectingWa(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp?')) return;
    try {
      await api.disconnectWhatsApp();
      await loadIntegrations();
      onShowToast('success', 'WhatsApp disconnected');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to disconnect');
    }
  };

  // Send Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo.trim()) return;
    setSendingTest(true);
    try {
      const res = await api.sendTestEmail(
        testEmailTo.trim(),
        'Message Scheduler - Test Dispatch',
        'Hello! This is an automated test confirming your message dispatch pipeline is active and verified.'
      );
      onShowToast('success', res.message || 'Test email dispatched successfully!');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const commonTimezones = [
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Singapore',
    'UTC',
    'Europe/London',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Australia/Sydney',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure Gmail API, WhatsApp Cloud API, scheduling timezone, and account preferences.
        </p>
      </div>

      {/* Email / Gmail Integration Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Email Dispatch (Gmail & SMTP)</span>
                {isGmailConnected ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected ✓
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Not Connected (Required for Real Emails)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your Gmail or email account using a 16-character App Password to send real automated emails.
              </p>
            </div>
          </div>

          <div>
            {isGmailConnected ? (
              <button
                onClick={handleDisconnectGmail}
                className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectGmail}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Connect Email
              </button>
            )}
          </div>
        </div>

        {isGmailConnected && gmailIntegration?.account_info && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <span className="text-slate-500">Connected Sender Address:</span>
            <span className="font-bold text-emerald-800">{gmailIntegration.account_info}</span>
          </div>
        )}
      </div>

      {/* WhatsApp Business Cloud API Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>WhatsApp Business Cloud API</span>
                {isWaConnected ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected ✓
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Optional
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Meta WhatsApp Cloud API. No web scraping or unofficial automation used.
              </p>
            </div>
          </div>

          <div>
            {isWaConnected ? (
              <button
                onClick={handleDisconnectWhatsApp}
                className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => setShowWaModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Connect WhatsApp
              </button>
            )}
          </div>
        </div>

        {isWaConnected && waIntegration?.account_info && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <span className="text-slate-500">Connected Phone Number:</span>
            <span className="font-bold text-slate-800">{waIntegration.account_info}</span>
          </div>
        )}
      </div>

      {/* Timezone Setting */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Application Timezone</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Default is <strong className="text-slate-800">Asia/Kolkata</strong> (IST). All message dispatches and calendar occurrences synchronize to this timezone.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500/20"
          >
            {commonTimezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <button
            onClick={handleSaveTimezone}
            disabled={savingTz || timezone === user?.timezone}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            {savingTz ? 'Saving...' : 'Save Timezone'}
          </button>
        </div>
      </div>

      {/* Test Email Dispatch Tool */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Test Message Dispatch</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Send an instant test message to any email address to verify the pipeline.
            </p>
          </div>
        </div>

        <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <input
            type="email"
            required
            value={testEmailTo}
            onChange={(e) => setTestEmailTo(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            disabled={sendingTest || !testEmailTo.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingTest ? 'Sending Test...' : 'Send Test Email'}</span>
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Account Information</h3>
            <p className="text-xs text-slate-500 mt-0.5">Signed in user credentials & workspace isolation.</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Email:</span>
            <span className="font-bold text-slate-800">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Name:</span>
            <span className="font-bold text-slate-800">{user?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Security:</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Encrypted Credentials & Server-side Authorization</span>
            </span>
          </div>
        </div>
      </div>

      {/* Connect Gmail / Email Modal */}
      {showGmailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900">Connect Gmail / Email Account</h3>
              </div>
              <button
                onClick={() => setShowGmailModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualGmailSave} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-slate-700">
                <div className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                  <span>💡 How to get your Google 16-character App Password:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
                  <li>Open Google Account: <strong>myaccount.google.com/apppasswords</strong></li>
                  <li>Ensure <strong>2-Step Verification</strong> is ON for your Google account.</li>
                  <li>Enter app name (e.g. <em>Message Scheduler</em>) and click <strong>Create</strong>.</li>
                  <li>Copy the <strong>16-letter password</strong> (e.g. <code>abcd efgh ijkl mnop</code>) and paste below.</li>
                </ol>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Sender Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={gmailEmail}
                  onChange={(e) => setGmailEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  16-Character Google App Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={gmailPassword}
                  onChange={(e) => setGmailPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-wider focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Securely encrypted on server. All real emails will be delivered directly from this address.
                </p>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Sender Display Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={gmailSenderName}
                  onChange={(e) => setGmailSenderName(e.target.value)}
                  placeholder="Message Scheduler / School Office"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {/* Advanced SMTP Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSmtp(!showAdvancedSmtp)}
                  className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>{showAdvancedSmtp ? '▼ Hide' : '▶ Show'} Advanced SMTP Server Settings (Outlook, Zoho, Custom)</span>
                </button>
              </div>

              {showAdvancedSmtp && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1 text-[10px]">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={gmailSmtpHost}
                      onChange={(e) => setGmailSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1 text-[10px]">
                      SMTP Port (465 SSL or 587 TLS)
                    </label>
                    <input
                      type="number"
                      value={gmailSmtpPort}
                      onChange={(e) => setGmailSmtpPort(Number(e.target.value))}
                      placeholder="465"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGmailModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectingGmail || !gmailEmail.trim() || !gmailPassword.trim()}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm"
                >
                  {connectingGmail ? 'Verifying & Connecting...' : 'Connect & Verify Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect WhatsApp Modal */}
      {showWaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Connect WhatsApp Cloud API</h3>
              </div>
              <button
                onClick={() => setShowWaModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWhatsApp} className="p-6 space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed">
                Enter your Official Meta WhatsApp Business Cloud API credentials from the Meta for Developers portal.
              </p>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Phone Number ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={waPhoneId}
                  onChange={(e) => setWaPhoneId(e.target.value)}
                  placeholder="e.g. 104859602498274"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Access Token <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={waToken}
                  onChange={(e) => setWaToken(e.target.value)}
                  placeholder="EAAB..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWaModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectingWa || !waPhoneId.trim() || !waToken.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm"
                >
                  {connectingWa ? 'Saving...' : 'Connect WhatsApp API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
