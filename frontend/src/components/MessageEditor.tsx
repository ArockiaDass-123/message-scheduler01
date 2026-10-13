import React, { useState, useRef } from 'react';
import { Workspace } from '../types';
import { Check, Mail, MessageSquare, Bold, List, ListOrdered, Eye, Save } from 'lucide-react';

interface MessageEditorProps {
  workspace: Workspace;
  onSave: (updated: Partial<Workspace>) => Promise<void>;
  sampleRecipientName?: string;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  workspace,
  onSave,
  sampleRecipientName = 'Teacher Arockiadass',
}) => {
  const [subject, setSubject] = useState(workspace.subject || 'Monthly Student Update');
  const [message, setMessage] = useState(workspace.message || '');
  const [sendEmail, setSendEmail] = useState(workspace.send_email);
  const [sendWhatsapp, setSendWhatsapp] = useState(workspace.send_whatsapp);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const variables = [
    { tag: '{{teacher_name}}', label: 'Teacher Name' },
    { tag: '{{month}}', label: 'Month & Year' },
    { tag: '{{workspace_name}}', label: 'Workspace Name' },
    { tag: '{{date}}', label: 'Scheduled Date' },
    { tag: '{{recipient_email}}', label: 'Recipient Email' },
  ];

  const insertVariable = (tag: string) => {
    if (!textareaRef.current) {
      setMessage((prev) => prev + ' ' + tag);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = message.substring(0, start) + tag + message.substring(end);
    setMessage(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + tag.length;
        textareaRef.current.focus();
      }
    }, 10);
  };

  const insertFormatting = (type: 'bold' | 'bullet' | 'number') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = message.substring(start, end);

    let insertion = '';
    if (type === 'bold') {
      insertion = `**${selected || 'bold text'}**`;
    } else if (type === 'bullet') {
      insertion = `\n• ${selected || 'Item'}`;
    } else if (type === 'number') {
      insertion = `\n1. ${selected || 'Item'}`;
    }

    const newText = message.substring(0, start) + insertion + message.substring(end);
    setMessage(newText);
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSave({
        subject,
        message,
        send_email: sendEmail,
        send_whatsapp: sendWhatsapp,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Rendered preview
  const sampleMonth = 'October 2026';
  const previewSubject = subject
    .replace(/\{\{\s*teacher_name\s*\}\}/g, sampleRecipientName)
    .replace(/\{\{\s*month\s*\}\}/g, sampleMonth)
    .replace(/\{\{\s*workspace_name\s*\}\}/g, workspace.name);

  const previewBody = message
    .replace(/\{\{\s*teacher_name\s*\}\}/g, sampleRecipientName)
    .replace(/\{\{\s*recipient_name\s*\}\}/g, sampleRecipientName)
    .replace(/\{\{\s*month\s*\}\}/g, sampleMonth)
    .replace(/\{\{\s*workspace_name\s*\}\}/g, workspace.name)
    .replace(/\{\{\s*date\s*\}\}/g, '05 October 2026, 09:00 AM IST')
    .replace(/\{\{\s*recipient_email\s*\}\}/g, 'arockiadass123@gmail.com');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Editor Column */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          {/* Send Method Choice */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Send via
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Email (Gmail API)</span>
              </label>

              <label className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={sendWhatsapp}
                  onChange={(e) => setSendWhatsapp(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">WhatsApp Cloud API</span>
              </label>
            </div>
            {!sendEmail && !sendWhatsapp && (
              <p className="mt-1.5 text-xs text-rose-500">Please select at least one sending method.</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Message Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Monthly Student Update - {{month}}"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm"
            />
          </div>

          {/* Variables and Format helpers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Variables <span className="text-slate-400 lowercase">(click to insert)</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => insertFormatting('bold')}
                  title="Bold"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('bullet')}
                  title="Bullet Point"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('number')}
                  title="Numbered List"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                >
                  {v.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Text Editor */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Message Content
            </label>
            <textarea
              ref={textareaRef}
              rows={11}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your recurring message here..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-sans text-sm leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 resize-y"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Changes apply automatically to all upcoming scheduled messages.
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Message'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Column */}
      <div className="lg:col-span-5">
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Eye className="w-4 h-4" />
            <span>Live Recipient Preview</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Mock Email header */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">To:</span>
                <span className="font-semibold text-slate-800">{sampleRecipientName} &lt;arockiadass123@gmail.com&gt;</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Subject:</span>
                <span className="font-semibold text-slate-800 truncate ml-2">{previewSubject || '(No subject)'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Channels:</span>
                <span className="text-slate-600 font-medium">
                  {sendEmail && 'Email'} {sendEmail && sendWhatsapp && '•'} {sendWhatsapp && 'WhatsApp'}
                </span>
              </div>
            </div>

            {/* Email Body rendered */}
            <div className="p-6 bg-white min-h-[260px] text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {previewBody || <span className="text-slate-400 italic">Message preview will appear here as you type...</span>}
            </div>

            <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Preview rendered using sample teacher</span>
              <span>Tokens dynamically replaced at send time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
