import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, CheckCircle2, AlertCircle, Loader2, 
  ChevronRight, Award, ClipboardCheck, Hash 
} from 'lucide-react';
import { techRecruiterApi } from '../api/techRecruiter';

const TechRecruiterDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [credential, setCredential] = useState(null);
  const [candidatesData, setCandidatesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [credData, candData] = await Promise.all([
        techRecruiterApi.getMyCredential(),
        techRecruiterApi.getCandidates()
      ]);
      setCredential(credData);
      setCandidatesData(candData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 size={48} className="animate-spin text-primary-500" />
        <p className="text-text-muted text-xs font-black uppercase tracking-widest">
          {t('techRecruiterDash.initializingForge')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6">
        <AlertCircle size={48} className="text-red-500" />
        <p className="text-white text-lg font-bold">{error}</p>
        <button onClick={loadData} className="px-6 py-3 bg-primary-500/10 text-primary-500 rounded-xl font-bold border border-primary-500/20 hover:bg-primary-500/20 transition-all">
          {t('techRecruiterDash.retry')}
        </button>
      </div>
    );
  }

  const candidates = candidatesData?.candidates || [];
  const maxMarks = candidatesData?.max_marks || 100;
  const scoredCount = candidates.filter(c => c.marks).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-0 flex flex-col gap-6 sm:gap-8 pb-12">
      {/* Header */}
      <header className="p-5 sm:p-8 rounded-3xl sm:rounded-[48px] bg-surface border border-border/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full -mr-48 -mt-48 transition-all group-hover:bg-amber-500/10" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center text-center sm:text-left gap-4 sm:gap-6">
            <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl sm:rounded-3xl shadow-xl shadow-amber-500/20">
              <Shield className="text-white w-7 h-7 sm:w-9 sm:h-9" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1 sm:mb-2">
                {t('interview.technical')} <span className="text-amber-500 italic">{t('interview.forge')}</span>
              </h1>
              <p className="text-text-muted text-sm sm:text-base font-medium flex items-center justify-center sm:justify-start gap-2">
                <Hash size={14} className="text-amber-400" />
                <span className="truncate max-w-[180px] sm:max-w-none">{credential?.login_id}</span> — Evaluation Console
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 lg:flex gap-2 sm:gap-4 w-full lg:w-auto">
            <div className="px-2.5 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-center lg:text-left">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-text-muted mb-0.5 sm:mb-1">{t('candidateDash.candidates')}</p>
              <p className="text-lg sm:text-2xl font-black text-white">{candidates.length}</p>
            </div>
            <div className="px-2.5 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-center lg:text-left">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-text-muted mb-0.5 sm:mb-1">{t('techRecruiterDash.scored')}</p>
              <p className="text-lg sm:text-2xl font-black text-amber-500">{scoredCount}/{candidates.length}</p>
            </div>
            <div className="px-2.5 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-center lg:text-left">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-text-muted mb-0.5 sm:mb-1">{t('shortlisted.maxMarks')}</p>
              <p className="text-lg sm:text-2xl font-black text-primary-500">{maxMarks}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Candidates Grid */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-amber-500/60 ml-1 sm:ml-4 mb-4">
          {t('techRecruiterDash.shortlistedCandidates')}
        </h2>

        {candidates.length === 0 ? (
          <div className="p-12 text-center glass-panel border-dashed border-2 rounded-[32px]">
            <Users size={48} className="mx-auto text-text-muted opacity-20 mb-4" />
            <p className="text-text-muted font-bold">{t('techRecruiterDash.noAssigned')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {candidates.map((cand) => (
              <div
                key={cand.id}
                onClick={() => navigate(`/tech-recruiter/${cand.id}`)}
                className="p-4 sm:p-6 rounded-2xl sm:rounded-[32px] bg-surface border-2 border-border hover:border-amber-500/30 hover:bg-[#121214] transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#1A1A1E] flex items-center justify-center text-base sm:text-lg font-black text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-500/10 transition-all">
                    {cand.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-amber-400 transition-colors">
                      {cand.full_name}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-text-muted mt-1">
                      {cand.anonymized_id || 'ID-SECURE'}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-text-muted opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:translate-x-1 transition-all shrink-0" />
                </div>

                {/* Marks Status */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  {cand.marks ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-emerald-500 text-sm font-bold">{t('techRecruiterDash.scored')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award size={14} className="text-amber-400" />
                        <span className="text-white font-black text-lg">
                          {cand.marks.marks_obtained}
                        </span>
                        <span className="text-text-muted text-sm">/ {cand.marks.max_marks}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ClipboardCheck size={16} className="text-text-muted" />
                      <span className="text-text-muted text-sm font-medium">{t('techRecruiterDash.pendingEvaluation')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechRecruiterDashboard;
