import React, { useState } from 'react';
import { Workspace, Recipient } from '../types';
import { X, Calendar as CalendarIcon, Clock, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  workspace: Workspace;
  recipientCount: number;
  onConfirmSchedule: (scheduledAt: string) => Promise<void>;
  timezone?: string;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  workspace,
  recipientCount,
  onConfirmSchedule,
  timezone = 'Asia/Kolkata',
}) => {
  const [timeStr, setTimeStr] = useState('09:00');
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const dateFormatted = format(selectedDate, 'dd MMMM yyyy');

  const handleInitialSchedule = () => {
    if (recipientCount === 0) {
      setError('Please select at least 1 recipient in the Recipients tab before scheduling.');
      return;
    }
    setError(null);
    setIsConfirming(true);
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build ISO string in chosen date and time
      const [h, m] = timeStr.split(':');
      const d = new Date(selectedDate);
      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      
      await onConfirmSchedule(d.toISOString());
      setIsConfirming(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">
              {isConfirming ? 'Confirm Schedule' : 'Schedule Message'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!isConfirming ? (
            <>
              {/* Form Step */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400">Workspace</span>
                  <span className="text-sm font-bold text-slate-800">{workspace.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400">Date</span>
                  <span className="text-sm font-semibold text-slate-800">{dateFormatted}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400">Recipients</span>
                  <span className="text-sm font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                    {recipientCount} recipients
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Dispatch Time
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="time"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium px-3 py-2.5 bg-slate-100 rounded-xl">
                    {timezone}
                  </span>
                </div>
              </div>

              {/* Message Subject Preview */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Subject Preview
                </label>
                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 font-medium truncate">
                  {workspace.subject}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInitialSchedule}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  Schedule Message
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmation Step */}
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
                  <p className="font-semibold mb-1">Please confirm your scheduled dispatch:</p>
                  <p>
                    On <strong>{dateFormatted}</strong> at <strong>{timeStr} ({timezone})</strong>, the system will automatically send this message to <strong>{recipientCount}</strong> recipients.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Workspace:</span>
                    <span className="font-bold text-slate-800">{workspace.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Date & Time:</span>
                    <span className="font-bold text-slate-800">{dateFormatted}, {timeStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Recipients:</span>
                    <span className="font-bold text-slate-800">{recipientCount} recipients</span>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsConfirming(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleFinalConfirm}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{loading ? 'Scheduling...' : 'Confirm Schedule'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
