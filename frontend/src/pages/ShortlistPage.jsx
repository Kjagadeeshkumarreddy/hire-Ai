import React, { useState } from 'react';
import { useCandidateList, useCandidateMutations } from '../hooks/useCandidates';
import { Loader2, UserCheck, X, Mail, Sparkles, AlertCircle } from 'lucide-react';
import EmailModal from '../components/candidates/EmailModal';

const ShortlistPage = () => {
  const { data: candidates = [], isLoading } = useCandidateList('default-job');
  const { toggleShortlist } = useCandidateMutations();
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // Only display candidates waiting at this specific gate flawlessly
  const pendingShortlist = candidates.filter(c => c.pipeline_status === 'scored');
  const approvedCandidates = candidates.filter(c => c.is_shortlisted);

  return (
    <div className="max-w-4xl mx-auto py-10 animation-fade-in">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 text-[10px] font-black uppercase tracking-widest mb-4">
          <Sparkles size={12} className="animate-pulse" />
          HITL Decision Gate
        </div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Shortlist Approval</h1>
        <p className="text-text-muted font-medium">Verify AI scores and greenlight candidates for phase two: <span className="text-primary-400">Deep-Dive Interview Mapping</span>.</p>
      </div>

      <div className="space-y-10">
        {/* Pending Approval Section flawlessly */}
        <section className="glass-panel p-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              Pending Review 
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-text-muted">{pendingShortlist.length}</span>
            </h2>
          </div>
          
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-primary-500" size={32} />
              <p className="text-xs text-text-muted font-black uppercase tracking-[0.2em]">Syncing Intelligence...</p>
            </div>
          ) : pendingShortlist.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
              <X size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-sm text-text-muted font-bold tracking-widest uppercase">No candidates currently in queue</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingShortlist.map(c => (
                <div key={c.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between group/row hover:border-primary-500/30 transition-all shadow-lg">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center text-primary-500 font-black border border-primary-500/30 shadow-inner">
                      {c.full_name?.charAt(0) || "C"}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white leading-tight">{c.full_name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-md border border-primary-500/20">
                          {c.scores?.total_score || 0}% AI Consensus
                        </span>
                        {c.risk_flags?.length > 0 && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-500">
                            <AlertCircle size={10} /> Risk Flagged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                       onClick={() => toggleShortlist.mutate(c.id)}
                       disabled={toggleShortlist.isPending}
                       className="btn-primary flex items-center gap-2 px-6 py-2.5 bg-green-600 border-none shadow-[0_4px_15px_rgba(22,163,74,0.3)] hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase tracking-widest"
                    >
                       <UserCheck size={16} /> Approve
                    </button>
                    <button className="px-4 py-2.5 rounded-xl border border-white/10 text-text-muted font-bold text-xs uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 transition-all">
                       Reject
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
             Ready to Invite
             <span className="text-xs px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-500">{approvedCandidates.length}</span>
          </h2>

          {approvedCandidates.length === 0 ? (
            <div className="py-10 text-center opacity-40 italic text-sm text-text-muted">
              Approved candidates will appear here for interview scheduling.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedCandidates.map(c => (
                <div key={c.id} className="p-4 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between group transition-all hover:bg-white/10">
                  <div>
                    <p className="text-white font-black text-sm uppercase tracking-tight">{c.full_name}</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{c.email}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedCandidate(c)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-500 text-[10px] font-black uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-all shadow-lg"
                  >
                    <Mail size={14} /> Invite
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
    </div>
  );
};

export default ShortlistPage;
