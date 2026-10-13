import React, { useState } from 'react';
import { MessageLog } from '../types';
import { CheckCircle2, AlertCircle, Mail, MessageSquare, RotateCcw, X, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryTabProps {
  logs: MessageLog[];
  onRetry?: (scheduleId: number) => Promise<void>;
  workspaceName?: string;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  logs,
  onRetry,
  workspaceName,
}) => {
  const [selectedLog, setSelectedLog] = useState<MessageLog | null>(null);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async (scheduleId?: number) => {
    if (!scheduleId || !onRetry) return;
    setRetrying(true);
    try {
      await onRetry(scheduleId);
      setSelectedLog(null);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Message Dispatch History</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of all sent and failed messages for this workspace. Click any entry to view full details.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
          {logs.length} dispatch logs
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-2 text-slate-400">
          <Mail className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No message history yet.</p>
          <p className="text-xs text-slate-400">
            When scheduled dates arrive or when you click "Send Now", dispatch records will be logged here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {logs.map((log) => {
            const isSent = log.status === 'Sent';
            const logDate = new Date(log.sent_at);
            const formattedDate = format(logDate, 'dd MMM yyyy, hh:mm a');

            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSent
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {isSent ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {log.subject_snapshot || 'Scheduled Message'}
                      </p>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-medium">{formattedDate}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>To: <strong className="text-slate-700 font-semibold">{log.recipient_name || 'Recipient'}</strong> ({log.recipient_destination})</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {log.channel === 'email' ? (
                          <Mail className="w-3 h-3 text-slate-400" />
                        ) : (
                          <MessageSquare className="w-3 h-3 text-emerald-500" />
                        )}
                        <span className="capitalize">{log.channel}</span>
                      </span>
                    </div>

                    {!isSent && log.error_message && (
                      <p className="text-xs text-rose-600 font-medium mt-1 truncate">
                        Reason: {log.error_message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                      isSent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isSent ? '✓ Sent' : '⚠ Failed'}
                  </span>
                  <Eye className="w-4 h-4 text-slate-400 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                    selectedLog.status === 'Sent'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {selectedLog.status === 'Sent' ? '✓' : '!'}
                </div>
                <h3 className="text-base font-bold text-slate-900">Message Dispatch Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Recipient:</span>
                  <span className="font-bold text-slate-800">
                    {selectedLog.recipient_name} ({selectedLog.recipient_destination})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Channel:</span>
                  <span className="font-bold uppercase text-slate-800">{selectedLog.channel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Sent At:</span>
                  <span className="font-bold text-slate-800">
                    {format(new Date(selectedLog.sent_at), 'dd MMMM yyyy, hh:mm:ss a')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Delivery Status:</span>
                  <span
                    className={`font-bold ${
                      selectedLog.status === 'Sent' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedLog.status === 'Sent' ? 'Delivered Successfully' : 'Failed'}
                  </span>
                </div>
              </div>

              {selectedLog.status === 'Failed' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Dispatch Error</span>
                  </p>
                  <p className="font-mono text-[11px] leading-relaxed break-all">
                    {selectedLog.error_message || 'Unknown network or API error'}
                  </p>
                </div>
              )}

              {/* Message Snapshot */}
              <div>
                <p className="font-bold uppercase tracking-wider text-slate-400 mb-1 text-[10px]">
                  Delivered Content Snapshot
                </p>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-sans whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  <p className="font-bold mb-2 pb-1 border-b border-slate-200">
                    {selectedLog.subject_snapshot}
                  </p>
                  <p>{selectedLog.message_snapshot}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-[11px] text-slate-400">Logged permanently in database</span>
                <div className="flex items-center gap-2">
                  {selectedLog.status === 'Failed' && selectedLog.schedule_id && onRetry && (
                    <button
                      disabled={retrying}
                      onClick={() => handleRetry(selectedLog.schedule_id)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{retrying ? 'Retrying...' : 'Retry Sending'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
