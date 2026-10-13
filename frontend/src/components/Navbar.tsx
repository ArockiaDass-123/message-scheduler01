import React from 'react';
import { Calendar, Mail, Clock, History, Settings, Plus, LogOut, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: User | null;
  onOpenNewWorkspace: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onOpenNewWorkspace,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Mail },
    { id: 'workspaces', label: 'Workspaces', icon: Clock },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                  Message Scheduler
                </span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
                  Automated
                </span>
              </div>
            </button>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id || (item.id === 'workspaces' && currentTab === 'workspace-detail');
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Timezone badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{user?.timezone || 'Asia/Kolkata'}</span>
            </div>

            {/* + New Workspace button */}
            <button
              onClick={onOpenNewWorkspace}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Workspace</span>
            </button>

            {/* User profile with Google avatar, name, email & Sign Out */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3 ml-1">
              <div className="flex items-center gap-2">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.full_name || 'Google User'}
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200 shadow-xs">
                    {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                    {user?.full_name || 'Google Account'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={user?.email}>
                    {user?.email}
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 bg-white px-2 py-1.5 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-md ${
                isActive ? 'text-brand-600 font-semibold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
