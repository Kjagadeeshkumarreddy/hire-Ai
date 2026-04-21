import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
   MessageSquare, 
   BrainCircuit, 
   ChevronRight, 
   Loader2, 
   BookOpen, 
   Zap, 
   ShieldCheck, 
   Code,
   User,
   Users,
   CheckCircle2,
   AlertCircle
} from 'lucide-react';
import { useJobList } from '../hooks/useJD';
import { useCandidateList } from '../hooks/useCandidates';
import { candidateApi } from '../api/candidates';
import { JobSelector } from '../components/common/JobSelector';

const CategoryCard = ({ title, questions, icon: Icon, colorClass, delay }) => (
   <div className={`p-6 rounded-[32px] border-2 border-slate-800 bg-[#0A0A0B] animation-scale-in`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-4 mb-6">
         <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10`}>
            <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
         </div>
         <h3 className="text-xl font-black uppercase tracking-widest text-white">{title}</h3>
      </div>
      <div className="space-y-4">
         {questions.map((q, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
               <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0 group-hover:scale-150 transition-transform" />
               <p className="text-slate-300 leading-relaxed font-medium">{q}</p>
            </div>
         ))}
      </div>
   </div>
);

const InterviewQuestionsPage = () => {
   const navigate = useNavigate();
   const { data: jobs = [] } = useJobList();
   const [activeJobId, setActiveJobId] = useState('default-job');
   const { data: candidates = [], isLoading: fetchingCands } = useCandidateList(activeJobId);
   
   const [selectedCand, setSelectedCand] = useState(null);
   const [mode, setMode] = useState('technical'); // technical or hr
   const [questions, setQuestions] = useState(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);

   // Selection & Promotion States flawlessy
   const [selectedIds, setSelectedIds] = useState([]);
   const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
   const [targetRound, setTargetRound] = useState('Technical Round');
   const [isPromoting, setIsPromoting] = useState(false);

   // Sync with first job on load flawlessly
   useEffect(() => {
      if (jobs.length > 0 && (activeJobId === 'default-job' || !activeJobId)) {
         setActiveJobId(jobs[0].id);
      }
   }, [jobs]);

   // Fetch questions when mode changes flawlessly
   useEffect(() => {
      if (selectedCand) {
         loadQuestions(selectedCand);
      }
   }, [mode]);

   const shortlisted = candidates.filter(c => c.is_shortlisted);

   const loadQuestions = async (cand) => {
      setSelectedCand(cand);
      setLoading(true);
      setError(null);
      setQuestions(null);
      try {
         // Check if questions exist first - Passing mode flawlessly
         const existing = await candidateApi.getQuestions(cand.id, mode);
         if (existing && (existing.easy || existing.hard)) {
            setQuestions(existing);
         } else {
            // Generate them with extended Neural Resilience (60s timeout)
            const generated = await candidateApi.generateQuestions(cand.id, mode);
            setQuestions(generated);
         }
      } catch (err) {
         setError(`The Neural Forge is taking a moment to synthesize ${mode} insights. Please retry in 10 seconds.`);
      } finally {
         setLoading(false);
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
      
      if (targetRound === "Generate Offer Letter") {
         localStorage.setItem('offer_letter_engine_active', 'true');
      }

      setIsPromoting(true);
      try {
         const res = await candidateApi.promote(activeJobId, {
            candidateIds: selectedIds,
            roundName: targetRound
         });
         alert(`Successfully promoted to ${res.new_job_title}!`);
         setSelectedIds([]);
         setIsPromoteModalOpen(false);
         
         if (targetRound === "Generate Offer Letter") {
            navigate('/offer-letter');
         } else {
            // Refresh list to show new job flawlessly
            window.location.reload();
         }
      } catch (err) {
         alert("Synthesis Error: Could not promote candidates to next lab.");
      } finally {
         setIsPromoting(false);
      }
   };

   return (
      <div className="max-w-[1600px] mx-auto h-full flex flex-col gap-8 pb-12">
         {/* Header Studio flawlessly */}
         <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-8 rounded-[48px] bg-surface border border-border/50 shadow-2xl relative group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full -mr-48 -mt-48 transition-all group-hover:bg-primary-500/10" />
            
            <div className="relative z-10 flex items-center gap-6">
               <div className="p-5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl shadow-xl shadow-primary-500/20">
                  <MessageSquare size={36} className="text-white" />
               </div>
               <div>
                  <h1 className="text-2xl font-black tracking-tight text-white mb-2">Interview <span className="text-primary-500 italic">Forge</span></h1>
                  <p className="text-text-muted font-medium flex items-center gap-2">
                     <BrainCircuit size={16} className="text-primary-400" />
                     Synthesizing JD, Resume & GitHub Code for personalized technical dossiers
                  </p>
               </div>
            </div>

            <div className="relative z-10 min-w-[300px]">
               <JobSelector 
                  activeJobId={activeJobId} 
                  onSelect={setActiveJobId} 
                  filterType="interview"
               />
            </div>
         </header>

         <div className="flex-1 flex flex-col xl:flex-row gap-8 min-h-0">
            {/* Candidate Sidebar Hub flawlessy */}
            <div className="w-full xl:w-[35%] flex flex-col gap-4 overflow-hidden shrink-0">
               <h2 className="text-xs font-black uppercase tracking-[0.4em] text-primary-500/60 ml-4 mb-2">Shortlisted Talent</h2>
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                  {fetchingCands ? (
                     <div className="flex flex-col items-center justify-center p-12 gap-4">
                        <Loader2 size={32} className="animate-spin text-primary-500/30" />
                        <span className="text-text-muted text-xs font-bold uppercase tracking-widest">Hydrating Hub...</span>
                     </div>
                  ) : shortlisted.length > 0 ? (
                      shortlisted.map((cand) => (
                        <div 
                           key={cand.id}
                           onClick={() => loadQuestions(cand)}
                           className={`p-6 rounded-[32px] border-2 transition-all cursor-pointer group relative overflow-hidden ${
                              selectedCand?.id === cand.id 
                                 ? 'bg-primary-500/5 border-primary-500/30 shadow-lg shadow-primary-500/5 translate-x-2' 
                                 : 'bg-surface border-border hover:border-primary-500/20 hover:bg-[#121214]'
                           }`}
                        >
                           <div className="flex items-center gap-4 relative z-10">
                              <div 
                                 onClick={(e) => toggleSelection(e, cand.id)}
                                 className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    selectedIds.includes(cand.id)
                                       ? 'bg-primary-500 border-primary-500' 
                                       : 'border-slate-700 bg-white/5 group-hover:border-primary-500/50'
                                 }`}
                              >
                                 {selectedIds.includes(cand.id) && <CheckCircle2 size={14} className="text-white" />}
                              </div>
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${
                                 selectedCand?.id === cand.id ? 'bg-primary-500 text-white' : 'bg-[#1A1A1E] text-slate-400 group-hover:text-primary-400'
                              }`}>
                                 {cand.full_name?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h3 className="font-semibold text-white truncate group-hover:text-primary-400 transition-colors">{cand.full_name}</h3>
                                 <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-wider text-text-muted">
                                    <span className="flex items-center gap-1"><Zap size={10} className="text-amber-400" /> API V4</span>
                                    {cand.github_username && <span className="flex items-center gap-1 text-primary-500 bg-primary-500/30 p-1 rounded-lg"><Code size={10} /> show questions</span>}
                                 </div>
                              </div>
                              <ChevronRight size={20} className={`text-text-muted transition-all ${selectedCand?.id === cand.id ? 'translate-x-1 text-primary-500 opacity-100' : 'opacity-0'}`} />
                           </div>
                        </div>
                     ))
                  ) : (
                     <div className="p-8 text-center glass-panel border-dashed border-2 rounded-[32px]">
                        <User size={32} className="mx-auto text-text-muted opacity-20 mb-4" />
                        <p className="text-text-muted font-bold text-sm">No Shortlisted Candidates Found</p>
                        <p className="text-text-muted text-[10px] uppercase tracking-widest mt-2">Filter active JD or approve talent first</p>
                     </div>
                  )}
               </div>
               
               {selectedIds.length > 0 && (
                  <div className="mt-4 p-4 bg-primary-500/10 border border-primary-500/20 rounded-[24px] animate-slide-up">
                     <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">{selectedIds.length} Selected</span>
                        <button onClick={() => setSelectedIds([])} className="text-[10px] font-black uppercase text-text-muted hover:text-white">Clear</button>
                     </div>
                     <button 
                        onClick={() => setIsPromoteModalOpen(true)}
                        className="w-full py-3 bg-primary-500 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-500/20 hover:scale-[1.02] transition-all active:scale-95"
                     >
                        Move to Next
                     </button>
                  </div>
               )}
            </div>

            {/* Questions Visualization dossier flawlessy */}
            <div className="flex-1 overflow-hidden flex flex-col">
               {!selectedCand ? (
                  <div className="h-full flex flex-col items-center justify-center glass-panel rounded-[56px] border-dashed border-2 p-12">
                     <div className="w-24 h-24 bg-primary-500/5 rounded-[32px] flex items-center justify-center mb-8">
                        <BrainCircuit size={48} className="text-primary-500/20" />
                     </div>
                     <h2 className="text-2xl font-black text-white mb-3">Neural Forge Ready</h2>
                     <p className="text-text-muted max-w-md text-center font-medium leading-relaxed">
                        Select a candidate from the recruitment hub to audit their GitHub projects and Resume for personalized interview questions.
                     </p>
                  </div>
               ) : loading ? (
                  <div className="h-full flex flex-col items-center justify-center bg-surface border border-border rounded-[56px] p-12 relative overflow-hidden">
                     <div className="absolute inset-0 bg-primary-500/2 animate-pulse" />
                     <Loader2 size={64} className="animate-spin text-primary-500 mb-8 relative z-10" />
                     <h2 className="text-2xl font-black text-white mb-2 relative z-10 uppercase tracking-widest">Neural Question Forge</h2>
                     <p className="text-primary-500/60 font-black text-xs uppercase tracking-[0.4em] relative z-10">Cross-referencing GitHub & Resume Labs</p>
                  </div>
               ) : error ? (
                  <div className="h-full flex flex-col items-center justify-center bg-surface border border-red-500/20 rounded-[56px] p-12">
                     <AlertCircle size={48} className="text-red-500 mb-6" />
                     <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Forge Timeout</h2>
                     <p className="text-text-muted font-medium mb-8">{error}</p>
                     <button onClick={() => loadQuestions(selectedCand)} className="px-8 py-3 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all">Retry Synthesis</button>
                  </div>
               ) : questions ? (
                  <div className="h-full flex flex-col gap-6 animation-fade-in overflow-y-auto custom-scrollbar pr-4">
                     <div className="p-6 rounded-[48px] bg-gradient-to-br from-surface to-[#0A0A0B] border border-border flex items-center justify-between shadow-xl flex-shrink-0">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 rounded-[24px] bg-primary-500 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-primary-500/20">
                              {selectedCand.full_name?.charAt(0)}
                           </div>
                           <div>
                              <h2 className="text-xl font-black text-white mb-1 uppercase tracking-tight">{selectedCand.full_name}</h2>
                              <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-primary-500/60">
                                 <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> ID: {selectedCand.anonymized_id || 'PRO-SECURE'}</span>
                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                 <span className="text-slate-500">Analysis V1.0-Stable</span>
                              </div>
                           </div>
                        </div>

                        {/* Mode Switcher Sidebar flawlessy */}
                        <div className="flex bg-white/5 p-1.5 rounded-[24px] border border-white/5">
                           <button 
                              onClick={() => setMode('technical')}
                              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                 mode === 'technical' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white'
                              }`}
                           >
                              Technical
                           </button>
                           <button 
                              onClick={() => setMode('hr')}
                              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                 mode === 'hr' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white'
                              }`}
                           >
                              HR / Behavioral
                           </button>
                        </div>

                        <div className="flex items-center gap-2">
                           <div className="px-5 py-2.5 rounded-2xl bg-primary-500/10 text-primary-500 border border-primary-500/20 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                              <CheckCircle2 size={12} /> {mode === 'technical' ? 'Dossier Validated' : 'Cultural Audit Ready'}
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col gap-8 pb-12">
                        <CategoryCard 
                           title={mode === 'technical' ? 'Foundation' : 'Behavioral'} 
                           questions={questions.easy || []} 
                           icon={mode === 'technical' ? BookOpen : Users} 
                           colorClass={mode === 'technical' ? "bg-primary-500" : "bg-emerald-500"} 
                           delay={100} 
                        />
                        <CategoryCard 
                           title={mode === 'technical' ? 'Application' : 'Scenarios'} 
                           questions={questions.medium || []} 
                           icon={mode === 'technical' ? Zap : AlertCircle} 
                           colorClass={mode === 'technical' ? "bg-amber-500" : "bg-indigo-500"} 
                           delay={200} 
                        />
                        <CategoryCard 
                           title={mode === 'technical' ? 'Deep Dive' : 'Culture Fit'} 
                           questions={questions.hard || []} 
                           icon={mode === 'technical' ? BrainCircuit : ShieldCheck} 
                           colorClass={mode === 'technical' ? "bg-purple-500" : "bg-rose-500"} 
                           delay={300} 
                        />
                     </div>
                  </div>
               ) : null}
            </div>
         </div>

         {/* Promotion Modal Studio flawlessly */}
         {isPromoteModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 font-sans">
               <div className="bg-[#0A0A0B] border-2 border-slate-800 rounded-[48px] p-10 w-full max-w-lg shadow-[0_0_100px_rgba(20,184,166,0.15)] animate-scale-in">
                  <div className="flex items-center gap-6 mb-8">
                     <div className="p-4 bg-primary-500/10 rounded-2xl">
                        <Zap size={28} className="text-primary-500" />
                     </div>
                     <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Promote Talent</h2>
                        <p className="text-text-muted text-sm font-medium">Select destination lab for {selectedIds.length} candidates</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/60 ml-1">Engagement Lab</label>
                        <div className="grid grid-cols-1 gap-3">
                           {["Technical Round", "HR Round", "Generate Offer Letter"].map((round) => (
                              <div 
                                 key={round}
                                 onClick={() => setTargetRound(round)}
                                 className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                    targetRound === round 
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
                           Abort
                        </button>
                        <button 
                           onClick={handlePromote}
                           disabled={isPromoting}
                           className="flex-1 py-4 bg-primary-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                           {isPromoting ? (
                              <>
                                 <Loader2 size={16} className="animate-spin" />
                                 Synthesizing...
                              </>
                           ) : (
                              'Execute Promotion'
                           )}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default InterviewQuestionsPage;
