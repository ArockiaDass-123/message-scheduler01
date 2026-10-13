import React from 'react';
import { Workspace } from '../types';
import { Clock, Users, Calendar, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const ensureUtc = (iso: string): string =>
  iso && !iso.endsWith('Z') && !iso.includes('+') ? iso + 'Z' : iso;

const fmtIst = (iso: string, opts: Intl.DateTimeFormatOptions): string => {
  try {
    return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(
      new Date(ensureUtc(iso))
    );
  } catch {
    return format(new Date(iso), 'dd MMM yyyy, h:mm a');
  }
};

interface WorkspaceCardProps {
  workspace: Workspace;
  onOpen: (id: number) => void;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, onOpen }) => {
  const nextDateFormatted = workspace.next_scheduled_at
    ? fmtIst(workspace.next_scheduled_at, {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      })
    : 'None scheduled';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between group">
      <div>
        {/* Workspace Title & Active Indicator */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
            {workspace.name}
          </h3>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" title="Active"></span>
        </div>

        {/* Optional Description */}
        {workspace.description && (
          <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
            {workspace.description}
          </p>
        )}

        {/* Next message line */}
        <div className="mb-4 pb-3 border-b border-slate-100 flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
          <span className="text-slate-500">Next message:</span>
          <span className="font-semibold text-slate-800">{nextDateFormatted}</span>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-slate-500">Recipients:</span>
            <span className="font-bold text-slate-800">{workspace.recipient_count}</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-slate-500">Scheduled:</span>
            <span className="font-bold text-slate-800">{workspace.scheduled_count}</span>
          </div>

          <div className="p-2.5 bg-emerald-50/50 rounded-xl flex items-center justify-between text-emerald-800">
            <span className="text-emerald-700">Sent:</span>
            <span className="font-bold">{workspace.sent_count}</span>
          </div>

          <div className="p-2.5 bg-brand-50/50 rounded-xl flex items-center justify-between text-brand-800">
            <span className="text-brand-700">Pending:</span>
            <span className="font-bold">{workspace.pending_count}</span>
          </div>
        </div>
      </div>

      {/* Open Workspace Action */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <button
          onClick={() => onOpen(workspace.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 group-hover:bg-brand-600 text-slate-800 group-hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <span>Open Workspace</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
