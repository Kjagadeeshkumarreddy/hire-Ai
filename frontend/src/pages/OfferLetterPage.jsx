import React, { useState, useEffect, useRef } from 'react';
import { 
   FileText, Download, Send, UserCheck, ShieldCheck, 
   Loader2, CheckCircle2, Sparkles, Layout, Eye, 
   Edit3, ChevronLeft, ChevronRight, Users, MessageSquare,
   Wand2, Zap, RotateCcw
} from 'lucide-react';
import { JobSelector } from '../components/common/JobSelector';
import { useCandidateList } from '../hooks/useCandidates';
import { useJobList } from '../hooks/useJD';
import { jdApi } from '../api/jd';
import { candidateApi } from '../api/candidates';

const OfferLetterPage = () => {
   const { data: jobs = [] } = useJobList();
   const [activeJobId, setActiveJobId] = useState('');
   const { data: candidates = [], isLoading: fetchingCands } = useCandidateList(activeJobId);
   const [selectedCand, setSelectedCand] = useState(null);
   const [checkedIds, setCheckedIds] = useState(new Set());
   
   // Studio State
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
   const [loadingTemplate, setLoadingTemplate] = useState(false);
   const [refining, setRefining] = useState(false);
   
   const [offerHtml, setOfferHtml] = useState(''); // The unified HTML/CSS from AI
   const [feedback, setFeedback] = useState('');
   
   const [sending, setSending] = useState(false);
   const [sendSuccess, setSendSuccess] = useState(false);

   // Filter jobs to find offer roles
   const offerJobs = jobs.filter(j => j.status === 'offer');

   // Auto-select first offer job if available
   useEffect(() => {
      if (offerJobs.length > 0 && !activeJobId) {
         setActiveJobId(offerJobs[0].id);
      }
   }, [offerJobs, activeJobId]);

   // Initial template fetch
   useEffect(() => {
      if (activeJobId) {
         setLoadingTemplate(true);
         jdApi.getOfferTemplate(activeJobId)
            .then(data => {
               setOfferHtml(data.html || '');
            })
            .catch(err => console.error("Initial fetch failed", err))
            .finally(() => setLoadingTemplate(false));
      }
   }, [activeJobId]);

   const activeJob = jobs.find(j => j.id === activeJobId);

   // Refinement Logic
   const handleRefinement = async () => {
      if (!feedback || !activeJobId) return;
      setRefining(true);
      try {
         const data = await jdApi.refineOfferTemplate(activeJobId, offerHtml, feedback);
         setOfferHtml(data.html || offerHtml);
         setFeedback('');
      } catch (err) {
         console.error("Refinement failed", err);
      } finally {
         setRefining(false);
      }
   };

   // Release Logic
   const handleRelease = async () => {
      const targets = checkedIds.size > 0 
         ? candidates.filter(c => checkedIds.has(c.id))
         : (selectedCand ? [selectedCand] : []);

      if (targets.length === 0 || !offerHtml) return;
      
      setSending(true);
      setSendSuccess(false);
      
      let successCount = 0;
      try {
         for (const cand of targets) {
            await candidateApi.sendOfferLetter(cand.id, {
               subject: `Official Employment Offer: ${sanitizeTitle(activeJob?.title)}`,
               header: "OFFER DOSSIER",
               content: personalize(offerHtml, cand) // Use personalized HTML for each recipient
            });
            successCount++;
         }
         setSendSuccess(true);
         setTimeout(() => setSendSuccess(false), 5000);
      } catch (err) {
         console.error("Release failed", err);
         alert(`Failed to complete batch release. ${successCount} successful before error.`);
      } finally {
         setSending(false);
      }
   };

   const toggleAll = () => {
      if (checkedIds.size === candidates.length) {
         setCheckedIds(new Set());
      } else {
         setCheckedIds(new Set(candidates.map(c => c.id)));
      }
   };

   const toggleOne = (id) => {
      const next = new Set(checkedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setCheckedIds(next);
   };

   // Local Personalization Engine
   const sanitizeTitle = (title) => {
      if (!title) return "Specialist";
      // Removes common workflow suffixes like " - Generate Offer Letter" or " (Engineering)"
      return title.split(' - ')[0].split(' (')[0].trim();
   };

   const personalize = (html, cand = selectedCand) => {
      if (!html || !cand) return html;
      const safeHtml = String(html);
      const cleanTitle = sanitizeTitle(activeJob?.title);
      
      return safeHtml
         .replace(/{{candidate_name}}/g, `<span class="personal-tag">${cand.full_name}</span>`)
         .replace(/{{job_title}}/g, `<span class="personal-tag">${cleanTitle}</span>`)
         .replace(/{{date}}/g, new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))
         .replace(/{{joining_date}}/g, "the 1st of next month")
         .replace(/{{salary}}/g, "Competitive Market Rate");
   };

   return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
         {/* Studio Header */}
         <header className="h-20 border-b border-white/5 bg-surface/50 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 relative z-50">
            <div className="flex items-center gap-8">
               <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary-500/10 rounded-xl text-primary-500">
                     <FileText size={20} />
                  </div>
                  <div>
                     <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        Offer <span className="text-primary-500 italic">Studio</span>
                     </h1>
                     <p className="text-[9px] text-text-muted font-bold uppercase tracking-tight">AI-Refined Dossier Engine</p>
                  </div>
               </div>

               <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[11px] font-black uppercase tracking-widest ${
                     isSidebarOpen 
                        ? 'bg-primary-500/10 border-primary-500/20 text-primary-500' 
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
               >
                  <Users size={14} />
                  {isSidebarOpen ? 'Hide Pool' : 'View Pool'}
               </button>
            </div>

            <div className="flex items-center gap-6 min-w-0">
               <div className="max-w-xs w-full">
                  <JobSelector 
                     activeJobId={activeJobId} 
                     onSelect={setActiveJobId} 
                     filterType="offer"
                  />
               </div>
               <div className="h-8 w-px bg-white/5 mx-2 shrink-0" />
               <button className="px-6 py-2.5 bg-primary-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all shrink-0">
                  Finalize Dossier
               </button>
            </div>
         </header>

         {/* Studio Workspace */}
         <main className="flex-1 flex overflow-hidden relative">
            
            {/* Candidate Sidebar */}
            <aside 
               className={`absolute lg:relative z-40 h-full bg-surface border-r border-white/5 transition-all duration-500 ease-in-out flex flex-col ${
                  isSidebarOpen ? 'w-80 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full'
               }`}
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                   <div className="flex items-center gap-3">
                      <input 
                         type="checkbox" 
                         checked={checkedIds.size === candidates.length && candidates.length > 0}
                         onChange={toggleAll}
                         className="w-3 h-3 rounded border-white/20 bg-white/5 checked:bg-primary-500 transition-all cursor-pointer accent-primary-500"
                      />
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[.2em]">Ready for Issuance</h3>
                   </div>
                   <span className="text-[9px] bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded-md font-bold">{candidates.length} Pool</span>
                </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                  {fetchingCands ? (
                     <div className="flex items-center justify-center h-40">
                        <Loader2 className="animate-spin text-primary-500/20" />
                     </div>
                  ) : candidates.length > 0 ? (
                     candidates.map(cand => (
                        <div 
                           key={cand.id}
                           onClick={() => setSelectedCand(cand)}
                           className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group group/row ${
                              selectedCand?.id === cand.id 
                                 ? 'bg-primary-500/10 border-primary-500/30 text-white' 
                                 : 'bg-white/5 border-transparent text-text-muted hover:bg-white/10'
                           }`}
                        >
                           <input 
                              type="checkbox" 
                              checked={checkedIds.has(cand.id)}
                              onChange={(e) => {
                                 e.stopPropagation();
                                 toggleOne(cand.id);
                              }}
                              className="w-3 h-3 rounded border-white/10 bg-white/5 checked:bg-primary-500 transition-all cursor-pointer accent-primary-500"
                           />
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                              selectedCand?.id === cand.id ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-500'
                           }`}>
                              {cand.full_name?.charAt(0)}
                           </div>
                           <span className="font-bold text-xs truncate">{cand.full_name}</span>
                        </div>
                     ))
                  ) : (
                     <p className="text-center text-[10px] text-text-muted mt-10">No candidates found.</p>
                  )}
               </div>
            </aside>

            {/* Main Studio Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#050505] relative">
               
               {/* Left: AI Refinement Console */}
               <section className="w-full md:w-[400px] border-r border-white/5 flex flex-col bg-[#080809] z-10">
                  <div className="px-8 py-4 border-b border-white/5 flex items-center gap-3 bg-black/20">
                     <Wand2 size={14} className="text-primary-500" />
                     <h3 className="text-[10px] font-black text-white uppercase tracking-[.2em]">Refinement Console</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                     <div className="space-y-4">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary-500/60 ml-1">Instruct the Design AI</label>
                        <div className="relative group">
                           <textarea 
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              className="w-full h-[200px] bg-white/5 border border-white/10 rounded-[32px] p-8 text-sm text-slate-300 font-medium leading-relaxed focus:outline-none focus:border-primary-500/50 transition-all resize-none shadow-inner"
                              placeholder="e.g. 'Make the background light blue', 'Use a modern serif font', 'Add a highlighted signature section'..."
                           />
                           <div className="absolute top-4 right-4 opacity-20 group-focus-within:opacity-100 transition-opacity">
                              <Zap size={14} className="text-primary-500" />
                           </div>
                        </div>
                        
                        <button 
                           onClick={handleRefinement}
                           disabled={!feedback || refining || loadingTemplate}
                           className="w-full py-5 bg-[#0A0A0B] border border-primary-500/30 hover:border-primary-500 rounded-2xl text-primary-500 font-black text-[11px] uppercase tracking-[.3em] transition-all flex items-center justify-center gap-3 disabled:opacity-20 group"
                        >
                           {refining ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
                           Update Design
                        </button>
                     </div>

                     <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[32px] space-y-4">
                        <div className="flex items-center gap-2">
                           <ShieldCheck size={14} className="text-green-500" />
                           <h4 className="text-[9px] font-black text-white uppercase tracking-widest">Active Constraints</h4>
                        </div>
                        <ul className="space-y-2">
                           <li className="text-[10px] text-text-muted flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-primary-500/40" />
                              Design is preserved 1:1 for PDF
                           </li>
                           <li className="text-[10px] text-text-muted flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-primary-500/40" />
                              Variables remain reactive
                           </li>
                        </ul>
                     </div>
                  </div>
               </section>

               {/* Right: The Living Dossier Stage */}
               <section className="flex-1 bg-black flex flex-col relative overflow-hidden">
                  {/* Decorative Background */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                     <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                     <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary-900/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
                  </div>

                  <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-black/20 relative z-10">
                     <div className="flex items-center gap-3">
                        <Eye size={14} className="text-primary-500" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[.2em]">Living Dossier Stage</h3>
                     </div>
                     {selectedCand && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-black uppercase tracking-widest animation-fade-in">
                           <Sparkles size={10} /> Neural Personalization: {selectedCand.full_name}
                        </div>
                     )}
                  </div>

                  <div className="flex-1 overflow-hidden relative z-10 flex flex-col">
                     {loadingTemplate ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center p-12">
                           <div className="relative">
                              <div className="absolute -inset-8 bg-primary-500/20 rounded-full blur-2xl animate-pulse" />
                              <Loader2 size={64} className="animate-spin text-primary-500 relative" />
                           </div>
                           <div>
                              <p className="text-sm font-black text-white uppercase tracking-[.4em] mb-2">Synthesizing Aesthetics</p>
                              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Engineering formal structure...</p>
                           </div>
                        </div>
                     ) : !offerHtml ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                           <ShieldCheck size={48} className="text-white/5 mb-6" />
                           <p className="text-text-muted text-sm font-medium italic">Ready to initialze candidate issuance dossier.</p>
                           <button onClick={() => jdApi.getOfferTemplate(activeJobId).then(d => setOfferHtml(d.html))} className="mt-6 text-[10px] text-primary-500 font-black uppercase tracking-widest hover:underline">
                              Initialize Master HTML →
                           </button>
                        </div>
                     ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-12 flex justify-center bg-[#111]">
                           {/* Unified Preview Rendering */}
                           <div className="w-full max-w-[800px] min-h-full bg-white shadow-2xl origin-top transition-transform duration-700 hover:scale-[1.01]">
                              <iframe 
                                 title="Dossier Render"
                                 srcDoc={personalize(offerHtml)} 
                                 className="w-full h-full border-none pointer-events-none"
                                 style={{ minHeight: '1100px' }}
                              />
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="p-8 border-t border-white/5 bg-black/20 flex gap-4 relative z-10">
                     <button 
                        disabled={!selectedCand || loadingTemplate || !offerHtml}
                        className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                     >
                        <Download size={14} /> Local Export (PDF)
                     </button>
                      <button 
                         onClick={handleRelease}
                         disabled={(checkedIds.size === 0 && !selectedCand) || loadingTemplate || !offerHtml || sending}
                         className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-30 ${
                            sendSuccess 
                               ? 'bg-green-500 text-white shadow-green-500/20' 
                               : 'bg-primary-500 text-white shadow-primary-500/20 hover:scale-[1.02]'
                         }`}
                      >
                         {sending ? <Loader2 size={14} className="animate-spin" /> : sendSuccess ? <CheckCircle2 size={14} /> : <Send size={14} />}
                         {sending 
                            ? (checkedIds.size > 1 ? `Issuing ${checkedIds.size}...` : 'Dispatching...') 
                            : sendSuccess 
                               ? 'Dossier(s) Released' 
                               : checkedIds.size > 1 
                                  ? `Batch Release (${checkedIds.size})`
                                  : 'Release Electronically'
                         }
                      </button>
                  </div>
               </section>
            </div>
         </main>

         {/* Local Styles for Personalization Node */}
         <style>{`
            .personal-tag {
               color: #0d9488 !important;
               font-weight: 800 !important;
               border-bottom: 2px solid #0d948840;
            }
         `}</style>
      </div>
   );
};

export default OfferLetterPage;
