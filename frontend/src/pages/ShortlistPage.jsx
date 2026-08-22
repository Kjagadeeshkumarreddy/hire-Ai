import React, { useState } from 'react';
import { useCandidateList, useCandidateMutations } from '../hooks/useCandidates';
import { Loader2, UserCheck, X, Mail, Sparkles, AlertCircle, MessageSquare } from 'lucide-react';
import EmailModal from '../components/candidates/EmailModal';

import { useTranslation } from 'react-i18next';

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

const ShortlistPage = () => {
  const { t } = useTranslation();
  const { data: candidates = [], isLoading } = useCandidateList('default-job');
  const { toggleShortlist } = useCandidateMutations();
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [viewingMarksCandidate, setViewingMarksCandidate] = useState(null);
  
  // Only display candidates waiting at this specific gate flawlessly
  const pendingShortlist = candidates.filter(c => c.pipeline_status === 'scored' && !c.is_shortlisted);
  const approvedCandidates = candidates.filter(c => c.is_shortlisted);

  return (
    <div className="max-w-4xl mx-auto py-10 animation-fade-in">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 text-[10px] font-black uppercase tracking-widest mb-4">
          <Sparkles size={12} className="animate-pulse" />
          {t('shortlist.hitlDecisionGate')}
        </div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">{t('shortlist.shortlistApproval')}</h1>
        <p className="text-text-muted font-medium">{t('shortlist.verifyAIScores')} <span className="text-primary-400">{t('shortlist.deepDiveInterviewMapping')}</span>.</p>
      </div>

      <div className="space-y-10">
        {/* Pending Approval Section flawlessly */}
        <section className="glass-panel p-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              {t('shortlist.pendingReview')} 
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-text-muted">{pendingShortlist.length}</span>
            </h2>
          </div>
          
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-primary-500" size={32} />
              <p className="text-xs text-text-muted font-black uppercase tracking-[0.2em]">{t('shortlist.syncingIntelligence')}</p>
            </div>
          ) : pendingShortlist.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
              <X size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-sm text-text-muted font-bold tracking-widest uppercase">{t('shortlist.noCandidatesInQueue')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingShortlist.map(c => (
                <div key={c.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between group/row hover:border-primary-500/30 transition-all shadow-lg">
                  <div className="flex items-center gap-5 flex-1 min-w-0 mr-4">
                    <input 
                      type="checkbox"
                      checked={c.is_shortlisted || false}
                      onChange={() => toggleShortlist.mutate(c.id)}
                      disabled={toggleShortlist.isPending}
                      className="w-5 h-5 rounded-lg border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500 focus:ring-offset-background transition-all cursor-pointer accent-primary-500 shrink-0"
                    />
                    <div 
                      onClick={() => setViewingMarksCandidate(c)}
                      className="flex items-center gap-5 cursor-pointer flex-1 min-w-0"
                      title="View Technical Evaluation Marks"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center text-primary-500 font-black border border-primary-500/30 shadow-inner shrink-0">
                        {c.full_name?.charAt(0) || "C"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-white leading-tight hover:text-primary-400 transition-colors truncate">{c.full_name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-md border border-primary-500/20">
                            {c.scores?.total_score || 0}% AI Consensus
                          </span>
                          {c.technical_marks && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              {c.technical_marks.marks_obtained}/{c.technical_marks.max_marks} Tech Evaluated
                            </span>
                          )}
                          {c.risk_flags?.length > 0 && (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-500">
                              <AlertCircle size={10} /> {t('candidateDash.riskFlagged')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 shrink-0">
                    <button 
                       onClick={() => toggleShortlist.mutate(c.id)}
                       disabled={toggleShortlist.isPending}
                       className="btn-primary flex items-center gap-2 px-6 py-2.5 bg-green-600 border-none shadow-[0_4px_15px_rgba(22,163,74,0.3)] hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase tracking-widest"
                    >
                       <UserCheck size={16} /> {t('shortlist.approve')}
                    </button>
                    <button className="px-4 py-2.5 rounded-xl border border-white/10 text-text-muted font-bold text-xs uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 transition-all">
                       {t('shortlist.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ready to Invite Section flawlessly */}
        <section className="glass-panel p-8 border-green-500/10">
          <h2 className="text-xl font-black text-white uppercase tracking-wider mb-8 flex items-center gap-3">
             {t('shortlist.readyToInvite')}
             <span className="text-xs px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-500">{approvedCandidates.length}</span>
          </h2>

          {approvedCandidates.length === 0 ? (
            <div className="py-10 text-center opacity-40 italic text-sm text-text-muted">
              {t('shortlist.approvedWillAppear')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedCandidates.map(c => (
                <div key={c.id} className="p-4 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between group transition-all hover:bg-white/10">
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                    <input 
                      type="checkbox"
                      checked={c.is_shortlisted || false}
                      onChange={() => toggleShortlist.mutate(c.id)}
                      disabled={toggleShortlist.isPending}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500 focus:ring-offset-background transition-all cursor-pointer accent-primary-500 shrink-0"
                    />
                    <div 
                      onClick={() => setViewingMarksCandidate(c)}
                      className="cursor-pointer min-w-0 flex-1"
                      title="View Technical Evaluation Marks"
                    >
                      <p className="text-white font-black text-sm uppercase tracking-tight hover:text-primary-400 transition-colors truncate">{c.full_name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest truncate">{c.email}</p>
                        {c.technical_marks && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                            {c.technical_marks.marks_obtained}/{c.technical_marks.max_marks} Tech
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCandidate(c)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-500 text-[10px] font-black uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-all shadow-lg shrink-0"
                  >
                    <Mail size={14} /> {t('shortlist.invite')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Decision Modal flawlessly */}
      {selectedCandidate && (
        <EmailModal 
          candidateId={selectedCandidate.id}
          candidateName={selectedCandidate.full_name}
          onClose={() => setSelectedCandidate(null)}
        />
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

export default ShortlistPage;
