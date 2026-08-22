import React, { useState, useMemo } from 'react';
import { 
  Upload, Search, Filter, ShieldAlert, CheckCircle, 
  Clock, Sparkles, Loader2, Users, Target, Activity, AlertTriangle,
  Terminal, X, ChevronDown
} from 'lucide-react';
import { useCandidateList, useCandidateMutations } from '../hooks/useCandidates';
import { useJobList } from '../hooks/useJD';
import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';
import { JobSelector } from '../components/common/JobSelector';

const CandidateDashboard = () => {
  const [biasFree, setBiasFree] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(() => {
    const saved = localStorage.getItem('activeJobId');
    return (saved && saved !== 'null') ? saved : '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Streaming & Console State flawlessy
  const [investigating, setInvestigating] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [thoughts, setThoughts] = useState([]);

  const { data: candidates = [], isLoading, refetch } = useCandidateList(selectedJobId);
  const { data: jobs = [] } = useJobList();
  const { bulkInvestigate: _bulkInvestigate } = useCandidateMutations();

  const activeJob = jobs.find(j => j.id === selectedJobId);

  // Dynamic Metrics Calculation flawlessy
  const metrics = useMemo(() => {
    const total = candidates.length;
    const scored = candidates.filter(c => c.pipeline_status === 'scored' || c.pipeline_status === 'investigated');
    const avgScore = total > 0 
      ? Math.round(scored.reduce((acc, c) => acc + (c.scores?.total_score || 0), 0) / (scored.length || 1)) 
      : 0;
    const risky = candidates.filter(c => (c.risk_flags?.length || 0) > 0).length;
    const shortlisted = candidates.filter(c => c.is_shortlisted).length;

    return [
      { label: 'Total Candidates', value: total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Average Score', value: `${avgScore}%`, icon: Target, color: 'text-primary-500', bg: 'bg-primary-500/10' },
      { label: 'Shortlisted', value: shortlisted, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
      { label: 'Risk Alerts', value: risky, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ];
  }, [candidates]);

  // Filtering Logic flawlessy
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const searchTarget = biasFree ? c.anonymized_id : c.full_name;
      return searchTarget?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [candidates, searchQuery, biasFree]);

  const handleJobSelect = (id) => {
    setSelectedJobId(id || '');
    if (id) {
      localStorage.setItem('activeJobId', id);
    } else {
      localStorage.removeItem('activeJobId');
    }
  };

  const handleBulkInvestigate = async () => {
    if (!selectedJobId) return;
    
    console.log("⚡ [DASHBOARD] Bulk Investigation Initiated (Stream Mode)");
    setInvestigating(true);
    setThoughts([]);
    setShowConsole(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = useAuthStore.getState().token;

      const response = await fetch(`${baseUrl}/candidates/${selectedJobId}/bulk-investigate`, {
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
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.message) {
              setThoughts(prev => [...prev, {
                id: Date.now() + Math.random(),
                message: data.message,
                timestamp: new Date().toLocaleTimeString(),
                node: data.node
              }]);
            }
            
            if (data.status === 'completed') {
              setTimeout(() => {
                refetch();
                setInvestigating(false);
              }, 2500);
            }
          } catch (_e) {
            console.warn("Fragmented data in bulk stream", trimmed);
          }
        }
      }
    } catch (err) {
      console.error("Bulk Stream Failed", err);
      setInvestigating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Candidates</h1>
          <p className="text-text-muted font-medium">Managing talent for <span className="text-primary-400">{activeJob?.title || "selected role"}</span></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <JobSelector activeJobId={selectedJobId} onSelect={handleJobSelect} filterType="interview" hideSubRoles={true} />
          
          <label className="flex items-center gap-2 cursor-pointer bg-surface/50 border border-white/10 px-4 py-2 rounded-xl hover:border-primary-500/50 transition-all backdrop-blur-md">
            <span className={`text-xs font-bold uppercase tracking-wider ${biasFree ? 'text-primary-500' : 'text-text-muted'}`}>Bias-Free</span>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${biasFree ? 'bg-primary-500' : 'bg-white/10'}`}>
              <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${biasFree ? 'translate-x-4' : ''}`} />
            </div>
            <input type="checkbox" className="hidden" checked={biasFree} onChange={() => setBiasFree(!biasFree)} />
          </label>
          
          <button 
            onClick={handleBulkInvestigate}
            disabled={investigating || candidates.length === 0 || !selectedJobId}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all font-bold text-sm shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] ${
              investigating 
              ? 'bg-primary-500 text-white border-primary-400' 
              : 'bg-primary-500/10 border-primary-500/30 text-primary-500 hover:bg-primary-500 hover:text-white'
            }`}
          >
            {investigating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {investigating ? "Executing Pipeline..." : "AI Investigation"}
          </button>

          <Link to={`/upload?jobId=${selectedJobId}`} className={`btn-primary flex items-center gap-2 ${!selectedJobId ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={18} />
            Upload Batch
          </Link>
        </div>
      </div>

      {/* Metrics Row flawlessy */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {metrics.map((m, i) => (
          <div key={i} className="glass-panel p-6 flex items-center gap-5 group hover:border-primary-500/30 transition-all">
            <div className={`w-12 h-12 rounded-2xl ${m.bg} flex items-center justify-center ${m.color} group-hover:scale-110 transition-transform`}>
              <m.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-text-muted mb-1">{m.label}</p>
              <p className="text-2xl font-black text-white">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="glass-panel overflow-hidden border-white/5 shadow-2xl">
        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID..." 
              className="w-full bg-background/50 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-all backdrop-blur-md"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-text-muted text-[10px] font-black uppercase tracking-widest bg-white/5">
                <th className="p-5">Candidate</th>
                <th className="p-5">Applied Role</th>
                <th className="p-5">AI Technical Score</th>
                <th className="p-5">Pipeline Status</th>
                <th className="p-5">Heuristic Risk</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={40} className="text-primary-500 animate-spin" />
                      <p className="text-text-muted font-bold tracking-widest text-xs uppercase">Hydrating Data Models...</p>
                    </div>
                  </td>
                </tr>
              )}
              {filteredCandidates.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors group/row">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-primary-500 font-black text-sm group-hover/row:scale-110 transition-transform shadow-lg">
                        {biasFree ? <ShieldAlert size={16} /> : (c.full_name?.charAt(0) || "?")}
                      </div>
                      <div>
                        <span className="font-bold text-white block leading-tight">{biasFree ? c.anonymized_id : c.full_name}</span>
                        <span className="text-[10px] text-text-muted font-medium">{c.email?.split('@')[1]}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="text-xs font-bold text-text-muted bg-white/5 px-2 py-1 rounded-md">{activeJob?.title || 'General'}</span>
                  </td>
                  <td className="p-5">
                    {c.scores?.total_score ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white/5 rounded-full h-1.5 min-w-[120px] overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              c.scores.total_score > 80 ? 'bg-green-500' : 
                              c.scores.total_score > 50 ? 'bg-primary-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${c.scores.total_score}%` }} 
                          />
                        </div>
                        <span className="text-sm font-black text-white">{c.scores.total_score}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-text-muted italic text-xs">
                        <Clock size={12} /> Pending...
                      </div>
                    )}
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                      c.pipeline_status === 'scored' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                    }`}>
                      {c.pipeline_status === 'scored' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {c.pipeline_status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-5">
                    {c.risk_flags && c.risk_flags.length > 0 ? (
                      <div className="flex items-center gap-2 text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-lg w-fit">
                        <AlertTriangle size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Flagged</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Low Risk</span>
                    )}
                  </td>
                  <td className="p-5 text-right">
                    <Link to={`/candidates/${c.id}`} className="btn-secondary text-[10px] py-1.5">View Intelligence</Link>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredCandidates.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <Search size={48} className="text-text-muted" />
                      <div className="max-w-xs">
                        <p className="text-white font-bold mb-1">No matching intelligence found</p>
                        <p className="text-xs text-text-muted">Try adjusting your filters or verify the selected role context.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
             <div className="absolute -inset-1 bg-primary-500 rounded-full animate-ping opacity-20" />
             {showConsole ? <ChevronDown size={20} /> : <Terminal size={20} />}
          </div>
          {!showConsole && <span className="text-[10px] font-black uppercase tracking-widest pr-2">Watch Live Ingestion</span>}
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
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Batch Ingestion Thought Stream</span>
                 </div>
                 <button onClick={() => setShowConsole(false)} className="text-text-muted hover:text-white transition-colors">
                    <X size={16} />
                 </button>
              </div>
              
              <div className="h-[300px] overflow-y-auto p-8 font-mono text-[11px] leading-relaxed custom-scrollbar bg-black/40">
                 {thoughts.map((thought) => (
                    <div key={thought.id} className="mb-3 animation-fade-in flex gap-4">
                       <span className="text-primary-500/40 shrink-0">[{thought.timestamp}]</span>
                       <span className={thought.node ? 'text-primary-400 font-bold' : 'text-text-muted whitespace-pre-wrap'}>
                          {thought.node && <span className="uppercase text-[9px] mr-2 bg-primary-500/10 px-1 rounded">AGENT:{thought.node}</span>}
                          {thought.message}
                       </span>
                    </div>
                 ))}
                 <div className="flex gap-2 items-center text-primary-500/40 animate-pulse mt-4">
                    <div className="w-1 h-1 bg-current rounded-full" />
                    <div className="w-1 h-1 bg-current rounded-full" />
                    <div className="w-1 h-1 bg-current rounded-full" />
                    <span className="italic ml-2 text-[9px]">Awaiting next batch update...</span>
                 </div>
                 <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
