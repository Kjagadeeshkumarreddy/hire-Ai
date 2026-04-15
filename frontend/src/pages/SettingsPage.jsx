import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Settings, ShieldAlert, ArrowRight, Trash2, Mail, Lock, User, AlertTriangle } from 'lucide-react';

const SettingsPage = () => {
  const { user, deleteAccount, updateEmail } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Email Update State flawlessy
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
        <h1 className="text-3xl font-black text-white tracking-tight">System Settings</h1>
        <p className="text-text-muted">Manage your administrative profile and security parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: General Settings Sidebar Navigation Linkings */}
        <div className="lg:col-span-1 space-y-2">
           <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary-500/10 text-primary-500 border border-primary-500/20 rounded-xl font-bold transition-all shadow-sm shadow-primary-500/5">
             <User size={18} /> Account Profile
           </button>
        </div>

        {/* Right: Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/20">
            <div className="p-6 border-b border-border bg-gradient-to-r from-surface to-white/5">
              <h3 className="font-bold text-lg text-white">Administrative Details</h3>
            </div>
            <div className="p-8 space-y-6">
               <div className="flex flex-col gap-2">
                 <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Full Name</label>
                 <div className="px-4 py-3 bg-background/50 border border-border rounded-xl text-white font-medium">
                   {user?.full_name || 'System Operator'}
                 </div>
               </div>
               
               <div className="flex flex-col gap-2 relative">
                 <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Email Address</label>
                    <button 
                      onClick={() => {
                        setIsEditingEmail(!isEditingEmail);
                        setNewEmail(user?.email || '');
                        setError(null);
                      }}
                      className="text-[10px] font-black uppercase text-primary-500 hover:text-primary-400 transition-colors"
                    >
                      {isEditingEmail ? "Cancel Edit" : "Change Email"}
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
                          placeholder="New Administrative Email"
                          className="w-full px-4 py-3 bg-background border border-primary-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-primary-500 shadow-lg shadow-primary-500/5"
                        />
                        <input 
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Verify Current Password"
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
                        {isUpdating ? "Verifying Credentials..." : "Commit Administrative Change"}
                      </button>
                   </form>
                 )}
               </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl overflow-hidden shadow-lg shadow-red-500/5 mt-12">
            <div className="p-6 border-b border-red-500/10 bg-red-500/5 flex items-center gap-3">
              <ShieldAlert className="text-red-500" size={20} />
              <h3 className="font-bold text-lg text-red-500 underline decoration-red-500/30 underline-offset-4">Danger Zone</h3>
            </div>
            <div className="p-8">
              {!showConfirm ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-white font-bold">Terminate Account Architecture</p>
                    <p className="text-sm text-text-muted max-w-sm">
                      Permanently removal of all administrative credentials from the PostgreSQL persistence layer. This action cannot be undone.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowConfirm(true)}
                    className="whitespace-nowrap px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/10"
                  >
                    Delete Account
                  </button>
                </div>
              ) : (
                <div className="animate-in zoom-in-95 duration-200">
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl space-y-4">
                    <div className="flex items-center gap-3 text-red-500">
                      <AlertTriangle size={24} />
                      <p className="font-bold">Irreversible Process Initiated</p>
                    </div>
                    <p className="text-sm text-red-100/70 leading-relaxed">
                      Are you absolutely certain you want to purge your administrative context? All access to the LangGraph hiring pipelines will be instantly revoked.
                    </p>
                    <div className="flex items-center gap-4 pt-2">
                      <button 
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        {isDeleting ? "Syncing Deletion..." : "Yes, Purge My Identity"}
                      </button>
                      <button 
                        disabled={isDeleting}
                        onClick={() => setShowConfirm(false)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all"
                      >
                        Cancel
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
