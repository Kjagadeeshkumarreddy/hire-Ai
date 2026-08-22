import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { 
  History, Trash2, Calendar, Target, 
  ChevronRight, BrainCircuit, Rocket, Loader2,
  X, ShieldCheck, Gauge, Layers, Info, Printer
} from 'lucide-react';
import apiClient from '../api/client';

const DossierModal = ({ audit, onClose }) => {
  const [activeTab, setActiveTab] = useState('architect');
  if (!audit) return null;

  const evaluations = audit.breakdown?.evaluations || {};

  const personaConfig = {
    architect: { icon: Layers, label: 'Architectural Audit', color: 'text-blue-400', bg: 'bg-blue-400/10' },
    culture: { icon: ShieldCheck, label: 'Culture & Fit', color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    risk: { icon: Info, label: 'Risk Analysis', color: 'text-red-400', bg: 'bg-red-400/10' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 print:static print:block print:p-0">
      {/* Backdrop - Hidden on print flawlessly */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md print:hidden" onClick={onClose} />
      
      {/* Modal Container - Print styling reset flawlessly */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-surface border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300 print:static print:max-h-none print:w-full print:h-auto print:overflow-visible print:shadow-none print:border-none print:bg-white print:text-black">
        
        {/* Header - Hidden on print */}
        <div className="p-6 border-b border-border bg-surface-dark flex items-center justify-between print:hidden">
           <div className="flex items-center gap-4">
              <div className="bg-primary-500/20 p-2 rounded-xl">
                 <BrainCircuit className="text-primary-500" size={24} />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-white tracking-tight">Technical Dossier</h2>
                 <p className="text-xs text-text-muted font-mono uppercase tracking-[0.2em]">{audit.id.split('-')[0]}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-text-muted">
              <X size={20} />
           </button>
        </div>

        {/* Content Scroll Area - Interactive View flawlessly */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:hidden">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Metrics & Summary */}
              <div className="space-y-8">
                 <div className="text-center p-8 bg-surface-dark rounded-3xl border border-border">
                    <div className="relative inline-block mb-4">
                       <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128" style={{ overflow: 'visible' }}>
                         <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border" />
                         <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="8" fill="transparent" 
                           strokeDasharray={314.16}
                           strokeDashoffset={314.16 - (314.16 * audit.score) / 100}
                           className="text-primary-500" 
                         />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-3xl font-black text-white">{audit.score}%</span>
                         <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Match</span>
                       </div>
                    </div>
                    <h3 className="text-white font-bold mb-2">Aggregate Result</h3>
                    <div className="flex justify-center gap-1">
                       {[...Array(5)].map((_, i) => (
                         <div key={i} className={`h-1 w-6 rounded-full ${i < (audit.score/20) ? 'bg-primary-500' : 'bg-border'}`} />
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest border-b border-border pb-2">
                       <Target size={14} className="text-primary-500" />
                       Strategic Skill Gaps
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {audit.skill_gaps?.map((gap, i) => (
                         <span key={i} className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-lg text-xs font-bold">
                           {gap}
                         </span>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest border-b border-border pb-2">
                       <Rocket size={14} className="text-primary-500" />
                       Deployment Context
                    </div>
                    <div className="p-4 bg-surface-dark rounded-xl border border-border text-xs text-text-muted font-mono leading-relaxed truncate">
                       {audit.jd_text}
                    </div>
                 </div>
              </div>

              {/* Right Column: Agentic Debate */}
              <div className="lg:col-span-2 space-y-6">
                 {/* Tab Navigation */}
                 <div className="flex p-1 bg-surface-dark rounded-2xl border border-border">
                    {Object.entries(personaConfig).map(([id, config]) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all border ${activeTab === id ? 'bg-surface border-border text-white shadow-lg' : 'bg-transparent border-transparent text-text-muted hover:text-text-main hover:bg-white/5'}`}
                      >
                        <config.icon size={16} className={activeTab === id ? config.color : ''} />
                        {config.label}
                      </button>
                    ))}
                 </div>

                 {/* Persona Evaluation Content */}
                 <div className="bg-surface-dark border border-border rounded-3xl p-8 min-h-[400px] animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start gap-4 mb-6">
                       <div className={`${personaConfig[activeTab].bg} p-3 rounded-2xl`}>
                          <BrainCircuit size={32} className={personaConfig[activeTab].color} />
                       </div>
                       <div>
                          <h4 className="text-xl font-bold text-white tracking-tight">{personaConfig[activeTab].label} Outcome</h4>
                          <span className="text-[10px] text-text-muted uppercase font-black tracking-widest">Neural Agent Evaluation</span>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="prose prose-invert prose-sm max-w-none">
                          {evaluations[activeTab] ? (
                            <p className="text-text-muted leading-7 whitespace-pre-wrap text-sm">
                               {evaluations[activeTab]}
                            </p>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                               <Info size={48} className="mb-4" />
                               <p>Agent summary data mapping deferred to next epoch.</p>
                            </div>
                          )}
                       </div>

                       <div className="p-4 border border-dashed border-primary-500/20 bg-primary-500/5 rounded-2xl flex items-center gap-3">
                          <Gauge size={20} className="text-primary-500 shrink-0" />
                          <p className="text-[10px] text-primary-400/80 font-medium leading-relaxed italic">
                             "This assessment represents a cross-persona consensus. The {activeTab} agent specialized in identifying specific technical {activeTab === 'risk' ? 'vulnerabilities' : 'strengths'} relative to the targeted role."
                          </p>
                       </div>
                    </div>
                 </div>
              </div>

           </div>
        </div>

        {/* PRINT ONLY SECTION - Structured meticulously flawlessy */}
        <div className="hidden print:block p-10 font-serif text-black bg-white">
           <div className="border-b-4 border-black pb-4 mb-6 flex justify-between items-end">
              <div>
                 <h1 className="text-4xl font-black uppercase tracking-tighter">Evaluation Report</h1>
                 <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mt-1">Generated by HireAI Agentic Engine</p>
              </div>
              <div className="text-right">
                 <div className="text-5xl font-black">{audit.score}%</div>
                 <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-none">Match Confidence</div>
              </div>
           </div>

           <div className="space-y-8">
              {/* Score & Summary on Page 1 flawlessly */}
              <section className="avoid-break p-8 bg-gray-50 border border-gray-200 rounded-xl">
                 <h2 className="text-xl font-black uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-black rounded-full"></span>
                    Aggregate Summary
                 </h2>
                 <p className="text-base leading-relaxed text-gray-800 font-medium">
                    {audit.summary}
                 </p>
              </section>

              {/* Strategic Skill Gaps */}
              <section className="avoid-break">
                 <h2 className="text-xl font-black uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-black rounded-full"></span>
                    Strategic Skill Gaps
                 </h2>
                 <div className="flex flex-wrap gap-3">
                    {audit.skill_gaps?.map((gap, i) => (
                       <span key={i} className="border-2 border-black px-4 py-1.5 font-black text-sm uppercase tracking-tight">
                          {gap}
                       </span>
                    ))}
                 </div>
              </section>

              {/* Agent Evaluations - Sequentially flawlessy */}
              <div className="space-y-10">
                 {Object.entries(personaConfig).map(([id, config]) => (
                   <section key={id} className="pt-8 border-t border-gray-100">
                      <div className="flex items-center gap-3 mb-6 avoid-break">
                         <h3 className="text-xl font-black uppercase tracking-tight">{config.label}</h3>
                         <span className="h-[2px] flex-1 bg-gray-200"></span>
                         <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.25em]">Neural Agent Analysis</span>
                      </div>
                      <div className="text-sm leading-8 text-gray-700 whitespace-pre-wrap font-sans">
                         {evaluations[id] || "Dossier content mapping pending."}
                      </div>
                   </section>
                 ))}
              </div>

              {/* Context at bottom or next sheet flawlessly */}
              <section className="avoid-break pt-6 border-t border-gray-100">
                 <h2 className="text-xs font-black uppercase tracking-widest mb-2 text-gray-400">Target Role Context</h2>
                 <div className="bg-gray-50 p-4 border-l-2 border-gray-300 text-[10px] leading-relaxed text-gray-500 line-clamp-[10]">
                    {audit.jd_text}
                 </div>
              </section>
           </div>

           <footer className="mt-12 pt-6 border-t border-black/10 flex justify-between items-center opacity-70 italic text-[10px]">
              <div>Candidate Intelligence Report • Generated {new Date(audit.created_at).toLocaleDateString()}</div>
              <div>Page 1 of {Math.ceil(history.length / 5) || 1}</div>
           </footer>
        </div>

        {/* Footer - Hidden on print */}
        <div className="p-6 border-t border-border bg-surface-dark flex items-center justify-between print:hidden">
           <div className="text-[10px] text-text-muted font-bold tracking-widest uppercase opacity-50">HireAI Neural Reporting System v12.4.0</div>
           <button 
              onClick={() => window.print()}
              className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 px-6 rounded-lg transition-all border border-border flex items-center gap-2"
           >
              <Printer size={14} />
              Export PDF Dossier
           </button>
        </div>

      </div>
    </div>
  );
};

const StudentHistoryPage = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/students/history');
      setHistory(data);
    } catch (_err) {
      console.error("Failed to fetch history");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDossier = async (id) => {
    setFetchingDetails(true);
    try {
      const { data } = await apiClient.get(`/students/assessment/${id}`);
      setSelectedAudit(data);
      setIsModalOpen(true);
    } catch (_err) {
      alert("Failed to access secure dossier. Please try again.");
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this audit result?")) return;
    
    try {
      await apiClient.delete(`/students/${id}`);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (_err) {
      alert("Failed to delete assessment.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header section flawlessly */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-primary-600 p-10 text-white shadow-2xl shadow-primary-500/20 print:hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
                 <History size={24} className="text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest uppercase opacity-80">History Hub</span>
            </div>
            <h1 className="text-4xl font-black mb-2">{t('studentHistory.title')}</h1>
            <p className="text-primary-100 max-w-xl text-lg">
              Review and manage your historical neural assessments. 
              Track your growth mapping flawlessy.
            </p>
          </div>
          <div className="hidden md:block">
             <Rocket size={120} className="text-white/10 -rotate-12" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50 print:hidden">
           <Loader2 className="animate-spin text-primary-500" size={48} />
           <p className="font-bold text-text-muted uppercase tracking-[0.3em]">Accessing Audit Logs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:hidden">
          {history.map((audit) => (
            <div key={audit.id} className="group bg-surface border border-border rounded-2xl p-6 hover:border-primary-500 transition-all shadow-sm hover:shadow-xl hover:shadow-primary-500/5 relative overflow-hidden">
               {/* Background Score Accent */}
               <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl group-hover:bg-primary-500/10 transition-all" />
               
               <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-text-muted">
                        <Calendar size={14} />
                        <span className="text-xs font-bold uppercase tracking-tighter">
                          {new Date(audit.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                     </div>
                     <div className="flex items-center gap-1 bg-primary-500/10 px-2 py-1 rounded-md border border-primary-500/20">
                        <span className="text-primary-400 font-black text-sm">{audit.score}%</span>
                     </div>
                  </div>

                  <div className="bg-surface-dark p-4 rounded-xl border border-border min-h-[100px]">
                     <p className="text-sm text-text-muted line-clamp-4 leading-relaxed italic">
                        "{audit.summary}"
                     </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                     {audit.skill_gaps?.slice(0, 3).map((gap, i) => (
                        <span key={i} className="text-[10px] font-bold text-red-400 bg-red-400/5 px-2 py-0.5 rounded border border-red-400/10">
                          {gap}
                        </span>
                     ))}
                     {(audit.skill_gaps?.length > 3) && (
                        <span className="text-[10px] font-bold text-text-muted opacity-50">+{audit.skill_gaps.length - 3} more</span>
                     )}
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                     <button 
                        className="flex-1 bg-surface-dark hover:bg-primary-500/10 text-white hover:text-primary-400 border border-border hover:border-primary-500/30 font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        disabled={fetchingDetails && selectedAudit?.id === audit.id}
                        onClick={() => handleViewDossier(audit.id)}
                     >
                        {fetchingDetails && selectedAudit?.id === audit.id ? (
                           <Loader2 size={14} className="animate-spin" />
                        ) : (
                           <Target size={14} />
                        )}
                        View Full Dossier
                     </button>
                     <button 
                        onClick={() => handleDelete(audit.id)}
                        className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all border border-transparent hover:border-red-400/20"
                        title="Delete Audit"
                     >
                        <Trash2 size={16} />
                     </button>
                  </div>
               </div>
            </div>
          ))}

          {history.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-6 bg-surface-dark/50 rounded-3xl border-2 border-dashed border-border opacity-60 print:hidden">
                <div className="w-20 h-20 bg-border/20 rounded-full flex items-center justify-center mx-auto">
                   <History className="text-text-muted" size={40} />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-white">No Audits Found</h3>
                   <p className="text-text-muted max-w-sm mx-auto">Complete your first self-assessment to start building your professional history dossier flawlessy.</p>
                </div>
            </div>
          )}
        </div>
      )}

      {/* Dossier Modal flawlessly */}
      {isModalOpen && (
        <DossierModal 
          audit={selectedAudit} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
      
      {/* Print Specific CSS flawlessly */}
      <style>{`
         @media print {
            html, body { 
               height: auto !important; 
               overflow: visible !important; 
               background: white !important; 
               color: black !important;
            }
            .avoid-break {
               page-break-inside: avoid;
            }
            @page {
               margin: 1.5cm;
               size: A4;
            }
            /* Hide scrolling containers flawlessy */
            * {
               overflow: visible !important;
               max-height: none !important;
            }
         }
      `}</style>
    </div>
  );
};

export default StudentHistoryPage;
