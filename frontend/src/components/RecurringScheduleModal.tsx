import React, { useState } from 'react';
import { Workspace } from '../types';
import { X, Repeat, Clock, Calendar, Check, AlertCircle } from 'lucide-react';

interface RecurringScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
  recipientCount: number;
  onConfirmRecurring: (data: {
    day_of_month: number;
    time_str: string;
    start_year: number;
    start_month: number;
    months_count: number;
  }) => Promise<void>;
  timezone?: string;
}

export const RecurringScheduleModal: React.FC<RecurringScheduleModalProps> = ({
  isOpen,
  onClose,
  workspace,
  recipientCount,
  onConfirmRecurring,
  timezone = 'Asia/Kolkata',
}) => {
  const currentDate = new Date();
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [timeStr, setTimeStr] = useState<string>('09:00');
  const [startYear, setStartYear] = useState<number>(currentDate.getFullYear());
  const [startMonth, setStartMonth] = useState<number>(currentDate.getMonth() + 1);
  const [monthsCount, setMonthsCount] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate preview dates
  const previewDates: string[] = [];
  let y = startYear;
  let m = startMonth;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  for (let i = 0; i < monthsCount; i++) {
    const padDay = dayOfMonth < 10 ? `0${dayOfMonth}` : `${dayOfMonth}`;
    previewDates.push(`${padDay} ${monthNames[m - 1]} ${y}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recipientCount === 0) {
      setError('Please select at least 1 recipient in the Recipients tab before scheduling.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirmRecurring({
        day_of_month: dayOfMonth,
        time_str: timeStr,
        start_year: startYear,
        start_month: startMonth,
        months_count: monthsCount,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate recurring schedules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Monthly Recurring Schedule</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Day of Month
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">e.g. 5th of every month</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Dispatch Time
              </label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">{timezone}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Starting Month
              </label>
              <select
                value={`${startYear}-${startMonth}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number);
                  setStartYear(y);
                  setStartMonth(m);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              >
                {Array.from({ length: 24 }).map((_, idx) => {
                  const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + idx, 1);
                  const y = d.getFullYear();
                  const m = d.getMonth() + 1;
                  return (
                    <option key={`${y}-${m}`} value={`${y}-${m}`}>
                      {monthNames[m - 1]} {y}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Occurrences
              </label>
              <select
                value={monthsCount}
                onChange={(e) => setMonthsCount(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              >
                <option value={3}>3 months (Quarterly)</option>
                <option value={6}>6 months (Half Year)</option>
                <option value={12}>12 months (Full Year)</option>
                <option value={24}>24 months (Two Years)</option>
              </select>
            </div>
          </div>

          {/* Generated occurrences preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Scheduled Dates Preview ({previewDates.length} messages)
              </label>
              <span className="text-[11px] text-slate-400">At {timeStr}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto grid grid-cols-2 gap-1.5 text-xs text-slate-700 font-medium">
              {previewDates.map((dateStr, i) => (
                <div key={i} className="flex items-center gap-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                  <span>{dateStr}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
            >
              {loading ? 'Creating...' : `Schedule ${monthsCount} Messages`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
