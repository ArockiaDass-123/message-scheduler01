import React, { useState, useEffect } from 'react';
import { WorkspaceDetail, Schedule, MessageLog, Recipient } from '../types';
import { api } from '../api/client';
import { MessageEditor } from '../components/MessageEditor';
import { RecipientsTab } from '../components/RecipientsTab';
import { CalendarTab } from '../components/CalendarTab';
import { HistoryTab } from '../components/HistoryTab';
import { ArrowLeft, Mail, Users, Calendar, History, Trash2, Edit3, Check, AlertCircle } from 'lucide-react';

interface WorkspaceDetailPageProps {
  workspaceId: number;
  onBack: () => void;
  onShowToast: (type: 'success' | 'error', text: string) => void;
  userTimezone?: string;
}

export const WorkspaceDetailPage: React.FC<WorkspaceDetailPageProps> = ({
  workspaceId,
  onBack,
  onShowToast,
  userTimezone = 'Asia/Kolkata',
}) => {
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [historyLogs, setHistoryLogs] = useState<MessageLog[]>([]);
  const [activeTab, setActiveTab] = useState<'message' | 'recipients' | 'calendar' | 'history'>('calendar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit name state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedName, setEditedName] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wsData, schedData, histData] = await Promise.all([
        api.getWorkspace(workspaceId),
        api.getWorkspaceSchedules(workspaceId),
        api.getWorkspaceHistory(workspaceId),
      ]);
      setWorkspace(wsData);
      setEditedName(wsData.name);
      setSchedules(schedData);
      setHistoryLogs(histData);
    } catch (err: any) {
      const message = err.message || 'Failed to load workspace data';
      setError(message);
      onShowToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Loading workspace details...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Failed to Load Workspace</h3>
          <p className="text-xs text-slate-500 mt-1">{error || 'Workspace could not be found or the server is unavailable.'}</p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Save workspace updates (message, subject, send channels)
  const handleSaveWorkspace = async (updatedFields: any) => {
    try {
      const updated = await api.updateWorkspace(workspace.id, updatedFields);
      setWorkspace({ ...workspace, ...updated });
      onShowToast('success', 'Message configuration updated successfully.');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to update message settings');
    }
  };

  // Toggle recipient selection
  const handleToggleRecipient = async (recipientId: number, isSelected: boolean) => {
    const updatedIds = isSelected
      ? [...workspace.selected_recipient_ids, recipientId]
      : workspace.selected_recipient_ids.filter((id) => id !== recipientId);

    try {
      await api.updateWorkspaceRecipients(
        workspace.id,
        workspace.recipients.map((r) => ({
          recipient_id: r.id,
          is_selected: updatedIds.includes(r.id),
        }))
      );
      setWorkspace({ ...workspace, selected_recipient_ids: updatedIds });
      onShowToast('success', isSelected ? 'Recipient added to workspace' : 'Recipient removed from workspace');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to update recipient');
    }
  };

  // Select / Deselect all
  const handleSelectAllRecipients = async (select: boolean) => {
    const allIds = select ? workspace.recipients.map((r) => r.id) : [];
    try {
      await api.updateWorkspaceRecipients(
        workspace.id,
        workspace.recipients.map((r) => ({
          recipient_id: r.id,
          is_selected: select,
        }))
      );
      setWorkspace({ ...workspace, selected_recipient_ids: allIds });
      onShowToast('success', select ? 'All recipients selected' : 'All recipients deselected');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to update recipients');
    }
  };

  // Add new recipient
  const handleAddRecipient = async (name: string, email: string, whatsapp?: string) => {
    try {
      const newRecip = await api.createRecipient({ name, email, whatsapp });
      const updatedRecipients = [...workspace.recipients, newRecip];
      const updatedSelected = [...workspace.selected_recipient_ids, newRecip.id];
      setWorkspace({
        ...workspace,
        recipients: updatedRecipients,
        selected_recipient_ids: updatedSelected,
      });
      onShowToast('success', `Recipient ${name} added successfully.`);
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to add recipient');
    }
  };

  // Delete recipient
  const handleDeleteRecipient = async (recipientId: number) => {
    if (!window.confirm('Are you sure you want to delete this recipient?')) return;
    try {
      await api.deleteRecipient(recipientId);
      setWorkspace({
        ...workspace,
        recipients: workspace.recipients.filter((r) => r.id !== recipientId),
        selected_recipient_ids: workspace.selected_recipient_ids.filter((id) => id !== recipientId),
      });
      onShowToast('success', 'Recipient deleted.');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to delete recipient');
    }
  };

  // Schedule single date
  const handleScheduleSingle = async (dateStr: string) => {
    try {
      const sched = await api.createSingleSchedule(workspace.id, dateStr);
      setSchedules([...schedules, sched]);
      onShowToast('success', 'Message scheduled successfully.');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to schedule');
    }
  };

  // Schedule monthly recurring
  const handleScheduleRecurring = async (data: any) => {
    try {
      const created = await api.createRecurringSchedule(workspace.id, data);
      setSchedules([...schedules, ...created]);
      onShowToast('success', `Generated ${created.length} recurring monthly schedules.`);
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to generate recurring schedules');
    }
  };

  // Schedule batch custom dates
  const handleScheduleBatch = async (dates: string[]) => {
    try {
      const created = await api.createBatchSchedules(workspace.id, dates);
      setSchedules([...schedules, ...created]);
      onShowToast('success', `Scheduled ${created.length} custom dates.`);
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to schedule batch dates');
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (scheduleId: number) => {
    try {
      await api.deleteSchedule(scheduleId);
      setSchedules(schedules.filter((s) => s.id !== scheduleId));
      onShowToast('success', 'Schedule removed.');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to delete schedule');
    }
  };

  // Retry schedule
  const handleRetrySchedule = async (scheduleId: number) => {
    try {
      await api.retrySchedule(scheduleId);
      onShowToast('success', 'Retry initiated.');
      await loadData();
    } catch (err: any) {
      onShowToast('error', err.message || 'Retry failed');
    }
  };

  // Send schedule immediately (test / manual trigger)
  const handleSendNow = async (scheduleId: number) => {
    try {
      await api.sendScheduleNow(scheduleId);
      onShowToast('success', 'Message sent successfully.');
      await loadData();
    } catch (err: any) {
      onShowToast('error', err.message || 'Dispatch error');
    }
  };

  // Delete workspace
  const handleDeleteWorkspace = async () => {
    if (!window.confirm(`Are you sure you want to delete workspace "${workspace.name}"? All schedules and logs will be removed.`)) return;
    try {
      await api.deleteWorkspace(workspace.id);
      onShowToast('success', 'Workspace deleted');
      onBack();
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to delete workspace');
    }
  };

  const tabs = [
    { id: 'message', label: 'MESSAGE', icon: Mail },
    { id: 'recipients', label: 'RECIPIENTS', icon: Users, badge: workspace.selected_recipient_ids.length },
    { id: 'calendar', label: 'CALENDAR', icon: Calendar, badge: schedules.length },
    { id: 'history', label: 'HISTORY', icon: History, badge: historyLogs.length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-xl font-bold text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  onClick={async () => {
                    await handleSaveWorkspace({ name: editedName });
                    setIsEditingTitle(false);
                  }}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{workspace.name}</h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity"
                  title="Rename Workspace"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {workspace.description && (
            <p className="text-xs text-slate-500 max-w-2xl">{workspace.description}</p>
          )}
        </div>

        {/* Delete Workspace Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDeleteWorkspace}
            title="Delete this workspace"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Workspace</span>
          </button>
        </div>
      </div>

      {/* 4 Simple Tabs as specified */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold tracking-wider transition-all relative ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'message' && (
          <MessageEditor
            workspace={workspace}
            onSave={handleSaveWorkspace}
            sampleRecipientName={workspace.recipients[0]?.name || 'Teacher Arockiadass'}
          />
        )}

        {activeTab === 'recipients' && (
          <RecipientsTab
            allRecipients={workspace.recipients}
            selectedRecipientIds={workspace.selected_recipient_ids}
            onToggleRecipient={handleToggleRecipient}
            onSelectAll={handleSelectAllRecipients}
            onAddRecipient={handleAddRecipient}
            onDeleteRecipient={handleDeleteRecipient}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab
            workspace={workspace}
            schedules={schedules}
            recipientCount={workspace.selected_recipient_ids.length}
            onScheduleSingle={handleScheduleSingle}
            onScheduleRecurring={handleScheduleRecurring}
            onScheduleBatch={handleScheduleBatch}
            onDeleteSchedule={handleDeleteSchedule}
            onRetrySchedule={handleRetrySchedule}
            onSendNow={handleSendNow}
            userTimezone={userTimezone}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            logs={historyLogs}
            onRetry={handleRetrySchedule}
            workspaceName={workspace.name}
          />
        )}
      </div>
    </div>
  );
};
