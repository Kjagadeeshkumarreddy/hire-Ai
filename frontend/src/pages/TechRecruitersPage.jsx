import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Loader2, Users, CheckCircle2, XCircle, Trash } from 'lucide-react';
import { techRecruiterApi } from '../api/techRecruiter';
import { useJobList } from '../hooks/useJD';

const TechRecruitersPage = () => {
  const { t } = useTranslation();
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);


  const { data: jobsData } = useJobList();
  const jobs = Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || []);

  const getJobTitle = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    return job ? job.title : 'Unknown Job';
  };

  const fetchRecruiters = async () => {
    try {
      const data = await techRecruiterApi.list();
      setRecruiters(data);
    } catch (err) {
      console.error("Failed to fetch tech recruiters", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiters();
  }, []);


  const handleRevoke = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this Technical Recruiter account? They will lose access immediately.")) return;

    setRevokingId(id);
    try {
      await techRecruiterApi.revoke(id);
      fetchRecruiters(); // Refresh the list
    } catch (err) {
      alert("Failed to revoke account. " + (err.response?.data?.detail || err.message));
    } finally {
      setRevokingId(null);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL revoked Technical Recruiter accounts from the database? This action cannot be undone.")) return;

    setIsCleaningUp(true);
    try {
      const res = await techRecruiterApi.cleanup();
      alert(res.message);
      fetchRecruiters(); // Refresh the list
    } catch (err) {
      alert("Failed to clean up accounts. " + (err.response?.data?.detail || err.message));
    } finally {
      setIsCleaningUp(false);
    }
  };

  const hasRevokedAccounts = recruiters.some(r => !r.is_active);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-0 animation-fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldAlert size={28} className="text-primary-500" />
            Technical Recruiters
          </h1>
          <p className="text-text-muted mt-2 text-sm sm:text-base">Manage temporary accounts created for technical evaluation.</p>
        </div>

        {hasRevokedAccounts && (
          <button
            onClick={handleCleanup}
            disabled={isCleaningUp}
            className="w-full sm:w-auto justify-center btn-primary flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 shadow-none disabled:opacity-50"
            title="Permanently delete all revoked accounts from database"
          >
            {isCleaningUp ? <Loader2 size={18} className="animate-spin" /> : <Trash size={18} />}
            Cleanup Revoked
          </button>
        )}
      </div>

      <div className="glass-panel p-4 sm:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted gap-3">
            <Loader2 className="animate-spin" size={24} />
            <span className="font-medium">Loading accounts...</span>
          </div>
        ) : recruiters.length === 0 ? (
          <div className="text-center py-20 bg-surface/30 rounded-2xl border border-white/5">
            <Users size={48} className="mx-auto text-primary-500/20 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Tech Recruiters found</h3>
            <p className="text-text-muted">You haven't generated any technical recruiter credentials yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recruiters.map(recruiter => (
              <div
                key={recruiter.id}
                className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all ${recruiter.is_active
                  ? 'bg-surface/80 border-white/10 hover:border-primary-500/30'
                  : 'bg-surface/30 border-white/5 opacity-70'
                  }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">{t('login.loginId')}</div>
                    <div className="text-xl font-mono text-primary-400 font-bold">{recruiter.login_id}</div>
                  </div>
                  <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border flex items-center gap-1 ${recruiter.is_active
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                    {recruiter.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {recruiter.is_active ? 'Active' : 'Revoked'}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Assigned Job</div>
                    <div className="text-sm font-bold text-white bg-white/5 px-3 py-2 rounded-lg truncate">
                      {getJobTitle(recruiter.job_id)}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Max Marks</div>
                      <div className="text-sm font-bold text-white">{recruiter.max_marks}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Created On</div>
                      <div className="text-sm font-bold text-white">
                        {new Date(recruiter.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {recruiter.is_active && (
                  <div className="pt-4 border-t border-white/5">
                    <button
                      onClick={() => handleRevoke(recruiter.id)}
                      disabled={revokingId === recruiter.id}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
                    >
                      {revokingId === recruiter.id ? (
                        <><Loader2 size={14} className="animate-spin" /> Revoking...</>
                      ) : (
                        <><Trash size={14} /> Revoke Account</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default TechRecruitersPage;
