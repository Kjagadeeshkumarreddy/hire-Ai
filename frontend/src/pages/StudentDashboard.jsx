import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { 
  Upload, FileText, Globe, Sparkles, Target, 
  Loader2, CheckCircle2, AlertCircle,
  BrainCircuit, Rocket, Layers, ShieldCheck, Info, X
} from 'lucide-react';
import apiClient from '../api/client';
import ReactMarkdown from 'react-markdown';

const StudentDashboard = () => {
  const { t } = useTranslation();
  const [resume, setResume] = useState(null);
  const [github, setGithub] = useState('');
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  const handleAnalyze = async () => {
    if (!resume || !jdText) {
      alert("Please upload a resume and paste a Job Description.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('github_username', github);
    formData.append('jd_text', jdText);

    try {
      const { data } = await apiClient.post('/students/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
    } catch (_err) {
      alert("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header section with vibrant gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 to-indigo-600 p-10 text-white shadow-2xl shadow-primary-500/20">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
               <Rocket size={24} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest uppercase opacity-80">Student Portal</span>
          </div>
          <h1 className="text-4xl font-black mb-2">{t('studentDash.career')}</h1>
          <p className="text-primary-100 max-w-xl text-lg">
            Our multi-agent neural network evaluates your profile against any JD. 
            Identify skill gaps and optimize for your dream role flawlessly.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Input Controls */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-primary-500" />
            {t('studentDash.configureAssessment')}
          </h2>
          
          <div className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-muted uppercase tracking-wider">{t('studentDash.resumePdf')}</label>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer bg-surface-dark/50 ${resume ? 'border-primary-500 bg-primary-500/5' : 'border-border hover:border-primary-500'}`}
                onClick={() => document.getElementById('resume-upload').click()}
              >
                <input 
                  id="resume-upload" 
                  type="file" 
                  hidden 
                  onChange={(e) => setResume(e.target.files[0])}
                  accept=".pdf"
                />
                {resume ? (
                  <div className="flex items-center gap-2 text-primary-400 font-bold">
                     <CheckCircle2 size={32} />
                     <span>{resume.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="text-text-muted mb-2" />
                    <span className="text-text-muted font-medium">{t('studentDash.dragResume')}</span>
                    <span className="text-xs text-text-muted mt-1 opacity-60">{t('studentDash.pdfOnly')}</span>
                  </>
                )}
              </div>
            </div>

            {/* GitHub Handle */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-muted uppercase tracking-wider">{t('studentDash.githubUsername')}</label>
              <div className="relative">
                <Globe className="absolute left-4 top-3.5 text-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="e.g. octocat" 
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="w-full bg-surface-dark border border-border rounded-xl py-3 pl-12 pr-4 text-white focus:border-primary-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Target JD */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-muted uppercase tracking-wider">{t('studentDash.targetJd')}</label>
              <textarea 
                rows={6}
                placeholder={t('studentDash.pasteJdPlaceholder')}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="w-full bg-surface-dark border border-border rounded-xl p-4 text-white focus:border-primary-500 outline-none transition-all text-sm leading-relaxed"
              />
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg shadow-primary-500/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
              {loading ? t('studentDash.synthesizing') : t('studentDash.triggerEvaluation')}
            </button>
          </div>
        </div>
      </div>

      {/* Results Modal / Full Screen Overlay */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-surface border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-surface-dark flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="bg-primary-500/20 p-2 rounded-xl">
                     <BrainCircuit className="text-primary-500" size={24} />
                  </div>
                  <div>
                     <h2 className="text-xl font-bold text-white tracking-tight">{t('studentDash.evaluationReport')}</h2>
                     <p className="text-xs text-text-muted font-mono uppercase tracking-[0.2em]">Profile Match Analysis</p>
                  </div>
               </div>
               <button 
                 onClick={() => setResult(null)} 
                 className="p-2 hover:bg-white/5 rounded-full transition-colors text-text-muted hover:text-white"
                 title="Close evaluation report"
               >
                  <X size={20} />
               </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Match Score & Gaps */}
                  <div className="space-y-6">
                     <div className="text-center p-8 bg-surface-dark rounded-3xl border border-border">
                        <div className="relative inline-block mb-4">
                           <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128" style={{ overflow: 'visible' }}>
                             <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border" />
                             <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="8" fill="transparent" 
                               strokeDasharray={314.16}
                               strokeDashoffset={314.16 - (314.16 * result.score) / 100}
                               className="text-primary-500" 
                             />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                             <span className="text-3xl font-black text-white">{result.score}%</span>
                             <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Match</span>
                           </div>
                        </div>
                        <h3 className="text-white font-bold mb-2">Aggregate Score</h3>
                     </div>

                     <div className="space-y-4">
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('studentDash.skillMatchDetails')}</h4>
                        <div className="flex flex-wrap gap-2">
                           {result.skill_gaps && result.skill_gaps.length > 0 ? (
                             result.skill_gaps.map((skill, i) => (
                               <span key={i} className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold">
                                 {skill}
                               </span>
                             ))
                           ) : (
                             <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-bold">
                               No major skill gaps identified!
                             </span>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Right Column: Tabbed evaluations */}
                  <div className="lg:col-span-2 space-y-6">
                     {/* Tabs Navigation */}
                     <div className="flex p-1 bg-surface-dark rounded-2xl border border-border">
                       {[
                         { id: 'summary', icon: Sparkles, label: 'Summary' },
                         { id: 'architect', icon: Layers, label: 'Architectural Audit' },
                         { id: 'culture', icon: ShieldCheck, label: 'Culture & Fit' },
                         { id: 'risk', icon: Info, label: 'Risk Analysis' }
                       ].map((tab) => (
                         <button
                           key={tab.id}
                           type="button"
                           onClick={() => setActiveTab(tab.id)}
                           className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all border ${activeTab === tab.id ? 'bg-surface border-border text-white shadow-lg' : 'bg-transparent border-transparent text-text-muted hover:text-text-main hover:bg-white/5'}`}
                         >
                           <tab.icon size={16} className={activeTab === tab.id ? (tab.id === 'architect' ? 'text-blue-400' : tab.id === 'culture' ? 'text-indigo-400' : tab.id === 'risk' ? 'text-red-400' : 'text-primary-400') : ''} />
                           {tab.label}
                         </button>
                       ))}
                     </div>

                      {/* Tab Contents */}
                      <div className="bg-surface-dark border border-border rounded-3xl p-8 min-h-[300px] text-sm text-text-muted leading-7">
                        {activeTab === 'summary' && result.summary && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            <h4 className="text-xl font-bold text-white tracking-tight mb-2">{t('studentDash.recommendations')}</h4>
                            <ReactMarkdown
                              components={{
                                strong: ({node: _node, ...props}) => <strong style={{ fontWeight: 700, color: '#fff' }} {...props} />,
                                p: ({node: _node, ...props}) => <p style={{ marginBottom: '12px', lineHeight: '1.7' }} {...props} />
                              }}
                            >
                              {result.summary}
                            </ReactMarkdown>
                          </div>
                        )}

                        {activeTab === 'architect' && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            <h4 className="text-xl font-bold text-white tracking-tight mb-2">Architectural Audit Outcome</h4>
                            <ReactMarkdown
                              components={{
                                strong: ({node: _node, ...props}) => <strong style={{ fontWeight: 700, color: '#fff' }} {...props} />,
                                p: ({node: _node, ...props}) => <p style={{ marginBottom: '12px', lineHeight: '1.7' }} {...props} />
                              }}
                            >
                              {result.breakdown?.evaluations?.architect || 'No architectural audit evaluation details available.'}
                            </ReactMarkdown>
                          </div>
                        )}

                        {activeTab === 'culture' && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            <h4 className="text-xl font-bold text-white tracking-tight mb-2">Culture & Fit Outcome</h4>
                            <ReactMarkdown
                              components={{
                                strong: ({node: _node, ...props}) => <strong style={{ fontWeight: 700, color: '#fff' }} {...props} />,
                                p: ({node: _node, ...props}) => <p style={{ marginBottom: '12px', lineHeight: '1.7' }} {...props} />
                              }}
                            >
                              {result.breakdown?.evaluations?.culture || 'No culture evaluation details available.'}
                            </ReactMarkdown>
                          </div>
                        )}

                        {activeTab === 'risk' && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            <h4 className="text-xl font-bold text-white tracking-tight mb-2">Risk Analysis Outcome</h4>
                            <ReactMarkdown
                              components={{
                                strong: ({node: _node, ...props}) => <strong style={{ fontWeight: 700, color: '#fff' }} {...props} />,
                                p: ({node: _node, ...props}) => <p style={{ marginBottom: '12px', lineHeight: '1.7' }} {...props} />
                              }}
                            >
                              {result.breakdown?.evaluations?.risk || 'No risk analysis evaluation details available.'}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                  </div>

               </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;
