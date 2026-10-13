import React, { useState, useEffect } from 'react';
import { Schedule, Workspace } from '../types';
import { api } from '../api/client';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';

interface GlobalCalendarPageProps {
  onOpenWorkspace: (id: number) => void;
  userTimezone?: string;
}

export const GlobalCalendarPage: React.FC<GlobalCalendarPageProps> = ({
  onOpenWorkspace,
  userTimezone = 'Asia/Kolkata',
}) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<Schedule[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  useEffect(() => {
    api.getGlobalSchedules()
      .then((data) => setSchedules(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ensureUtc = (isoStr: string): string => {
    if (!isoStr) return '';
    if (!isoStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(isoStr)) {
      return isoStr + 'Z';
    }
    return isoStr;
  };

  // Convert UTC ISO string to a Date object in the user's configured timezone
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

  const handleSelectDay = (day: Date) => {
    setSelectedDay(day);
    setSelectedDaySchedules(getSchedulesForDay(day));
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Yearly Overview Calendar</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated view of all message schedules across all workspaces for {currentYear}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl">
            {schedules.length} Total Scheduled Dispatches
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
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

      {/* 12-Month Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {months.map((monthIdx) => {
          const monthStart = new Date(currentYear, monthIdx, 1);
          const monthEnd = endOfMonth(monthStart);
          const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const startDayOfWeek = getDay(monthStart);
          const monthName = format(monthStart, 'MMMM');

          const monthCount = schedules.filter((s) => {
            const sLocal = toUserLocalDate(s.scheduled_at);
            return sLocal.getFullYear() === currentYear && sLocal.getMonth() === monthIdx;
          }).length;

          return (
            <div
              key={monthIdx}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {monthName}
                  </h4>
                  {monthCount > 0 && (
                    <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-full border border-brand-200">
                      {monthCount} msgs
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {dayHeaders.map((dh) => (
                    <span key={dh} className="text-[10px] font-semibold text-slate-400">
                      {dh}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}

                  {daysInMonth.map((day) => {
                    const daySchedules = getSchedulesForDay(day);
                    const hasSchedule = daySchedules.length > 0;
                    const isPicked = selectedDay && isSameDay(day, selectedDay);
                    const isCurrentToday = isToday(day);

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        className={`h-8 w-full rounded-lg text-xs font-medium relative flex flex-col items-center justify-center transition-all ${
                          isPicked
                            ? 'bg-slate-900 text-white font-bold'
                            : hasSchedule
                            ? 'bg-brand-50 text-brand-800 font-bold border border-brand-300'
                            : isCurrentToday
                            ? 'bg-slate-100 font-bold text-slate-900'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{format(day, 'd')}</span>
                        {hasSchedule && !isPicked && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Drawer / Summary */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Dispatches on {format(selectedDay, 'dd MMMM yyyy')}
            </h3>
            <span className="text-xs text-slate-400">
              {selectedDaySchedules.length} message(s) scheduled
            </span>
          </div>

          {selectedDaySchedules.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No messages scheduled on this specific date.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {selectedDaySchedules.map((s) => (
                <div
                  key={s.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        s.status === 'Sent'
                          ? 'bg-emerald-50 text-emerald-700'
                          : s.status === 'Failed'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      {s.status}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{s.workspace_name}</h4>
                      <p className="text-[11px] text-slate-500">
                        At {new Intl.DateTimeFormat('en-IN', { timeZone: userTimezone, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(s.scheduled_at))} • {s.recipient_count} recipients
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenWorkspace(s.workspace_id)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Open Workspace →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
