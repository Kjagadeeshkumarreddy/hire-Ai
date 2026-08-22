import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useCandidateList, useCandidateMutations } from '../hooks/useCandidates';
import { Search, Mail, Sparkles, UserX, ExternalLink, Zap, Loader2, Star, CheckCircle2, ChevronDown, ListFilter, ShieldAlert, Copy, X, AlertCircle, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useJobList } from '../hooks/useJD';
import { JobSelector } from '../components/common/JobSelector';
import { techRecruiterApi } from '../api/techRecruiter';
import { candidateApi } from '../api/candidates';

const TechnicalMarksModal = ({ candidate, onClose, t }) => {
  const tm = candidate.technical_marks;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/75 font-sans animate-fade-in">
      <div className="bg-gradient-to-b from-[#111115] to-[#08080a] border border-white/10 rounded-[32px] p-8 w-full max-w-4xl shadow-[0_0_80px_rgba(245,158,11,0.15)] hover:shadow-[0_0_100px_rgba(245,158,11,0.25)] transition-all duration-500 animate-scale-in relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-xl font-black border border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0 transform hover:scale-105 transition-transform duration-300">
              {candidate.full_name?.charAt(0) || "C"}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-1.5">{candidate.full_name}</h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={10} className="animate-pulse" />
                {t('shortlist.deepDiveInterviewMapping')}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all text-text-muted hover:text-white hover:rotate-90 duration-300"
          >
            <X size={20} />
          </button>
        </div>

        {tm ? (
          <div className="flex flex-col md:flex-row gap-8 relative z-10">
            {/* Left Column: Total Score Widget & Remarks */}
            <div className="flex-1 flex flex-col gap-6">
              {/* Total Marks Widget */}
              <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/20 rounded-[24px] p-6 text-center relative overflow-hidden shadow-inner group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500" />
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/80 mb-2">{t('shortlist.totalScoreObtained')}</div>
                <div className="text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  {tm.marks_obtained} <span className="text-xl text-text-muted font-normal">/ {tm.max_marks}</span>
                </div>
                <div className="mt-3 text-[10px] text-text-muted/80 font-bold uppercase tracking-widest bg-black/35 py-1 px-3 rounded-full inline-block border border-white/5">
                  {t('shortlist.submittedOn', { date: new Date(tm.submitted_at).toLocaleDateString() })}
                </div>
              </div>

              {/* Remarks / Evaluator Notes */}
              {tm.remarks && (
                <div className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 rounded-2xl p-5 relative overflow-hidden flex-1 flex flex-col justify-center min-h-[140px]">
                  <div className="absolute top-2 right-4 text-white/5 font-serif text-6xl pointer-events-none select-none">”</div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3 flex items-center gap-1.5">
                    <MessageSquare size={10} className="text-amber-500/60" />
                    {t('shortlist.evaluatorNotes')}
                  </h4>
                  <p className="text-xs text-white/80 italic leading-relaxed relative z-10 pl-3 border-l-2 border-amber-500/30">
                    {tm.remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Category Breakdown list */}
            <div className="flex-[1.2] flex flex-col">
              {tm.category_breakdown && tm.category_breakdown.length > 0 && (
                <div className="flex-1 flex flex-col">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted mb-3 ml-1">{t('shortlist.assessmentCategories')}</h3>
                  <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-1 flex-1">
                    {tm.category_breakdown.map((cat, idx) => {
                      const percent = cat.max_marks > 0 ? (cat.marks_obtained / cat.max_marks) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all duration-300 shadow-md group"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-white/95 group-hover:text-white transition-colors">{cat.category_name}</span>
                            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {cat.marks_obtained} <span className="text-[10px] text-text-muted font-normal">/ {cat.max_marks}</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                            <div
                              className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center bg-white/[0.02] border border-white/5 rounded-3xl relative z-10">
            <AlertCircle size={40} className="mx-auto text-amber-500/30 mb-3 animate-pulse" />
            <p className="text-sm text-white font-bold uppercase tracking-widest">{t('shortlist.noTechnicalEvaluation')}</p>
            <p className="text-xs text-text-muted mt-2 max-w-xs mx-auto leading-relaxed">{t('shortlist.noTechnicalEvaluationDesc')}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_4px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.35)] hover:scale-[1.01] active:scale-95 duration-200 relative z-10"
        >
          {t('shortlisted.done')}
        </button>
      </div>
    </div>
  );
};

const ShortlistedCandidatesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewingMarksCandidate, setViewingMarksCandidate] = useState(null);
  const { data: jobs = [] } = useJobList();
  const [selectedJobId, setSelectedJobId] = useState(() => {
    const saved = localStorage.getItem('activeJobId');
    return (saved && saved !== 'null') ? saved : 'default-job';
  });
  const { data: candidates = [], isLoading, refetch } = useCandidateList(selectedJobId);
  const { toggleShortlist } = useCandidateMutations();
  const [searchTerm, setSearchTerm] = useState('');

  // Selection and Promotion states
  const [selectedIds, setSelectedIds] = useState([]);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [targetRound, setTargetRound] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  React.useEffect(() => {
    setTargetRound(t('shortlisted.technicalRound'));
  }, [t]);

  const handleJobSelect = (id) => {
    setSelectedJobId(id || 'default-job');
    if (id && id !== 'default-job') {
      localStorage.setItem('activeJobId', id);
    } else {
      localStorage.removeItem('activeJobId');
    }
  };

  const toggleSelection = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePromote = async () => {
    if (selectedIds.length === 0) return;

    if (targetRound === t('shortlisted.generateOfferLetter')) {
      localStorage.setItem('offer_letter_engine_active', 'true');
    }

    setIsPromoting(true);
    try {
      const res = await candidateApi.promote(selectedJobId, {
        candidateIds: selectedIds,
        roundName: targetRound
      });
      alert(`Successfully promoted to ${res.new_job_title}!`);
      setSelectedIds([]);
      setIsPromoteModalOpen(false);

      if (targetRound === t('shortlisted.generateOfferLetter')) {
        navigate('/offer-letter');
      } else {
        refetch();
      }
    } catch (_err) {
      alert("Synthesis Error: Could not promote candidates to next lab.");
    } finally {
      setIsPromoting(false);
    }
  };

  // States for new recruiter generation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState([
    { name: 'Coding Skills', max_marks: 50 },
    { name: 'System Design', max_marks: 30 },
    { name: 'Communication', max_marks: 20 }
  ]);
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const handleCopyLogin = () => {
    if (generatedCredentials?.login_id) {
      navigator.clipboard.writeText(generatedCredentials.login_id);
      setCopiedLogin(true);
      setTimeout(() => setCopiedLogin(false), 2000);
    }
  };

  const handleCopyPass = () => {
    if (generatedCredentials?.password) {
      navigator.clipboard.writeText(generatedCredentials.password);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };


  // Sync with first job on load flawlessy
  React.useEffect(() => {
    if (jobs.length > 0 && (selectedJobId === 'default-job' || !selectedJobId)) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  const handleCategoryChange = (index, field, value) => {
    setCategories(prev => prev.map((cat, idx) => {
      if (idx === index) {
        return { ...cat, [field]: value };
      }
      return cat;
    }));
  };

  const handleAddCategory = () => {
    setCategories(prev => [...prev, { name: '', max_marks: 10 }]);
  };

  const handleRemoveCategory = (index) => {
    setCategories(prev => prev.filter((_, idx) => idx !== index));
  };

  const totalMaxMarks = categories.reduce((sum, c) => sum + (Number(c.max_marks) || 0), 0);

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      alert("No active job selected.");
      return;
    }
    if (categories.length === 0) {
      alert("Please add at least one category.");
      return;
    }
    const invalidCategory = categories.find(c => !c.name.trim() || Number(c.max_marks) <= 0);
    if (invalidCategory) {
      alert("All categories must have a name and max marks greater than 0.");
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Save categories to job first
      await techRecruiterApi.saveCategories(selectedJobId, categories.map(c => ({
        name: c.name.trim(),
        max_marks: Number(c.max_marks)
      })));

      // 2. Generate evaluator credentials
      const res = await techRecruiterApi.generate(selectedJobId, totalMaxMarks, recruiterEmail || undefined);
      setGeneratedCredentials(res.credentials);

      // Clean up fields
      setCategories([
        { name: 'Coding Skills', max_marks: 50 },
        { name: 'System Design', max_marks: 30 },
        { name: 'Communication', max_marks: 20 }
      ]);
      setRecruiterEmail('');
    } catch (err) {
      alert("Failed to generate recruiter credentials. " + (err.response?.data?.detail || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const shortlisted = candidates.filter(c =>
    c.is_shortlisted &&
    (c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="max-w-6xl mx-auto py-8 animation-fade-in relative">
      {/* Job Context Selector flawlessly */}
      <div className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">
            {selectedJob ? `${selectedJob.title} Shortlist` : t('shortlisted.strategicShortlist')}
          </h1>
        </div>

        <div className="w-full md:w-80 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-2">{t('campaign.activeJobFocus')}</label>
          <JobSelector activeJobId={selectedJobId} onSelect={handleJobSelect} filterType="interview" />
        </div>

      </div>

      <div className="mb-10 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="relative group flex-1 w-full max-w-lg">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder={t('shortlisted.searchPlaceholder')}
            className="w-full bg-surface border border-white/10 rounded-[28px] pl-16 pr-8 py-5 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-500 transition-all font-bold text-base shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-xl shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all text-sm font-black uppercase tracking-widest rounded-[28px] py-5 px-8"
          >
            {t('shortlisted.generateEvaluator')}
          </button>

          <button
            onClick={() => navigate(`/schedule/${selectedJobId}`)}
            className="w-full sm:w-auto btn-primary flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-violet-600 to-violet-500 shadow-2xl shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all text-sm font-black uppercase tracking-widest shrink-0 rounded-[28px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
            Schedule Interviews
          </button>

          <button
            onClick={() => navigate(`/campaign/${selectedJobId}`)}
            className="w-full sm:w-auto btn-primary flex items-center justify-center gap-4 px-8 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-2xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-sm font-black uppercase tracking-widest shrink-0 rounded-[28px]"
          >
            <Zap size={22} fill="currentColor" />
            {t('shortlisted.outreachCampaign')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-primary-500" size={40} />
          <p className="text-xs text-text-muted font-black uppercase tracking-[0.2em]">{t('shortlisted.assemblingTalentPool')}</p>
        </div>
      ) : shortlisted.length === 0 ? (
        <div className="py-20 text-center glass-panel border-dashed border-2 border-white/5">
          <Star size={48} className="mx-auto text-white/5 mb-4" />
          <p className="text-text-muted font-black uppercase tracking-widest">{t('shortlisted.noCandidatesShortlisted')}</p>
          <p className="text-xs text-text-muted/60 mt-2">{t('shortlisted.goToCandidatesPage')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shortlisted.map(c => (
            <div key={c.id} className="glass-panel p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary-500/30 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="flex items-center gap-6 w-full md:w-auto">
                {/* Custom Checkbox */}
                <div
                  onClick={(e) => toggleSelection(e, c.id)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${selectedIds.includes(c.id)
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-slate-700 bg-white/5 group-hover:border-primary-500/50'
                    }`}
                >
                  {selectedIds.includes(c.id) && <CheckCircle2 size={14} className="text-white" />}
                </div>

                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div
                    onClick={() => setViewingMarksCandidate(c)}
                    className="flex items-center gap-6 cursor-pointer flex-1 min-w-0"
                    title="View Technical Evaluation Marks"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-xl shadow-lg border border-primary-400/20 group-hover:scale-105 transition-transform shrink-0">
                      {c.full_name?.charAt(0) || "C"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight hover:text-primary-400 transition-colors truncate">{c.full_name}</h2>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-text-muted font-bold uppercase tracking-widest shrink-0">
                          {c.scores?.total_score || 0}% Match
                        </span>
                        {c.technical_marks && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                            {c.technical_marks.marks_obtained}/{c.technical_marks.max_marks} Tech Evaluated
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-sm font-medium truncate">{c.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pl-[88px]">
                    <Link to={`/candidates/${c.id}`} state={{ from: '/shortlisted' }} className="text-[10px] text-primary-500 font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                      {t('shortlisted.viewIntel')} <ExternalLink size={10} />
                    </Link>
                    <button
                      onClick={() => toggleShortlist.mutate(c.id)}
                      className="text-[10px] text-rose-500/60 font-black uppercase tracking-widest hover:text-rose-500 transition-colors flex items-center gap-1"
                    >
                      <UserX size={10} /> Remove
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 md:px-10 hidden lg:block">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-primary-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('shortlisted.topSignal')}</span>
                </div>
                <p className="text-xs text-text-muted line-clamp-2 italic font-medium">
                  {c.enrichment_data?.project_quality_assessment || t('shortlisted.noTechnicalAssessment')}
                </p>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="text-right">
                  <div className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">{t('shortlisted.status')}</div>
                  <div className="text-xs text-green-500 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> {t('shortlisted.vetted')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 font-sans">
          <div className="bg-[#0A0A0B] border-2 border-slate-800 rounded-[48px] p-10 w-full max-w-lg shadow-[0_0_100px_rgba(20,184,166,0.15)] animate-scale-in">
            {generatedCredentials ? (
              <div>
                <div className="flex items-center gap-6 mb-8">
                  <div className="p-4 bg-green-500/10 rounded-2xl">
                    <CheckCircle2 size={28} className="text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('shortlisted.credentialsGenerated')}</h2>
                    <p className="text-text-muted text-sm font-medium">{t('shortlisted.copyCredentialsDesc')}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">{t('shortlisted.loginId')}</div>
                      <div className="text-lg font-mono text-primary-400 font-bold select-all truncate">{generatedCredentials.login_id}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLogin}
                      className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-text-muted hover:text-white shrink-0"
                      title={t('shortlisted.copyLoginId')}
                    >
                      {copiedLogin ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">{t('shortlisted.oneTimePassword')}</div>
                      <div className="text-lg font-mono text-amber-400 font-bold select-all truncate">{generatedCredentials.password}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPass}
                      className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-text-muted hover:text-white shrink-0"
                      title={t('shortlisted.copyPassword')}
                    >
                      {copiedPass ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                  {generatedCredentials.email_sent && (
                    <div className="text-xs text-green-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Credentials also sent to recruiter's email.
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setGeneratedCredentials(null);
                    setIsModalOpen(false);
                  }}
                  className="w-full py-4 bg-primary-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-500/30 hover:scale-[1.02] transition-all"
                >
                  {t('shortlisted.done')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateSubmit}>
                <div className="flex items-center gap-6 mb-8">
                  <div className="p-4 bg-primary-500/10 rounded-2xl">
                    <ShieldAlert size={28} className="text-primary-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('shortlisted.generateRecruiter')}</h2>
                    <p className="text-text-muted text-sm font-medium">{t('shortlisted.createCredentialsDesc')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/60 ml-1">{t('shortlisted.assignedJob')}</label>
                    <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-muted select-none">
                      {selectedJob ? selectedJob.title : 'No active job'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/60">{t('shortlisted.assessmentCategories')}</label>
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="text-[10px] font-black uppercase text-primary-500 hover:text-white transition-colors"
                      >
                        + Add Category
                      </button>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {categories.map((cat, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            type="text"
                            required
                            placeholder="e.g. Coding Skills"
                            value={cat.name}
                            onChange={(e) => handleCategoryChange(idx, 'name', e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500 transition-colors"
                          />
                          <input
                            type="number"
                            required
                            min="1"
                            max="1000"
                            placeholder="Marks"
                            value={cat.max_marks}
                            onChange={(e) => handleCategoryChange(idx, 'max_marks', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-24 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500 transition-colors"
                          />
                          {categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCategory(idx)}
                              className="p-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center"
                            >
                              <UserX size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/60 ml-1">{t('shortlisted.totalMaxMarks')}</label>
                    <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-primary-400 font-bold select-none">
                      {totalMaxMarks}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/60 ml-1">{t('shortlisted.recruiterEmailOptional')}</label>
                    <input
                      type="email"
                      placeholder="evaluator@company.com"
                      value={recruiterEmail}
                      onChange={(e) => setRecruiterEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors placeholder:text-text-muted/40"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                    >
                      {t('shortlisted.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="flex-1 py-4 bg-primary-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Bar for promotion */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0B]/90 border border-white/10 rounded-2xl px-6 py-4 shadow-[0_10px_50px_rgba(20,184,166,0.15)] backdrop-blur-md flex items-center gap-6 animate-slide-up">
          <span className="text-xs font-black uppercase tracking-widest text-primary-500">{t('shortlisted.selectedCount', { count: selectedIds.length })}</span>
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={() => setSelectedIds([])}
            className="text-xs font-black uppercase text-text-muted hover:text-white transition-colors"
          >
            {t('shortlisted.clear')}
          </button>
          <button
            onClick={() => setIsPromoteModalOpen(true)}
            className="px-6 py-3 bg-primary-500 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-500/20 hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-2"
          >
            <Zap size={14} />
            {t('shortlisted.moveToNext')}
          </button>
        </div>
      )}

      {/* Promotion Modal Studio flawlessly */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 font-sans">
          <div className="bg-[#0A0A0B] border-2 border-slate-800 rounded-[48px] p-10 w-full max-w-lg shadow-[0_0_100px_rgba(20,184,166,0.15)] animate-scale-in">
            <div className="flex items-center gap-6 mb-8">
              <div className="p-4 bg-primary-500/10 rounded-2xl">
                <Zap size={28} className="text-primary-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('shortlisted.promoteTalent')}</h2>
                <p className="text-text-muted text-sm font-medium">{t('shortlisted.selectDestinationLab', { count: selectedIds.length })}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/60 ml-1">{t('shortlisted.engagementLab')}</label>
                <div className="grid grid-cols-1 gap-3">
                  {[t('shortlisted.technicalRound'), t('shortlisted.hrRound'), t('shortlisted.generateOfferLetter')].map((round) => (
                    <div
                      key={round}
                      onClick={() => setTargetRound(round)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${targetRound === round
                        ? 'bg-primary-500/10 border-primary-500 text-white'
                        : 'bg-white/5 border-transparent text-text-muted hover:bg-white/10'
                        }`}
                    >
                      <span className="font-bold">{round}</span>
                      {targetRound === round && <CheckCircle2 size={18} className="text-primary-500" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                >
                  {t('shortlisted.abort')}
                </button>
                <button
                  onClick={handlePromote}
                  disabled={isPromoting}
                  className="flex-1 py-4 bg-primary-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPromoting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('interview.synthesizing')}
                    </>
                  ) : (
                    t('shortlisted.executePromotion')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Marks View Modal flawlessly */}
      {viewingMarksCandidate && (
        <TechnicalMarksModal
          candidate={viewingMarksCandidate}
          onClose={() => setViewingMarksCandidate(null)}
          t={t}
        />
      )}
    </div>
  );
};

export default ShortlistedCandidatesPage;
