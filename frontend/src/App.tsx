import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { User, Workspace, DashboardSummary } from './types';
import { Navbar } from './components/Navbar';
import { Toast, ToastMessage } from './components/Toast';
import { NewWorkspaceModal } from './components/NewWorkspaceModal';
import { DashboardPage } from './pages/DashboardPage';
import { WorkspaceDetailPage } from './pages/WorkspaceDetailPage';
import { GlobalCalendarPage } from './pages/GlobalCalendarPage';
import { GlobalHistoryPage } from './pages/GlobalHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error', text: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check auth status on launch & handle Google OAuth redirect
  useEffect(() => {
    // Check if returning from Google OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const oauthCode = urlParams.get('code');
    const oauthError = urlParams.get('error');

    if (oauthError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      addToast('error', `Google authentication canceled or denied: ${oauthError}`);
      setLoadingAuth(false);
      return;
    }

    if (oauthCode) {
      setLoadingAuth(true);
      // Clean query params from URL address bar
      window.history.replaceState({}, document.title, window.location.pathname);

      console.log('[OAuth] Exchanging code with backend, redirect_uri:', window.location.origin);
      api.googleCallback(oauthCode, window.location.origin)
        .then((res) => {
          console.log('[OAuth] Success! User:', res.connected_email);
          setUser(res.user);
          addToast('success', `Signed in with Google (${res.connected_email})! Gmail is automatically connected.`);
        })
        .catch((err: any) => {
          console.error('[OAuth] Google callback FAILED:', err);
          addToast('error', `Google Sign-in failed: ${err.message || 'Unknown error'}`);
          // Store error so login page can show it
          sessionStorage.setItem('oauth_error', err.message || 'Google Sign-in failed');
        })
        .finally(() => {
          setLoadingAuth(false);
        });
      return;
    }

    const token = api.getToken();
    if (!token) {
      setLoadingAuth(false);
      return;
    }

    api.getMe()
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        api.clearToken();
        setUser(null);
      })
      .finally(() => {
        setLoadingAuth(false);
      });

    const handleUnauthorized = () => {
      setUser(null);
      addToast('error', 'Session ended. Please log in.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Fetch workspaces & summary whenever user is logged in
  const refreshWorkspaceData = async () => {
    if (!user) return;
    try {
      const [wsList, dashSummary] = await Promise.all([
        api.getWorkspaces(),
        api.getDashboardSummary(),
      ]);
      setWorkspaces(wsList);
      setSummary(dashSummary);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshWorkspaceData();
    }
  }, [user]);

  // Handle open workspace
  const handleOpenWorkspace = (id: number) => {
    setSelectedWorkspaceId(id);
    setCurrentTab('workspace-detail');
  };

  // Create workspace
  const handleCreateWorkspace = async (name: string, description?: string, subject?: string, message?: string) => {
    try {
      const newWs = await api.createWorkspace({
        name,
        description,
        subject: subject || `${name} - {{month}}`,
        message: message || 'Dear {{teacher_name}},\n\nPlease send me the monthly student update.\n\nThank you.',
      });
      await refreshWorkspaceData();
      addToast('success', `Workspace "${newWs.name}" created!`);
      handleOpenWorkspace(newWs.id);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create workspace');
      throw err;
    }
  };

  // Logout
  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    setSelectedWorkspaceId(null);
    setCurrentTab('dashboard');
    addToast('success', 'Logged out successfully');
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'workspace-detail') {
            setSelectedWorkspaceId(null);
          }
          if (tab === 'dashboard' || tab === 'workspaces') {
            refreshWorkspaceData();
          }
        }}
        user={user}
        onOpenNewWorkspace={() => setShowNewWorkspaceModal(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <DashboardPage
            workspaces={workspaces}
            summary={summary}
            user={user}
            onOpenWorkspace={handleOpenWorkspace}
            onNewWorkspace={() => setShowNewWorkspaceModal(true)}
            onOpenCalendar={() => setCurrentTab('calendar')}
            onOpenHistory={() => setCurrentTab('history')}
          />
        )}

        {currentTab === 'workspaces' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h1 className="text-xl font-bold text-slate-900">All Workspaces</h1>
                <p className="text-xs text-slate-500">Select a workspace to manage messages, recipients, and schedules.</p>
              </div>
              <button
                onClick={() => setShowNewWorkspaceModal(true)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                + New Workspace
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((ws) => (
                <div key={ws.id}>
                  {/* Reuse card */}
                  <DashboardPage
                    workspaces={[ws]}
                    summary={null}
                    onOpenWorkspace={handleOpenWorkspace}
                    onNewWorkspace={() => setShowNewWorkspaceModal(true)}
                    onOpenCalendar={() => setCurrentTab('calendar')}
                    onOpenHistory={() => setCurrentTab('history')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTab === 'workspace-detail' && selectedWorkspaceId && (
          <WorkspaceDetailPage
            workspaceId={selectedWorkspaceId}
            onBack={() => {
              setCurrentTab('dashboard');
              setSelectedWorkspaceId(null);
              refreshWorkspaceData();
            }}
            onShowToast={addToast}
            userTimezone={user.timezone}
          />
        )}

        {currentTab === 'calendar' && (
          <GlobalCalendarPage
            onOpenWorkspace={handleOpenWorkspace}
            userTimezone={user.timezone}
          />
        )}

        {currentTab === 'history' && (
          <GlobalHistoryPage onShowToast={addToast} />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            user={user}
            onUpdateUser={(updated) => setUser(updated)}
            onShowToast={addToast}
          />
        )}
      </main>

      {/* New Workspace Modal */}
      <NewWorkspaceModal
        isOpen={showNewWorkspaceModal}
        onClose={() => setShowNewWorkspaceModal(false)}
        onCreate={handleCreateWorkspace}
      />

      {/* Floating Toasts */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
