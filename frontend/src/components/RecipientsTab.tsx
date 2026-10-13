import React, { useState } from 'react';
import { Recipient } from '../types';
import { Plus, Trash2, Mail, Phone, Check, UserCheck, X } from 'lucide-react';

interface RecipientsTabProps {
  allRecipients: Recipient[];
  selectedRecipientIds: number[];
  onToggleRecipient: (recipientId: number, isSelected: boolean) => Promise<void>;
  onSelectAll: (select: boolean) => Promise<void>;
  onAddRecipient: (name: string, email: string, whatsapp?: string) => Promise<void>;
  onDeleteRecipient: (recipientId: number) => Promise<void>;
}

export const RecipientsTab: React.FC<RecipientsTabProps> = ({
  allRecipients,
  selectedRecipientIds,
  onToggleRecipient,
  onSelectAll,
  onAddRecipient,
  onDeleteRecipient,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAllSelected = allRecipients.length > 0 && selectedRecipientIds.length === allRecipients.length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setError('Please provide both name and email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddRecipient(newName.trim(), newEmail.trim(), newWhatsapp.trim() || undefined);
      setNewName('');
      setNewEmail('');
      setNewWhatsapp('');
      setShowAddModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add recipient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Workspace Recipients</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select teachers or recipients who should receive messages scheduled from this workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectAll(!isAllSelected)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recipient</span>
          </button>
        </div>
      </div>

      {/* Recipient Selection Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          <strong className="text-slate-800">{selectedRecipientIds.length}</strong> of{' '}
          <strong className="text-slate-800">{allRecipients.length}</strong> recipients selected
        </span>
        <span>Selected recipients are automatically included in every scheduled run</span>
      </div>

      {/* Recipient List Cards / Table */}
      {allRecipients.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No Recipients Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add teachers, colleagues, or parents to start scheduling recurring communications.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Recipient</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {allRecipients.map((recip) => {
            const isSelected = selectedRecipientIds.includes(recip.id);
            return (
              <div
                key={recip.id}
                className={`p-4 flex items-center justify-between transition-colors ${
                  isSelected ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/50 hover:bg-slate-100/50 opacity-75'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggleRecipient(recip.id, e.target.checked)}
                    className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                      {recip.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        {recip.email}
                      </span>
                      {recip.whatsapp && (
                        <span className="flex items-center gap-1 truncate">
                          <Phone className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          {recip.whatsapp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      isSelected ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isSelected ? 'Included' : 'Excluded'}
                  </span>
                  <button
                    onClick={() => onDeleteRecipient(recip.id)}
                    title="Delete Recipient"
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Recipient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add New Recipient</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Arockiadass or Teacher Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. arockiadass123@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  WhatsApp Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                  placeholder="e.g. +919876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newName.trim() || !newEmail.trim()}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  {loading ? 'Adding...' : 'Add Recipient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
