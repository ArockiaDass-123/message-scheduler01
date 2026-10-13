import React, { useState } from 'react';
import { Workspace, Schedule } from '../types';
import { ScheduleModal } from './ScheduleModal';
import { RecurringScheduleModal } from './RecurringScheduleModal';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Repeat,
  Calendar as CalendarIcon,
  Play,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isToday,
  addMonths,
  subMonths
} from 'date-fns';

interface CalendarTabProps {
  workspace: Workspace;
  schedules: Schedule[];
  recipientCount: number;
  onScheduleSingle: (dateStr: string) => Promise<void>;
  onScheduleRecurring: (data: any) => Promise<void>;
  onScheduleBatch: (dates: string[]) => Promise<void>;
  onDeleteSchedule: (scheduleId: number) => Promise<void>;
  onRetrySchedule: (scheduleId: number) => Promise<void>;
  onSendNow: (scheduleId: number) => Promise<void>;
  userTimezone?: string;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  workspace,
  schedules,
  recipientCount,
  onScheduleSingle,
  onScheduleRecurring,
  onScheduleBatch,
  onDeleteSchedule,
  onRetrySchedule,
  onSendNow,
  userTimezone = 'Asia/Kolkata',
}) => {
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 9, 5)); // 05 Oct 2026 default
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchDates, setBatchDates] = useState<Date[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const ensureUtc = (isoStr: string): string => {
    if (!isoStr) return '';
    if (!isoStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(isoStr)) {
      return isoStr + 'Z';
    }
    return isoStr;
  };

  // Convert a UTC ISO date string to the user's configured timezone
  const toUserLocalDate = (isoStr: string): Date => {
    const d = new Date(ensureUtc(isoStr));
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
    return new Date(
      Number(get('year')), Number(get('month')) - 1, Number(get('day')),
      Number(get('hour')), Number(get('minute'))
    );
  };

  // Format a UTC ISO string to display time in user's timezone
  const formatInUserTz = (isoStr: string, fmt: string): string => {
    const d = new Date(ensureUtc(isoStr));
    // Use Intl to build the display string in user's timezone
    try {
      const opts: Intl.DateTimeFormatOptions = {
        timeZone: userTimezone,
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      };
      return new Intl.DateTimeFormat('en-IN', opts).format(d);
    } catch {
      return format(d, fmt);
    }
  };

  // Check if a date has any schedule (in user's timezone)
  const getSchedulesForDay = (day: Date) => {
    return schedules.filter((s) => {
      const sLocal = toUserLocalDate(s.scheduled_at);
      return (
        sLocal.getFullYear() === day.getFullYear() &&
        sLocal.getMonth() === day.getMonth() &&
        sLocal.getDate() === day.getDate()
      );
    });
  };

  const handleDayClick = (day: Date) => {
    if (batchMode) {
      // Toggle date in batch selection
      const exists = batchDates.some((d) => isSameDay(d, day));
      if (exists) {
        setBatchDates(batchDates.filter((d) => !isSameDay(d, day)));
      } else {
        setBatchDates([...batchDates, day]);
      }
    } else {
      setSelectedDate(day);
      setShowScheduleModal(true);
    }
  };

  const handleBatchConfirm = async () => {
    if (batchDates.length === 0) return;
    const isoDates = batchDates.map((d) => {
      const copy = new Date(d);
      copy.setHours(9, 0, 0, 0);
      return copy.toISOString();
    });
    await onScheduleBatch(isoDates);
    setBatchDates([]);
    setBatchMode(false);
  };

  return (
    <div className="space-y-8">
      {/* Calendar Top Action Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">Yearly Schedule Calendar</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              {schedules.length} scheduled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Click any date to schedule a message. Use recurring monthly or batch selector for multi-date setup.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {batchMode ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-2 rounded-xl border border-brand-200">
                {batchDates.length} dates selected
              </span>
              <button
                onClick={handleBatchConfirm}
                disabled={batchDates.length === 0}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm"
              >
                Schedule Selected Dates
              </button>
              <button
                onClick={() => {
                  setBatchMode(false);
                  setBatchDates([]);
                }}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowRecurringModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                <Repeat className="w-3.5 h-3.5 text-slate-500" />
                <span>Monthly Recurring (12 Months)</span>
              </button>

              <button
                onClick={() => setBatchMode(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>Select Custom Dates</span>
              </button>
            </>
          )}

          {/* Year Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl ml-2">
            <button
              onClick={() => setCurrentYear((prev) => prev - 1)}
              className="p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-800">{currentYear}</span>
            <button
              onClick={() => setCurrentYear((prev) => prev + 1)}
              className="p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {batchMode && (
        <div className="bg-brand-50 border border-brand-200 text-brand-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <span>Click multiple dates across the calendar months below. Selected dates will be highlighted.</span>
          <span className="font-semibold">{batchDates.length} selected</span>
        </div>
      )}

      {/* 12-Month Yearly Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {months.map((monthIdx) => {
          const monthStart = new Date(currentYear, monthIdx, 1);
          const monthEnd = endOfMonth(monthStart);
          const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const startDayOfWeek = getDay(monthStart); // 0 (Sun) to 6 (Sat)
          const monthName = format(monthStart, 'MMMM');

          // Check if this month has any schedules
          const monthScheduleCount = schedules.filter((s) => {
            const d = new Date(s.scheduled_at);
            return d.getFullYear() === currentYear && d.getMonth() === monthIdx;
          }).length;

          return (
            <div
              key={monthIdx}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Month title */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {monthName}
                  </h4>
                  {monthScheduleCount > 0 && (
                    <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-full border border-brand-200">
                      {monthScheduleCount} scheduled
                    </span>
                  )}
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {dayHeaders.map((dh) => (
                    <span key={dh} className="text-[10px] font-semibold text-slate-400">
                      {dh}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {/* Empty cells before 1st of month */}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}

                  {/* Month days */}
                  {daysInMonth.map((day) => {
                    const daySchedules = getSchedulesForDay(day);
                    const hasSchedule = daySchedules.length > 0;
                    const isBatchSelected = batchDates.some((d) => isSameDay(d, day));
                    const isCurrentToday = isToday(day);

                    // Check if any failed or sent
                    const hasFailed = daySchedules.some((s) => s.status === 'Failed');
                    const hasSent = daySchedules.some((s) => s.status === 'Sent');

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        title={
                          hasSchedule
                            ? `${daySchedules.length} message(s) scheduled on ${format(day, 'dd MMM yyyy')}`
                            : `Click to schedule on ${format(day, 'dd MMM yyyy')}`
                        }
                        className={`h-8 w-full rounded-lg text-xs font-medium relative flex flex-col items-center justify-center transition-all ${
                          isBatchSelected
                            ? 'bg-brand-600 text-white font-bold ring-2 ring-brand-300'
                            : hasSchedule
                            ? hasFailed
                              ? 'bg-rose-50 text-rose-800 font-bold border border-rose-300'
                              : hasSent
                              ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                              : 'bg-brand-50 text-brand-800 font-bold border border-brand-300'
                            : isCurrentToday
                            ? 'bg-slate-100 font-bold text-slate-900 border border-slate-300'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{format(day, 'd')}</span>

                        {/* Scheduled Dot Indicator */}
                        {hasSchedule && !isBatchSelected && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                              hasFailed ? 'bg-rose-600' : hasSent ? 'bg-emerald-600' : 'bg-brand-600'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick schedule dot explanation */}
              <div className="pt-2 text-[10px] text-slate-400 text-center flex items-center justify-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
                  <span>Scheduled</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Sent</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scheduled Occurrences Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-bold text-slate-900">
              Configured Schedules ({schedules.length})
            </h4>
          </div>
          <span className="text-xs text-slate-400">Timezone: {userTimezone}</span>
        </div>

        {schedules.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CalendarIcon className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No scheduled messages yet.</p>
            <p className="text-xs text-slate-400">
              Click any date above or click 'Monthly Recurring (12 Months)' to generate scheduled communications.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
            {schedules.map((sched) => {
              const formattedDate = formatInUserTz(sched.scheduled_at, 'dd MMMM yyyy, hh:mm a');
              const isLoading = actionLoadingId === sched.id;

              return (
                <div
                  key={sched.id}
                  className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Status badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        sched.status === 'Sent'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sched.status === 'Failed'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : sched.status === 'Sending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                          : 'bg-brand-50 text-brand-700 border border-brand-200'
                      }`}
                    >
                      {sched.status === 'Sent' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {sched.status === 'Failed' && <AlertCircle className="w-3.5 h-3.5" />}
                      {sched.status === 'Scheduled' && <Clock className="w-3.5 h-3.5" />}
                      <span>{sched.status}</span>
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-slate-800">{formattedDate}</p>
                      <p className="text-xs text-slate-500">
                        {sched.recurrence_type === 'monthly' ? 'Monthly Occurrence' : 'Custom Schedule'} •{' '}
                        {recipientCount} recipients
                        {sched.error_reason && (
                          <span className="text-rose-600 ml-1 font-medium">• {sched.error_reason}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Send Now, Retry, Delete */}
                  <div className="flex items-center gap-2">
                    {sched.status === 'Scheduled' && (
                      <button
                        disabled={isLoading}
                        onClick={async () => {
                          setActionLoadingId(sched.id);
                          try {
                            await onSendNow(sched.id);
                          } finally {
                            setActionLoadingId(null);
                          }
                        }}
                        title="Send this message immediately for testing"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <Play className="w-3 h-3 text-slate-600" />
                        <span>Send Now</span>
                      </button>
                    )}

                    {sched.status === 'Failed' && (
                      <button
                        disabled={isLoading}
                        onClick={async () => {
                          setActionLoadingId(sched.id);
                          try {
                            await onRetrySchedule(sched.id);
                          } finally {
                            setActionLoadingId(null);
                          }
                        }}
                        title="Retry sending"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteSchedule(sched.id)}
                      title="Cancel / Delete Schedule"
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Single Date Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        selectedDate={selectedDate}
        workspace={workspace}
        recipientCount={recipientCount}
        onConfirmSchedule={onScheduleSingle}
        timezone={userTimezone}
      />

      {/* Recurring Monthly Schedule Modal */}
      <RecurringScheduleModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        workspace={workspace}
        recipientCount={recipientCount}
        onConfirmRecurring={onScheduleRecurring}
        timezone={userTimezone}
      />
    </div>
  );
};
