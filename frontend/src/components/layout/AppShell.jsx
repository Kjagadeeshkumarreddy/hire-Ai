import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, ShieldAlert, LogOut, UserCheck, Mail, MessageSquare, History } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const SidebarItem = ({ icon: Icon, label, path, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = path === '/' 
    ? location.pathname === '/' 
    : (path === '/student' ? location.pathname === '/student' : location.pathname.startsWith(path));
  
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
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 mt-2 cursor-pointer group outline-none select-none ${
        isActive 
          ? 'bg-primary-500/10 text-primary-500 border-primary-500/20 shadow-sm' 
          : 'text-text-muted border-transparent hover:bg-surface hover:text-text-main hover:pl-5'
      }`}
    >
      <Icon size={20} className={`${isActive ? 'text-primary-500' : 'group-hover:text-primary-400'} transition-colors`} />
      <span className="font-medium text-sm">{label}</span>
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]" />}
    </div>
  );
};

const AppShell = () => {
  const { user, token, logout, fetchUser } = useAuthStore();
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();
  
  // Reset progress bar on route change
  useEffect(() => {
    setIsNavigating(false);
  }, [location]);

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

      <aside className="w-64 border-r border-border bg-[#0A0A0B] flex flex-col print:hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-lg shadow-primary-500/20">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white italic">HireAI</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 opacity-50">Platform</p>
          
          {!user && token ? (
            /* Skeleton Loading State flawlessly */
            <div className="space-y-3 px-4 py-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-surface-dark animate-pulse rounded-lg opacity-50" />
              ))}
            </div>
          ) : user?.role === 'student' ? (
            <>
              <SidebarItem icon={LayoutDashboard} label="Self-Assessment" path="/student" onNavigate={handleStartNav} />
              <SidebarItem icon={History} label="Past Audits" path="/student/history" onNavigate={handleStartNav} />
            </>
          ) : (
            <>
              <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/" onNavigate={handleStartNav} />
              <SidebarItem icon={FileText} label="JD Builder" path="/jd" onNavigate={handleStartNav} />
              <SidebarItem icon={Users} label="Candidates" path="/candidates" onNavigate={handleStartNav} />
              <SidebarItem icon={UserCheck} label="Shortlisted" path="/shortlisted" onNavigate={handleStartNav} />
              <SidebarItem icon={Mail} label="Campaigns" path="/campaign" onNavigate={handleStartNav} />
              <SidebarItem icon={MessageSquare} label="Interview Forge" path="/questions" onNavigate={handleStartNav} />
              {localStorage.getItem('offer_letter_engine_active') === 'true' && (
                <SidebarItem icon={FileText} label="Generate Offer Letter" path="/offer-letter" onNavigate={handleStartNav} />
              )}
            </>
          )}
          
          <p className="px-4 text-xs font-semibold text-text-muted uppercase tracking-wider mt-8 mb-2 opacity-50">System</p>
          <SidebarItem icon={Settings} label="Settings" path="/settings" onNavigate={handleStartNav} />
        </nav>
        
        <div className="p-4 border-t border-border mt-auto">
          <div className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-primary-500/10">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Loading...'}</p>
                <p className="text-xs text-text-muted truncate uppercase tracking-tighter font-bold">{user?.role || 'Guest'}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              title="Terminate Session"
              className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col overflow-hidden relative print:overflow-visible print:block">
        <div className="flex-1 overflow-auto p-8 relative scroll-smooth print:p-0 print:overflow-visible print:block">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppShell;
