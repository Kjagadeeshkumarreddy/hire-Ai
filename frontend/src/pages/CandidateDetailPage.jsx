import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCandidateMutations } from '../hooks/useCandidates';
import { ArrowLeft, ExternalLink, ShieldAlert, Zap, Loader2, Star, GitBranch, Globe, UserCheck, UserX, Terminal, X, ChevronUp, ChevronDown } from 'lucide-react';
import { candidateApi } from '../api/candidates';
import { useAuthStore } from '../stores/authStore';

const CandidateDetailPage = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [thoughts, setThoughts] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const { toggleShortlist } = useCandidateMutations();

  const fetchCandidate = async () => {
    try {
      const data = await candidateApi.getDetail(id);
      setCandidate(data);
    } catch (err) {
      console.error("Failed to fetch candidate", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const handleInvestigate = async () => {
    console.log("⚡ [DEBUG] AI Investigation initiated (Buffered Reader Mode) for ID:", id);
    setInvestigating(true);
    setThoughts([]);
    setShowConsole(true);
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = useAuthStore.getState().token;

      const response = await fetch(`${baseUrl}/candidates/${id}/investigate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer flawlessy
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(trimmed.slice(6));
            console.log("🕵️‍♂️ [STREAM EVENT]", data);
            
            if (data.message) {
              setThoughts(prev => [...prev, {
                id: Date.now() + Math.random(),
                message: data.message,
                timestamp: new Date().toLocaleTimeString(),
                node: data.node
              }]);
            }
            
            if (data.status === 'completed') {
              console.log("✅ [STREAM] Finalizing investigation...");
              setTimeout(() => {
                 fetchCandidate();
                 setInvestigating(false);
              }, 2000);
            }
          } catch (e) {
            console.warn("⚠️ [STREAM] Fragmented or invalid JSON caught:", trimmed);
          }
        }
      }
    } catch (err) {
      console.error("❌ [STREAM ERROR]", err);
      setThoughts(prev => [...prev, {
        id: 'err-' + Date.now(),
        message: `Connection Error: ${err.message}. Retrying may fix transient issues.`,
        timestamp: new Date().toLocaleTimeString(),
        node: 'system'
      }]);
      setInvestigating(false);
    }
  };

  const onToggleShortlist = async () => {
    try {
      await toggleShortlist.mutateAsync(id);
      setCandidate(prev => ({ ...prev, is_shortlisted: !prev.is_shortlisted }));
    } catch (err) {
      console.error("Toggle shortlist failed", err);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-text-muted">
      <Loader2 className="animate-spin text-primary-500" size={40} />
      <span>Assembling profile data...</span>
    </div>
  );
  
  if (!candidate) return <div className="p-8 text-white">Candidate not found.</div>;

  return (
    <div className="max-w-6xl mx-auto animation-fade-in pb-20 relative">
      <div className="flex items-center justify-between mb-8">
        <Link to="/candidates" className="flex items-center gap-2 text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleShortlist}
            disabled={toggleShortlist.isPending}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 border ${
              candidate.is_shortlisted 
              ? 'bg-green-500/10 border-green-500/30 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            {toggleShortlist.isPending ? <Loader2 size={14} className="animate-spin" /> : candidate.is_shortlisted ? <UserCheck size={14} /> : <UserX size={14} />}
            {candidate.is_shortlisted ? 'Approved for Outreach' : 'Shortlist Candidate'}
          </button>
          <button 
            onClick={handleInvestigate}
            disabled={investigating}
            className="btn-primary flex items-center gap-2"
          >
            {investigating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
            {investigating ? 'Running Investigative Agents...' : 'Execute AI Investigation'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Header & Summary */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-10 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
               <Globe size={120} />
             </div>
             
             <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-primary-500/20 shrink-0">
               {candidate.full_name.charAt(0)}
             </div>
             
             <div className="flex-1">
               <div className="flex items-center gap-3 mb-2">
                 <h1 className="text-4xl font-bold text-white tracking-tight">{candidate.full_name}</h1>
                 <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-widest ${candidate.pipeline_status === 'investigated' ? 'bg-green-500/20 text-green-400' : 'bg-surface text-text-muted'}`}>
                   {candidate.pipeline_status}
                 </span>
               </div>
               <p className="text-text-muted text-lg mb-6">{candidate.email}</p>
               
               <div className="flex flex-wrap gap-4">
                  {candidate.github_data?.url && (
                    <a href={candidate.github_data.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-surface hover:bg-surface/80 border border-border px-4 py-2 rounded-xl text-primary-500 transition-all font-medium text-sm">
                      <Globe size={16} /> Repositories ({candidate.github_data.repos})
                    </a>
                  )}
                  {candidate.linkedin_url && (
                    <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-surface hover:bg-surface/80 border border-border px-4 py-2 rounded-xl text-primary-500 transition-all font-medium text-sm">
                      <ExternalLink size={16} /> LinkedIn Professional
                    </a>
                  )}
               </div>
             </div>
          </div>

          {/* AI Enlightenment Summary */}
          <div className="glass-panel p-8 relative">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
               Investigation Summary
            </h2>
            <p className="text-text-muted leading-relaxed whitespace-pre-wrap text-lg">
              {candidate.enrichment_data?.summary || 'No AI summary generated yet. Execute an investigation to analyze this profile flawlessly.'}
            </p>
            
            {candidate.enrichment_data?.gap_analysis?.length > 0 && (
              <div className="mt-8 pt-8 border-t border-border/50">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 opacity-50">Skill Gaps Detected</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.enrichment_data.gap_analysis.map((gap, i) => (
                    <span key={i} className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-semibold">
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Technical Deep-Dive Section flawlessy */}
          {candidate.enrichment_data?.project_quality_assessment && (
            <div className="glass-panel p-8 bg-gradient-to-r from-primary-500/5 to-transparent border-l-4 border-primary-500 animation-slide-up">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <Zap size={20} className="text-primary-500" />
                Technical Project Deep-Dive
              </h2>
              <p className="text-text-muted leading-relaxed italic border-l-2 border-white/5 pl-4 py-1">
                "{candidate.enrichment_data.project_quality_assessment}"
              </p>
              <div className="mt-6 flex items-center gap-2">
                <div className="px-3 py-1 bg-primary-500/10 text-primary-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary-500/20">
                  Verified Technical Signal
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Match Analysis & GitHub Stats */}
        <div className="space-y-8">
           {/* New Match Analysis Display */}
          <div className="glass-panel p-8 relative group overflow-hidden border-l-4 border-primary-500">
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/10 blur-[80px] rounded-full" />
             <h2 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
                <span>Job Match analysis</span>
                <Zap size={16} className="text-primary-500 fill-primary-500" />
             </h2>
             
             <div className="flex items-center justify-center py-6 mb-6 bg-surface/50 rounded-2xl border border-white/5 shadow-inner">
                <div className="text-center">
                   <div className="text-5xl font-black text-white mb-1">
                      {candidate.scores?.total_score || candidate.metadata?.total_score || 0}
                   </div>
                   <div className="text-[10px] text-primary-500 font-bold uppercase tracking-[0.2em]">Overall match score</div>
                </div>
             </div>

             <div className="space-y-4">
                {candidate.scores && Object.entries(candidate.scores).map(([key, val]) => (
                  key !== 'total_score' && typeof val === 'number' && (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-text-muted">
                        <span className="capitalize">{key}</span>
                        <span className="text-white">{val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-1000" 
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  )
                ))}
                
                {(!candidate.scores || Object.keys(candidate.scores).length === 0) && (
                   <p className="text-xs text-text-muted italic text-center py-2">
                     Investigation required for match breakdown.
                   </p>
                )}
             </div>
          </div>

          {/* GitHub Deep-Dive Metrics */}
          {candidate.github_data?.url && (
            <div className="glass-panel p-8 space-y-6 bg-gradient-to-br from-surface to-background transition-all">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe size={20} className="opacity-50" />
                Forge Signals
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/40 p-4 rounded-2xl border border-border/50">
                   <div className="flex items-center gap-2 text-text-muted mb-1">
                      <Star size={14} /> <span className="text-xs font-medium uppercase tracking-tighter">Stars</span>
                   </div>
                   <div className="text-2xl font-black text-white">{candidate.github_data.stars}</div>
                </div>
                <div className="bg-background/40 p-4 rounded-2xl border border-border/50">
                   <div className="flex items-center gap-2 text-text-muted mb-1">
                      <GitBranch size={14} /> <span className="text-xs font-medium uppercase tracking-tighter">Repos</span>
                   </div>
                   <div className="text-2xl font-black text-white">{candidate.github_data.repos}</div>
                </div>
              </div>
              
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3 block opacity-50">Top Languages</span>
                <div className="flex flex-wrap gap-2">
                  {candidate.github_data.languages?.map(lang => (
                    <span key={lang} className="px-3 py-1 bg-white/5 text-white/70 border border-white/10 rounded-lg text-xs font-bold">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Risk Alerts */}
          {candidate.risk_flags?.length > 0 && (
            <div className="glass-panel p-8 border-l-4 border-orange-500 bg-orange-500/5 shadow-2xl shadow-orange-500/5">
               <div className="flex items-center gap-3 text-orange-400 mb-6 font-black uppercase tracking-tighter italic">
                 <ShieldAlert size={24} />
                 <span>Strategic Risk detected</span>
               </div>
               <ul className="space-y-4">
                 {candidate.risk_flags.map((flag, i) => (
                   <li key={i} className="text-sm text-text-muted/80 pl-4 border-l-2 border-orange-500/20 py-1 font-medium transition-all hover:text-white">
                     {flag}
                   </li>
                 ))}
               </ul>
            </div>
          )}
        </div>
      </div>

      {/* Floating Investigative Console Toggle */}
      {investigating && (
        <button 
          onClick={() => setShowConsole(!showConsole)}
          className={`fixed bottom-8 right-8 z-[100] p-4 rounded-2xl shadow-2xl transition-all duration-500 flex items-center gap-3 backdrop-blur-xl border ${
            showConsole 
              ? 'bg-primary-500 text-white border-primary-400 translate-y-[-350px]' 
              : 'bg-surface/80 border-white/10 text-primary-500 hover:scale-110'
          }`}
        >
          <div className="relative">
             {investigating && <div className="absolute -inset-1 bg-primary-500 rounded-full animate-ping opacity-20" />}
             {showConsole ? <ChevronDown size={20} /> : <Terminal size={20} />}
          </div>
          {!showConsole && <span className="text-[10px] font-black uppercase tracking-widest pr-2">View Thinking Process</span>}
        </button>
      )}

      {/* Thinking Console Tray */}
      <div className={`fixed bottom-0 left-0 right-0 z-[90] transition-all duration-700 ease-in-out ${
        showConsole ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="max-w-4xl mx-auto px-4 pb-8">
           <div className="bg-[#050505] border border-white/10 rounded-t-[32px] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-8 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Investigative Thought Stream</span>
                 </div>
                 <button onClick={() => setShowConsole(false)} className="text-text-muted hover:text-white transition-colors">
                    <X size={16} />
                 </button>
              </div>
              
              <div className="h-[300px] overflow-y-auto p-8 font-mono text-[11px] leading-relaxed custom-scrollbar bg-black/40">
                 {thoughts.map((thought, i) => (
                    <div key={thought.id} className="mb-3 animation-fade-in flex gap-4">
                       <span className="text-primary-500/40 shrink-0">[{thought.timestamp}]</span>
                       <span className={thought.node ? 'text-primary-400 font-bold' : 'text-text-muted whitespace-pre-wrap'}>
                          {thought.node && <span className="uppercase text-[9px] mr-2 bg-primary-500/10 px-1 rounded">AGENT:{thought.node}</span>}
                          {thought.message}
                       </span>
                    </div>
                 ))}
                 {investigating && (
                    <div className="flex gap-2 items-center text-primary-500/40 animate-pulse mt-4">
                       <div className="w-1 h-1 bg-current rounded-full" />
                       <div className="w-1 h-1 bg-current rounded-full" />
                       <div className="w-1 h-1 bg-current rounded-full" />
                       <span className="italic ml-2 text-[9px]">Awaiting next neural firing...</span>
                    </div>
                 )}
                 <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};


export default CandidateDetailPage;
