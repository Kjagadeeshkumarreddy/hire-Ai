import React, { useState } from 'react';
import { useCandidateList, useCandidateMutations } from '../hooks/useCandidates';
import { Search, Mail, Sparkles, UserX, ExternalLink, Zap, Loader2, Star, CheckCircle2, ChevronDown, ListFilter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useJobList } from '../hooks/useJD';
import { JobSelector } from '../components/common/JobSelector';

const ShortlistedCandidatesPage = () => {
  const navigate = useNavigate();
  const { data: jobs = [] } = useJobList();
  const [selectedJobId, setSelectedJobId] = useState('default-job');
  const { data: candidates = [], isLoading } = useCandidateList(selectedJobId);
  const { toggleShortlist } = useCandidateMutations();
  const [searchTerm, setSearchTerm] = useState('');

  // Sync with first job on load flawlessy
  React.useEffect(() => {
    if (jobs.length > 0 && (selectedJobId === 'default-job' || !selectedJobId)) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs]);

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest mb-4">
            <CheckCircle2 size={12} />
            Talent Shortlist Active
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">
            {selectedJob ? `${selectedJob.title} Shortlist` : 'Strategic Shortlist'}
          </h1>
          <p className="text-text-muted font-medium italic">High-signal talent pre-approved for outreach.</p>
        </div>

        <div className="w-full md:w-80 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-2">Active Job Focus</label>
          <JobSelector activeJobId={selectedJobId} onSelect={setSelectedJobId} filterType="interview" />
        </div>

      </div>

      <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative group flex-1 w-full max-w-lg">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search vetted talent in this role..."
            className="w-full bg-surface border border-white/10 rounded-[28px] pl-16 pr-8 py-5 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-500 transition-all font-bold text-base shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          onClick={() => navigate(`/campaign/${selectedJobId}`)}
          className="btn-primary flex items-center justify-center gap-4 px-12 py-5 bg-gradient-to-r from-primary-600 to-primary-500 shadow-2xl shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all text-sm font-black uppercase tracking-widest shrink-0 rounded-[28px]"
        >
          <Zap size={22} fill="currentColor" />
          Outreach Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-primary-500" size={40} />
          <p className="text-xs text-text-muted font-black uppercase tracking-[0.2em]">Assembling Talent Pool...</p>
        </div>
      ) : shortlisted.length === 0 ? (
        <div className="py-20 text-center glass-panel border-dashed border-2 border-white/5">
          <Star size={48} className="mx-auto text-white/5 mb-4" />
          <p className="text-text-muted font-black uppercase tracking-widest">No candidates shortlisted yet</p>
          <p className="text-xs text-text-muted/60 mt-2">Go to the Candidates page or HITL Gate to approve talent.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shortlisted.map(c => (
            <div key={c.id} className="glass-panel p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary-500/30 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-xl shadow-lg border border-primary-400/20 group-hover:scale-105 transition-transform">
                  {c.full_name?.charAt(0) || "C"}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{c.full_name}</h2>
                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-text-muted font-bold uppercase tracking-widest">
                      {c.scores?.total_score || 0}% Match
                    </span>
                  </div>
                  <p className="text-text-muted text-sm font-medium">{c.email}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <Link to={`/candidates/${c.id}`} className="text-[10px] text-primary-500 font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                      View Intel <ExternalLink size={10} />
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
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Top Signal</span>
                 </div>
                 <p className="text-xs text-text-muted line-clamp-2 italic font-medium">
                   {c.enrichment_data?.project_quality_assessment || "No technical assessment available. Run AI investigation for deeper signal."}
                 </p>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="text-right">
                  <div className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Status</div>
                  <div className="text-xs text-green-500 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Vetted
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShortlistedCandidatesPage;
