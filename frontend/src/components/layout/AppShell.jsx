import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, ShieldAlert, LogOut, UserCheck, Mail, MessageSquare, History, Activity, Menu, ChevronLeft, ChevronRight, Wand2, CalendarDays, PenTool, LayoutGrid } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { LanguageSelector } from '../common/LanguageSelector';
import { useTranslation } from 'react-i18next';


const SidebarItem = ({ icon: IconComponent, label, path, onNavigate, isCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  let isActive = false;
  if (path === '/') {
    isActive = location.pathname === '/';
  } else if (path === '/student') {
    isActive = location.pathname === '/student';
  } else if (path === '/shortlisted' && location.pathname.startsWith('/candidates') && location.state?.from === '/shortlisted') {
    isActive = true;
  } else if (path === '/candidates' && location.pathname.startsWith('/candidates') && location.state?.from === '/shortlisted') {
    isActive = false;
  } else {
    isActive = location.pathname.startsWith(path);
  }

  const handleNavigate = (e) => {
    e.preventDefault();
    if (location.pathname === path) return;
    onNavigate(); // Trigger progress bar
    setTimeout(() => {
      navigate(path);
    }, 100); // 100ms "Tactile Lag" for realism
  };

  return (
    <div
      onClick={handleNavigate}
      title={isCollapsed ? label : ""}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 mt-2 cursor-pointer group outline-none select-none ${isActive
        ? 'bg-primary-500/10 text-primary-500 border-primary-500/20 shadow-sm'
        : 'text-text-muted border-transparent hover:bg-surface hover:text-text-main hover:pl-5'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
    >
      <IconComponent size={20} className={`${isActive ? 'text-primary-500' : 'group-hover:text-primary-400'} transition-colors shrink-0`} />
      {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300">{label}</span>}
      {!isCollapsed && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]" />}
    </div>
  );
};

const AppShell = () => {
  const { t } = useTranslation();
  const { user, token, logout, fetchUser } = useAuthStore();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const [prevLocation, setPrevLocation] = useState(location);

  if (location !== prevLocation) {
    setPrevLocation(location);
    setIsNavigating(false);
  }

  const handleStartNav = () => setIsNavigating(true);

  React.useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary-500/30">
      {/* Global Progress Pulse flawlessly */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[100] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-500 to-cyan-400 animate-progress-bar shadow-[0_0_15px_rgba(20,184,166,0.8)]" />
        </div>
      )}

      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} border-r border-border bg-[#0A0A0B] flex flex-col transition-all duration-300 ease-in-out print:hidden relative`}>
        <div className={`p-3 border-b border-border flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-lg shadow-primary-500/20 shrink-0">
              <ShieldAlert size={24} className="text-white" />
            </div>
            {!isCollapsed && <span className="text-xl font-bold tracking-tight text-white italic whitespace-nowrap pr-1">{t('shortlisted.hireAI')}</span>}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-text-muted hover:text-primary-400 hover:bg-surface rounded-lg transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          {!user && token ? (
            /* Skeleton Loading State flawlessly */
            <div className="space-y-3 px-4 py-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-surface-dark animate-pulse rounded-lg opacity-50" />
              ))}
            </div>
          ) : user?.role === 'student' ? (
            <>
              <SidebarItem icon={LayoutDashboard} label="Self-Assessment" path="/student" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
              <SidebarItem icon={LayoutGrid} label={t('styleTransformer.templateGallery')} path="/student/transformer/gallery" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
              <SidebarItem icon={Wand2} label={t('styleTransformer.customTransformer')} path="/student/transformer/custom" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
              <SidebarItem icon={History} label="Past Audits" path="/student/history" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
            </>
          ) : (
            <>
              {user?.role === 'admin' && (
                <>
                  {!isCollapsed && <p className="px-4 text-xs font-semibold text-primary-500 uppercase tracking-wider mb-2 opacity-80">{t('shortlisted.administration')}</p>}
                  <SidebarItem icon={Activity} label="Platform Overview" path="/admin/dashboard" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <SidebarItem icon={ShieldAlert} label={t('shortlisted.viewEvaluators')} path="/tech-recruiters" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <div className="my-4 border-b border-border/50 mx-4" />
                </>
              )}

              {user?.role === 'tech_recruiter' && (
                <>
                  <SidebarItem icon={LayoutDashboard} label={t('shortlisted.evaluatorDashboard')} path="/tech-recruiter" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                </>
              )}

              {user?.role === 'hr' && (
                <>
                  <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <SidebarItem icon={FileText} label="JD Builder" path="/jd" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <SidebarItem icon={Users} label="Candidates" path="/candidates" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <SidebarItem icon={UserCheck} label="Shortlisted" path="/shortlisted" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <SidebarItem icon={Mail} label="Campaigns" path="/campaign" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <SidebarItem icon={CalendarDays} label="Schedule" path="/schedule" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <SidebarItem icon={ShieldAlert} label={t('shortlisted.viewEvaluators')} path="/tech-recruiters" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <SidebarItem icon={FileText} label="Generate Offer Letter" path="/offer-letter" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                  <SidebarItem icon={PenTool} label="Offer Tracking" path="/esign-status" onNavigate={handleStartNav} isCollapsed={isCollapsed} />
                </>
              )}
            </>
          )}

          {!isCollapsed && <p className="px-4 text-xs font-semibold text-text-muted uppercase tracking-wider mt-8 mb-2 opacity-50">{t('shortlisted.system')}</p>}
          <SidebarItem
            icon={Settings}
            label={user?.role === 'admin' ? "System Settings" : "Account & Email Settings"}
            path="/settings"
            onNavigate={handleStartNav}
            isCollapsed={isCollapsed}
          />
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-primary-500/10">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 transition-all duration-300">
                  <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Loading...'}</p>
                  <p className="text-xs text-text-muted truncate uppercase tracking-tighter font-bold">{user?.role || 'Guest'}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={logout}
                title="Terminate Session"
                className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative print:overflow-visible print:block">
        <div className="absolute top-6 right-6 z-40 print:hidden">
          <LanguageSelector />
        </div>
        <div className="flex-1 overflow-auto p-8 relative scroll-smooth print:p-0 print:overflow-visible print:block">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppShell;
