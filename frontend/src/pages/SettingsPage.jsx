import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Settings, ShieldAlert, ArrowRight, Trash2, Mail, Lock, User, AlertTriangle, Send, Server, Video, Monitor, ExternalLink, CheckCircle2, Loader2, LinkIcon } from 'lucide-react';
import apiClient from '../api/client';

const SettingsPage = () => {
  const { t } = useTranslation();
  const { user, deleteAccount, updateEmail } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Email Update State flawlessy
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // SMTP Configuration State flawlessly
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: ''
  });
  const [isSmtpLoading, setIsSmtpLoading] = useState(true);
  const [isSmtpUpdating, setIsSmtpUpdating] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState(null);

  // OAuth Integration State
  const [oauthStatus, setOauthStatus] = useState({ google_connected: false, teams_connected: false, google_configured: false, teams_configured: false });
  const [oauthLoading, setOauthLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [oauthMessage, setOauthMessage] = useState(null);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchSmtpSettings();
      fetchOauthStatus();
    }
    // Check URL params for OAuth callback status
    const params = new URLSearchParams(window.location.search);
    const oauthPlatform = params.get('oauth');
    const oauthResult = params.get('status');
    if (oauthPlatform && oauthResult) {
      if (oauthResult === 'success') {
        setOauthMessage({ success: true, message: `${oauthPlatform === 'google' ? 'Google Calendar' : 'Microsoft Teams'} connected successfully!` });
      } else {
        setOauthMessage({ success: false, message: `Failed to connect ${oauthPlatform === 'google' ? 'Google Calendar' : 'Microsoft Teams'}. Please try again.` });
      }
      // Clean URL params
      window.history.replaceState({}, '', '/settings');
      fetchOauthStatus();
    }
  }, [user]);

  const fetchSmtpSettings = async () => {
    try {
      const response = await apiClient.get('/auth/me/smtp');
      setSmtpConfig({
        ...response.data,
        smtp_password: '' // Never load the existing password for security
      });
    } catch (err) {
      console.error("Failed to load SMTP parameters:", err);
    } finally {
      setIsSmtpLoading(false);
    }
  };

  const fetchOauthStatus = async () => {
    try {
      const response = await apiClient.get('/auth/oauth/status');
      setOauthStatus(response.data);
    } catch (err) {
      console.error('Failed to load OAuth status:', err);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleConnectPlatform = async (platform) => {
    setConnectingPlatform(platform);
    setOauthMessage(null);
    try {
      const response = await apiClient.get(`/auth/oauth/${platform}/url`);
      // Open OAuth consent in same window (redirect flow)
      window.location.href = response.data.auth_url;
    } catch (err) {
      setOauthMessage({ success: false, message: err.response?.data?.detail || `Failed to initiate ${platform} authentication.` });
      setConnectingPlatform(null);
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    try {
      await apiClient.delete(`/auth/oauth/${platform}/disconnect`);
      setOauthStatus(prev => ({
        ...prev,
        [`${platform}_connected`]: false
      }));
      setOauthMessage({ success: true, message: `${platform === 'google' ? 'Google Calendar' : 'Microsoft Teams'} disconnected.` });
    } catch (err) {
      setOauthMessage({ success: false, message: err.response?.data?.detail || 'Disconnect failed.' });
    }
  };

  const handleUpdateSmtp = async (e) => {
    e.preventDefault();
    setIsSmtpUpdating(true);
    setSmtpStatus(null);
    try {
      await apiClient.patch('/auth/me/smtp', smtpConfig);
      setSmtpStatus({ success: true, message: "Email parameters synchronized flawlessly." });
      setSmtpConfig(prev => ({ ...prev, smtp_password: '' })); // Clear password field after save
    } catch (err) {
      setSmtpStatus({ success: false, message: err.response?.data?.detail || "Synchronization failed." });
    } finally {
      setIsSmtpUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      console.error("Deletion mapping failed:", err);
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    try {
      await updateEmail(password, newEmail);
      setIsEditingEmail(false);
      setPassword('');
      setNewEmail('');
    } catch (err) {
      setError(err.response?.data?.detail || "Identity verification failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-white tracking-tight">{t('settings.title')}</h1>
        <p className="text-text-muted">{t('settings.description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: General Settings Sidebar Navigation Linkings */}
        <div className="lg:col-span-1 space-y-2">
           <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary-500/10 text-primary-500 border border-primary-500/20 rounded-xl font-bold transition-all shadow-sm shadow-primary-500/5">
             <User size={18} /> {t('settings.accountProfile')}
           </button>
        </div>

        {/* Right: Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/20">
            <div className="p-6 border-b border-border bg-gradient-to-r from-surface to-white/5">
              <h3 className="font-bold text-lg text-white">{t('settings.adminDetails')}</h3>
            </div>
            <div className="p-8 space-y-6">
               <div className="flex flex-col gap-2">
                 <label className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('signup.fullName')}</label>
                 <div className="px-4 py-3 bg-background/50 border border-border rounded-xl text-white font-medium">
                   {user?.full_name || t('settings.systemOperator')}
                 </div>
               </div>
               
               <div className="flex flex-col gap-2 relative">
                 <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('settings.emailAddress')}</label>
                    <button 
                      onClick={() => {
                        setIsEditingEmail(!isEditingEmail);
                        setNewEmail(user?.email || '');
                        setError(null);
                      }}
                      className="text-[10px] font-black uppercase text-primary-500 hover:text-primary-400 transition-colors"
                    >
                      {isEditingEmail ? t('settings.cancelEdit') : t('settings.changeEmail')}
                    </button>
                 </div>

                 {!isEditingEmail ? (
                   <div className="px-4 py-3 bg-background/50 border border-border rounded-xl text-white font-medium opacity-80 italic">
                     {user?.email || 'admin@hiring.ai'}
                   </div>
                 ) : (
                   <form onSubmit={handleUpdateEmail} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-4">
                        <input 
                          type="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder={t('settings.newAdminEmail')}
                          className="w-full px-4 py-3 bg-background border border-primary-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-primary-500 shadow-lg shadow-primary-500/5"
                        />
                        <input 
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('settings.verifyCurrentPassword')}
                          className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      
                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold">
                          <AlertTriangle size={14} /> {error}
                        </div>
                      )}

                      <button 
                        disabled={isUpdating}
                        type="submit"
                        className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-black rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                      >
                        {isUpdating ? t('settings.verifyingCredentials') : t('settings.commitChange')}
                      </button>
                   </form>
                 )}
               </div>
            </div>
          </div>
 
          {/* Email Outbound Configuration Card - Restricted to HR ONLY flawlessly */}
          {user?.role === 'hr' && (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 mt-8">
              <div className="p-6 border-b border-border bg-gradient-to-r from-surface to-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                    <Send size={20} />
                  </div>
                  <h3 className="font-bold text-lg text-white">{t('settings.personalOutreach')}</h3>
                </div>
                {isSmtpLoading && <div className="text-[10px] font-black uppercase text-text-muted animate-pulse">{t('settings.loadingConfig')}</div>}
              </div>
              
              <div className="p-8">
                <form onSubmit={handleUpdateSmtp} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('settings.smtpHost')}</label>
                      <div className="relative">
                        <Server size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input 
                          type="text"
                          placeholder="e.g., smtp.gmail.com"
                          className="w-full pl-11 pr-4 py-3 bg-background/50 border border-border rounded-xl text-white font-medium focus:outline-none focus:border-primary-500 transition-all"
                          value={smtpConfig.smtp_host || ''}
                          onChange={(e) => setSmtpConfig({...smtpConfig, smtp_host: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('settings.smtpPort')}</label>
                      <input 
                        type="number"
                        placeholder="587"
                        className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl text-white font-medium focus:outline-none focus:border-primary-500 transition-all"
                        value={smtpConfig.smtp_port || 587}
                        onChange={(e) => setSmtpConfig({...smtpConfig, smtp_port: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('settings.smtpUsername')}</label>
                      <div className="relative">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input 
                          type="text"
                          placeholder="your-email@company.com"
                          className="w-full pl-11 pr-4 py-3 bg-background/50 border border-border rounded-xl text-white font-medium focus:outline-none focus:border-primary-500 transition-all"
                          value={smtpConfig.smtp_user || ''}
                          onChange={(e) => setSmtpConfig({...smtpConfig, smtp_user: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('settings.smtpPassword')}</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input 
                          type="password"
                          placeholder="••••••••••••"
                          className="w-full pl-11 pr-4 py-3 bg-background/50 border border-border rounded-xl text-white font-medium focus:outline-none focus:border-primary-500 transition-all"
                          value={smtpConfig.smtp_password || ''}
                          onChange={(e) => setSmtpConfig({...smtpConfig, smtp_password: e.target.value})}
                        />
                      </div>
                      <p className="text-[10px] text-text-muted italic px-1">{t('settings.keepCurrentCred')}</p>
                    </div>
                  </div>

                  {smtpStatus && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 animate-in zoom-in-95 duration-200 ${smtpStatus.success ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                      {smtpStatus.success ? <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> : <AlertTriangle size={14} />}
                      <p className="text-xs font-bold">{smtpStatus.message}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <button 
                      disabled={isSmtpUpdating}
                      type="submit"
                      className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-white/90 transition-all shadow-lg shadow-white/5 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSmtpUpdating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          {t('settings.syncing')}
                        </>
                      ) : (
                        <>{t('settings.syncEmailRegistry')}</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Meeting Platform Integrations - HR Only */}
          {user?.role === 'hr' && (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 mt-8">
              <div className="p-6 border-b border-border bg-gradient-to-r from-surface to-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                    <Video size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Meeting Integrations</h3>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Connect to create real meetings with calendar invites</p>
                  </div>
                </div>
                {oauthLoading && <div className="text-[10px] font-black uppercase text-text-muted animate-pulse">Loading...</div>}
              </div>
              
              <div className="p-8 space-y-4">
                {oauthMessage && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 animate-in zoom-in-95 duration-200 ${oauthMessage.success ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                    {oauthMessage.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={14} />}
                    <p className="text-xs font-bold">{oauthMessage.message}</p>
                    <button onClick={() => setOauthMessage(null)} className="ml-auto text-white/40 hover:text-white transition-colors">&times;</button>
                  </div>
                )}

                {/* Google Calendar / Meet */}
                <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-yellow-500/20 border border-red-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Video size={22} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Google Calendar & Meet</p>
                      <p className="text-[10px] text-slate-500 font-medium">Create Google Meet links & add events to calendar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {oauthStatus.google_connected ? (
                      <>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-green-400">
                          <CheckCircle2 size={12} /> Connected
                        </span>
                        <button
                          onClick={() => handleDisconnectPlatform('google')}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnectPlatform('google')}
                        disabled={connectingPlatform === 'google' || !oauthStatus.google_configured}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-yellow-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                        title={!oauthStatus.google_configured ? 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET not configured in .env' : ''}
                      >
                        {connectingPlatform === 'google' ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                        {connectingPlatform === 'google' ? 'Connecting...' : 'Connect Google'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Microsoft Teams */}
                <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Monitor size={22} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Microsoft Teams</p>
                      <p className="text-[10px] text-slate-500 font-medium">Create Teams meeting links for interviews</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {oauthStatus.teams_connected ? (
                      <>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-green-400">
                          <CheckCircle2 size={12} /> Connected
                        </span>
                        <button
                          onClick={() => handleDisconnectPlatform('teams')}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnectPlatform('teams')}
                        disabled={connectingPlatform === 'teams' || !oauthStatus.teams_configured}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                        title={!oauthStatus.teams_configured ? 'MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET & MICROSOFT_TENANT_ID not configured in .env' : ''}
                      >
                        {connectingPlatform === 'teams' ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                        {connectingPlatform === 'teams' ? 'Connecting...' : 'Connect Teams'}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 italic px-1 pt-2">
                  Connect your accounts to create real meeting links with calendar invites. Without connecting, scheduling will use local meeting IDs only.
                </p>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl overflow-hidden shadow-lg shadow-red-500/5 mt-12">
            <div className="p-6 border-b border-red-500/10 bg-red-500/5 flex items-center gap-3">
              <ShieldAlert className="text-red-500" size={20} />
              <h3 className="font-bold text-lg text-red-500 underline decoration-red-500/30 underline-offset-4">{t('settings.dangerZone')}</h3>
            </div>
            <div className="p-8">
              {!showConfirm ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-white font-bold">{t('settings.terminateAccount')}</p>
                    <p className="text-sm text-text-muted max-w-sm">
                      {t('settings.permanentRemoval')}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowConfirm(true)}
                    className="whitespace-nowrap px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/10"
                  >
                    {t('settings.deleteAccount')}
                  </button>
                </div>
              ) : (
                <div className="animate-in zoom-in-95 duration-200">
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl space-y-4">
                    <div className="flex items-center gap-3 text-red-500">
                      <AlertTriangle size={24} />
                      <p className="font-bold">{t('settings.irreversibleProcess')}</p>
                    </div>
                    <p className="text-sm text-red-100/70 leading-relaxed">
                      {t('settings.purgeConfirmation')}
                    </p>
                    <div className="flex items-center gap-4 pt-2">
                      <button 
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        {isDeleting ? t('settings.syncingDeletion') : t('settings.yesPurge')}
                      </button>
                      <button 
                        disabled={isDeleting}
                        onClick={() => setShowConfirm(false)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all"
                      >
                        {t('shortlisted.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
