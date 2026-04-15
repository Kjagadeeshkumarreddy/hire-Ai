import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sparkles, Send, Loader2, RotateCcw, MessageSquare, CheckCircle2, Users, Wand2, Terminal, Mail, Info, ArrowLeft, Layout, Zap, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useJobList } from '../hooks/useJD';
import { JobSelector } from '../components/common/JobSelector';

const CampaignPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { data: allJobs = [] } = useJobList();
  const jobs = allJobs.filter(j => j.status !== 'offer');
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState({ subject: '', body: '' });
  const [adjustments, setAdjustments] = useState('');
  const [sentStats, setSentStats] = useState(null);

  // Helper to validate UUID flawlessy
  const isValidUUID = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  const fetchDraft = async (feedback = null) => {
    if (!isValidUUID(selectedJobId)) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:8000/api/v1/jd/${selectedJobId}/bulk-email-draft`, {
        adjustments: feedback,
        previous_content: feedback ? draft.body : null
      });
      setDraft(response.data);
      if (feedback) setAdjustments('');
    } catch (err) {
      console.error("Template generation failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync with URL params or first job flawlessy
  useEffect(() => {
    if (jobId && isValidUUID(jobId)) {
       setSelectedJobId(jobId);
    } else if (jobs.length > 0 && !selectedJobId) {
       setSelectedJobId(jobs[0].id);
    }
  }, [jobId, jobs]);

  // Fetch draft when job changes
  useEffect(() => {
    if (isValidUUID(selectedJobId)) {
       fetchDraft();
    }
  }, [selectedJobId]);

  const handleJobChange = (e) => {
    const newId = e.target.value;
    setSelectedJobId(newId);
    navigate(`/campaign/${newId}`);
  };

  const handleSendAll = async () => {
    if (!isValidUUID(selectedJobId)) return;
    setSending(true);
    try {
      const res = await axios.post(`http://localhost:8000/api/v1/jd/${selectedJobId}/bulk-send`, {
        subject: draft.subject,
        body: draft.body
      });
      setSentStats(res.data);
    } catch (err) {
      console.error("Bulk send failed", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 pt-6 selection:bg-cyan-500/30">
      <div className="max-w-[1600px] mx-auto animation-fade-in pb-20">
        
        {/* V3 Navigation Bar flawlessy */}
        <nav className="flex items-center justify-between mb-10">
          <Link to="/shortlisted" className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group px-4 py-2 rounded-xl hover:bg-white/5">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest text-white/40 group-hover:text-white">Exit Editor</span>
          </Link>
          
          {/* Unified Job Selector flawlessly */}
          <div className="flex items-center gap-10">
            <div className="hidden lg:flex flex-col items-start min-w-[320px]">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 mb-3 ml-2">Active Job Focus</span>
               <JobSelector 
                 activeJobId={selectedJobId} 
                 onSelect={(id) => {
                   setSelectedJobId(id);
                   if (id) navigate(`/campaign/${id}`);
                 }} 
                 filterType="interview" 
               />
            </div>


            <div className="flex items-center gap-4 px-6 py-4 bg-[#0A0A0B] border border-white/5 rounded-[24px] shadow-xl">
               <div className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse shadow-[0_0_15px_rgba(20,184,166,0.6)]" />
               <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Node Active</span>
            </div>
          </div>
        </nav>

        {sentStats ? (
          <div className="w-full max-w-4xl mx-auto mt-20 p-20 bg-[#0A0A0B] border border-slate-800 rounded-[48px] shadow-2xl text-center animation-slide-up">
            <div className="relative mb-12 inline-block">
                <div className="absolute -inset-16 bg-cyan-500/20 rounded-full blur-[80px]" />
                <div className="relative w-32 h-32 bg-gradient-to-br from-primary-500 to-primary-600 rounded-[40px] flex items-center justify-center text-white shadow-2xl border border-white/20">
                    <CheckCircle2 size={64} />
                </div>
            </div>
            <h3 className="text-6xl font-black text-white mb-6 uppercase tracking-tighter">Campaign Primed</h3>
            <p className="text-xl text-slate-400 mb-12 max-w-xl mx-auto font-medium leading-relaxed">
               Personalized outreach successfully dispatched to <span className="text-cyan-400 font-black">{sentStats.sent_count} candidates</span>. Deployment status: <span className="text-white">Flawless</span>.
            </p>
            <button 
                onClick={() => navigate('/shortlisted')} 
                className="px-16 py-6 bg-white text-slate-950 hover:bg-slate-100 rounded-3xl font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
            >
                Return to Command Center
            </button>
          </div>
        ) : (
          <div className="flex gap-10 items-stretch">
            
            {/* Left: Adjustment Studio flawlessy */}
            <aside className="w-[480px] space-y-8 flex flex-col">
              <div className="bg-[#0A0A0B] border border-slate-800 rounded-[40px] p-10 shadow-xl flex-1 flex flex-col space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-500/10 rounded-2xl text-primary-500 border border-primary-500/20">
                      <Terminal size={20} />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white">AI Adjustment Terminal</h4>
                  </div>
                </div>

                <div className="flex-1 flex flex-col space-y-4">
                  <div className="relative flex-1 group">
                    <textarea 
                      placeholder="Instruct the AI engine (e.g. 'Add more enthusiasm', 'Mention our flexible work style')..."
                      className="w-full h-full bg-[#1E293B] border-2 border-slate-700 rounded-3xl p-8 text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all resize-none leading-relaxed font-medium shadow-inner"
                      value={adjustments}
                      onChange={(e) => setAdjustments(e.target.value)}
                    />
                    <div className="absolute top-4 right-4 animate-spin-slow opacity-20">
                       <Zap size={14} className="text-cyan-400" />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => fetchDraft(adjustments)}
                    disabled={loading || !adjustments}
                    className="w-full py-6 bg-[#0A0A0B] border border-primary-500/30 hover:border-primary-500 rounded-3xl text-primary-500 font-black text-xs uppercase tracking-[0.3em] transition-all disabled:opacity-20 flex items-center justify-center gap-4 group"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />}
                    Regenerate Template
                  </button>
                </div>
              </div>

              <div className="bg-[#0A0A0B]/50 border border-slate-800/50 rounded-[40px] p-10 flex items-center justify-between">
                 <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Campaign Target</div>
                    <div className="flex items-center gap-2">
                       <Users size={16} className="text-cyan-400" />
                       <span className="text-sm font-black text-white uppercase tracking-tighter">Shortlisted Talent</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Sync Mode</div>
                    <div className="flex items-center gap-2 justify-end">
                       <Sparkles size={16} className="text-cyan-400" />
                       <span className="text-sm font-black text-white uppercase tracking-tighter">AI 1:1 Personalization</span>
                    </div>
                 </div>
              </div>
            </aside>

            {/* Right: The Email Artisan Studio flawlessly */}
            <main className="flex-1 flex flex-col space-y-8">
              <div className="bg-[#0A0A0B] border border-slate-800 rounded-[48px] p-12 shadow-2xl flex flex-col flex-1 space-y-10">
                
                <div className="flex items-center gap-8">
                   <div className="p-5 bg-white/5 rounded-[32px] text-white border border-white/10 shadow-xl">
                      <Mail size={32} />
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center gap-6 mb-2">
                         <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Email Studio</h2>
                         <div className="px-3 py-1 bg-primary-500/10 border border-primary-500 text-[10px] font-black text-primary-500 uppercase tracking-widest rounded-lg">High Contrast Mode</div>
                      </div>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.4em]">Draft Vetting & Global Dispatch</p>
                   </div>
                </div>

                <div className="flex flex-col flex-1 space-y-10 min-h-0">
                  {/* Subject Line Station flawlessy */}
                  <div className="space-y-4">
                     <label className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-400/60 ml-1">Subject Header</label>
                     <div className="relative group">
                        <input 
                           type="text" 
                           value={draft.subject}
                           onChange={(e) => setDraft({...draft, subject: e.target.value})}
                           placeholder="Campaign Subject Line..."
                           className="w-full bg-[#1E293B] border-2 border-slate-700 rounded-[32px] px-10 py-8 text-2xl font-black text-white focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600 shadow-inner group-hover:border-slate-500"
                        />
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-opacity">
                           <Layout size={24} className="text-cyan-400" />
                        </div>
                     </div>
                  </div>

                  {/* Body Content Editor expanded effortlessly */}
                  <div className="flex-[2] flex flex-col space-y-4 min-h-[500px]">
                     <label className="text-[11px] font-black uppercase tracking-[0.4em] text-primary-500/60 ml-1">Core Payload</label>
                     <div className="flex-1 overflow-hidden rounded-[48px] border-2 border-slate-700 bg-[#080809] relative group shadow-[0_40px_80px_rgba(0,0,0,0.4)] flex flex-col p-2 hover:border-slate-600 transition-all">
                        {loading && (
                           <div className="absolute inset-0 bg-[#0A0A0B]/95 flex flex-col items-center justify-center z-20 gap-8 backdrop-blur-xl">
                              <Loader2 size={80} className="animate-spin text-primary-500" />
                              <span className="text-sm font-black uppercase tracking-[0.6em] text-primary-500 animate-pulse">Refining Intelligence...</span>
                           </div>
                        )}
                        <textarea 
                           className="flex-1 w-full bg-transparent border-none outline-none text-slate-200 px-12 pt-8 pb-12 text-xl font-medium leading-[1.8] resize-none selection:bg-primary-500/40 custom-scrollbar overflow-y-auto"
                           value={draft.body}
                           onChange={(e) => setDraft({...draft, body: e.target.value})}
                        />
                        <div className="absolute bottom-10 right-10 bg-white/5 px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md">V4 Neural Engine Active</div>
                     </div>
                  </div>
                </div>

                {/* Dispatch Control flawlessly */}
                <div className="pt-8 border-t border-slate-800/50 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-primary-500 shadow-[0_0_20px_rgba(20,184,166,0.6)] animate-pulse" />
                      <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">System Ready for Mass Distribution</span>
                   </div>
                   
                   <button 
                      onClick={handleSendAll}
                      disabled={sending || loading || !draft.body}
                      className="relative group px-16 py-7 bg-gradient-to-r from-primary-500 to-primary-600 rounded-[32px] overflow-hidden shadow-[0_30px_60px_rgba(20,184,166,0.25)] hover:scale-105 active:scale-95 transition-all disabled:opacity-20 translate-y-2"
                   >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center gap-5 text-white font-black uppercase tracking-[0.4em] text-sm">
                         {sending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                         {sending ? 'Deploying...' : 'Blast Campaign'}
                      </div>
                   </button>
                </div>
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignPage;
