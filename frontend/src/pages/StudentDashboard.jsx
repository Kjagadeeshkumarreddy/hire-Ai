import React, { useState } from 'react';
import { 
  Upload, FileText, Globe, Sparkles, Target, 
  Loader2, CheckCircle2, AlertCircle,
  BrainCircuit, Rocket
} from 'lucide-react';
import apiClient from '../api/client';

const StudentDashboard = () => {
  const [resume, setResume] = useState(null);
  const [github, setGithub] = useState('');
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
    } catch (err) {
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
          <h1 className="text-4xl font-black mb-2">Architect Your Career</h1>
          <p className="text-primary-100 max-w-xl text-lg">
            Our multi-agent neural network evaluates your profile against any JD. 
            Identify skill gaps and optimize for your dream role flawlessly.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Input Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles size={20} className="text-primary-500" />
              Configure Assessment
            </h2>
            
            <div className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Resume (PDF)</label>
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
                      <span className="text-text-muted font-medium">Click or drag resume here</span>
                      <span className="text-xs text-text-muted mt-1 opacity-60">PDF format only</span>
                    </>
                  )}
                </div>
              </div>

              {/* GitHub Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-muted uppercase tracking-wider">GitHub Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Globe size={18} className="text-text-muted" />
                  </div>
                  <input 
                    type="text" 
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="e.g. jagadeeshkumar"
                    className="w-full pl-11 pr-4 py-3 bg-surface-dark border border-border rounded-xl text-black focus:outline-none focus:border-primary-500 transition-all font-mono text-sm"
                  />
                </div>
              </div>

              {/* JD Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Target Job Description</label>
                <div className="relative">
                   <div className="absolute top-4 left-4 pointer-events-none">
                    <FileText size={18} className="text-text-muted transition-colors" />
                  </div>
                  <textarea 
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the full JD text here..."
                    className="w-full min-h-[200px] pl-11 pr-4 py-3 bg-surface-dark border border-border rounded-xl text-black focus:outline-none focus:border-primary-500 transition-all text-sm resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary-600/20 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    Neural Synthesis in Progress...
                  </>
                ) : (
                  <>
                    <BrainCircuit size={24} />
                    Execute Agentic Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: Results Only */}
        <div className="space-y-6">
           {result ? (
             <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-right duration-500">
                <div className="p-6 bg-primary-900/20 border-b border-border flex items-center justify-between">
                   <h3 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                     <Target size={16} className="text-primary-500" />
                     Live Assessment
                   </h3>
                   <div className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full font-bold">NEW</div>
                </div>
                
                <div className="p-8 text-center space-y-4">
                  <div className="relative inline-block">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border" />
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray={364.4}
                        strokeDashoffset={364.4 - (364.4 * result.score) / 100}
                        className="text-primary-500 transition-all duration-1000 ease-out" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">{result.score}%</span>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Confidence</span>
                    </div>
                  </div>
                  
                  <div className="bg-surface-dark p-4 rounded-xl text-left border border-border">
                    <span className="text-xs font-bold text-primary-400 uppercase tracking-widest block mb-2">Executive Summary</span>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {result.summary}
                    </p>
                  </div>

                  <div className="space-y-2 text-left">
                     <span className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                       <AlertCircle size={14} />
                       Critical Skill Gaps
                     </span>
                     <div className="flex flex-wrap gap-2">
                        {result.skill_gaps?.map((gap, i) => (
                           <span key={i} className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-500/30">
                             {gap}
                           </span>
                        ))}
                     </div>
                  </div>
                </div>
             </div>
           ) : (
             <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4 border-dashed opacity-75">
                <div className="w-16 h-16 bg-border/50 rounded-full flex items-center justify-center mx-auto">
                   <Target className="text-text-muted" size={32} />
                </div>
                <div>
                   <h3 className="font-bold text-white">No Results Yet</h3>
                   <p className="text-sm text-text-muted px-4">Initialize an analysis to view your deep-dive assessment mapping flawlessly.</p>
                </div>
             </div>
           )}

           <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary-500/20 rounded-lg">
                   <BrainCircuit size={18} className="text-primary-400" />
                </div>
                <h3 className="font-bold text-white text-sm">Agentic Context</h3>
             </div>
             <p className="text-xs text-text-muted leading-relaxed italic opacity-80">
                Recent audits are now located in the global sidebar for faster access mapping flawlessy.
             </p>
           </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;
