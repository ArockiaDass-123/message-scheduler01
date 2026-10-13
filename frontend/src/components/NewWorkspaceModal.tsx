import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface NewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string, subject?: string, message?: string) => Promise<void>;
}

export const NewWorkspaceModal: React.FC<NewWorkspaceModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a workspace name');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const defaultSubject = `${name.trim()} - {{month}}`;
      const defaultMessage = `Dear {{teacher_name}},\n\nPlease send me the details for ${name.trim()} for {{month}}.\n\nPlease include:\n1. Topics or activities completed\n2. Attendance and participation\n3. Key updates or issues needing attention\n\nThank you.`;
      
      await onCreate(name.trim(), description.trim() || undefined, defaultSubject, defaultMessage);
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Create New Workspace</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Workspace Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Teacher Student Update"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm font-medium transition-all"
            />
            <p className="mt-1 text-xs text-slate-400">
              Each workspace handles one communication workflow (e.g. Monthly Update, Fee Reminder, Exam Notice).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note about the purpose of this communication"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm transition-all"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
