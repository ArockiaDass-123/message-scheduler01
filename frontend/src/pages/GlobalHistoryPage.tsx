import React, { useState, useEffect } from 'react';
import { MessageLog } from '../types';
import { api } from '../api/client';
import { HistoryTab } from '../components/HistoryTab';

interface GlobalHistoryPageProps {
  onShowToast: (type: 'success' | 'error', text: string) => void;
}

export const GlobalHistoryPage: React.FC<GlobalHistoryPageProps> = ({ onShowToast }) => {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const data = await api.getGlobalHistory();
      setLogs(data);
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to load dispatch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleRetry = async (scheduleId: number) => {
    try {
      await api.retrySchedule(scheduleId);
      onShowToast('success', 'Retry initiated successfully.');
      await loadLogs();
    } catch (err: any) {
      onShowToast('error', err.message || 'Retry failed');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Loading history logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HistoryTab logs={logs} onRetry={handleRetry} workspaceName="All Workspaces" />
    </div>
  );
};
