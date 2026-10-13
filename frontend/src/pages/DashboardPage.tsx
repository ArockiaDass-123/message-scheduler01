import React from 'react';
import { User, Workspace, DashboardSummary, Schedule } from '../types';
import { WorkspaceCard } from '../components/WorkspaceCard';
import { Plus, Clock, CheckCircle2, Calendar, AlertCircle, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { format } from 'date-fns';

// Ensure ISO string is treated as UTC (append Z if missing)
const ensureUtc = (iso: string): string =>
  iso && !iso.endsWith('Z') && !iso.includes('+') ? iso + 'Z' : iso;

// Format a UTC ISO string in Asia/Kolkata timezone
const fmtIst = (iso: string, opts: Intl.DateTimeFormatOptions): string => {
  try {
    return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(
      new Date(ensureUtc(iso))
    );
  } catch {
    return format(new Date(iso), 'dd MMM yyyy, hh:mm a');
  }
};

interface DashboardPageProps {
  workspaces: Workspace[];
  summary: DashboardSummary | null;
  user?: User | null;
  onOpenWorkspace: (id: number) => void;
  onNewWorkspace: () => void;
  onOpenCalendar: () => void;
  onOpenHistory: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  workspaces,
  summary,
  user,
  onOpenWorkspace,
  onNewWorkspace,
  onOpenCalendar,
  onOpenHistory,
}) => {
  return (
    <div className="space-y-8">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            MESSAGE SCHEDULER
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated, scheduled communications powered by official Google Gmail API.
          </p>
        </div>

        <button
          onClick={onNewWorkspace}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Workspace</span>
        </button>
      </div>

      {/* Connected Google Account Banner */}
      {user && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.full_name || 'Google Account'}
                className="w-11 h-11 rounded-2xl border border-slate-200 object-cover shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center border border-brand-200 shadow-xs">
                {(user.full_name || user.email || 'G').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{user.full_name || 'Google User'}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Google OAuth 2.0 Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
            <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-medium">
              Timezone: <span className="font-semibold text-slate-800">{user.timezone}</span>
            </span>
          </div>
        </div>
      )}

      {/* Workspaces Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Workspaces ({workspaces.length})
          </h2>
          <span className="text-xs text-slate-400">Each workspace manages one recurring communication</span>
        </div>

        {workspaces.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <h3 className="text-base font-bold text-slate-800">No Workspaces Created Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first communication workflow (e.g. Monthly Teacher Student Update) in less than 2 minutes.
            </p>
            <button
              onClick={onNewWorkspace}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => (
              <WorkspaceCard key={ws.id} workspace={ws} onOpen={onOpenWorkspace} />
            ))}
          </div>
        )}
      </div>

      {/* Lower Dashboard: Today's Scheduled, Upcoming, and Recently Sent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* Today's Scheduled Messages */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h3 className="text-sm font-bold text-slate-900">Today's Scheduled</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {summary?.today.length || 0}
            </span>
          </div>

          {!summary?.today || summary.today.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No messages scheduled for today.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {summary.today.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onOpenWorkspace(s.workspace_id)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{s.workspace_name}</span>
                    <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {fmtIst(s.scheduled_at, { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span>{s.recipient_count} recipients</span>
                    <span className="capitalize">{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Messages */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming Messages</h3>
            </div>
            <button
              onClick={onOpenCalendar}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {!summary?.upcoming || summary.upcoming.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No upcoming schedules in the calendar.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {summary.upcoming.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onOpenWorkspace(s.workspace_id)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 truncate">{s.workspace_name}</span>
                    <span className="text-slate-600 font-semibold ml-2">
                      {fmtIst(s.scheduled_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span>{s.recipient_count} recipients</span>
                    <span className="text-brand-700 font-medium">Scheduled</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Sent */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Recently Sent</h3>
            </div>
            <button
              onClick={onOpenHistory}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>Audit Log</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {!summary?.recently_sent || summary.recently_sent.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No messages dispatched yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {summary.recently_sent.map((s) => {
                const isSuccess = s.status === 'Sent';
                return (
                  <div
                    key={s.id}
                    onClick={() => onOpenWorkspace(s.workspace_id)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate">{s.workspace_name}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSuccess
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isSuccess ? '✓ Sent' : '⚠ Failed'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>{s.recipient_count} recipients</span>
                      <span>{fmtIst(s.scheduled_at, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
