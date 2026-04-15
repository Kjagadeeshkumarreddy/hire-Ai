import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { JDForm } from '../components/jd/JDForm';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Sparkles, MessageSquare, Loader2, Upload } from 'lucide-react';
import { useJDMutations } from '../hooks/useJD';

const JDBuilderPage = () => {
  const [jdData, setJdData] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);
  const { improveJD } = useJDMutations();
  const navigate = useNavigate();

  const handleCopy = () => {
    if (jdData?.content) {
      navigator.clipboard.writeText(jdData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefine = () => {
    if (!feedback.trim() || !jdData?.job_id) return;
    
    improveJD.mutate({ jobId: jdData.job_id, feedback }, {
      onSuccess: (newData) => {
        setJdData(newData);
        setFeedback('');
      }
    });
  };

  return (
    <div className="h-full flex flex-col animation-fade-in">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-4xl font-bold text-white mb-2">Job Description Builder</h1>
        <p className="text-text-muted text-lg">Use the Groq-powered AI pipeline to structure performant, bias-free descriptions.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
        {/* Parameters Section */}
        <div className="flex flex-col h-full min-h-0 space-y-6">
          <div className="flex flex-col min-h-0">
            <h2 className="text-xl font-bold text-white mb-4 flex-shrink-0 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm">01</span>
              Pipeline Parameters
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <JDForm onGenerated={setJdData} />
            </div>
          </div>

          {/* New Refinement Panel flawlessy */}
          {jdData && (
            <div className="flex flex-col min-h-0 animation-slide-up">
              <h2 className="text-xl font-bold text-white mb-4 flex-shrink-0 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm">03</span>
                Refinement Feedback
              </h2>
              <div className="glass-panel p-6 space-y-4">
                <div className="relative">
                  <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="e.g. 'Add more focus on system design' or 'Mention our remote culture'..."
                    rows={4}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 text-sm placeholder:text-text-muted/50 transition-all"
                  />
                  <div className="absolute top-3 right-3 opacity-20 hover:opacity-100 transition-opacity">
                    <MessageSquare size={16} className="text-primary-500" />
                  </div>
                </div>
                <button 
                  onClick={handleRefine}
                  disabled={improveJD.isPending || !feedback.trim()}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {improveJD.isPending ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <><Sparkles size={18} /> Refine with AI</>
                  )}
                </button>
                {jdData.version > 1 && (
                  <p className="text-[10px] text-center text-primary-500 font-bold uppercase tracking-widest">
                    Showing version {jdData.version}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Preview Section */}
        <div className="flex flex-col h-full min-h-0">
          <h2 className="text-xl font-bold text-white mb-4 flex-shrink-0 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm">02</span>
            Live Preview
          </h2>
          
          <div className="relative flex-1 glass-panel border-dashed overflow-hidden flex flex-col min-h-0">
            {jdData && (
              <button 
                onClick={handleCopy}
                className="absolute top-4 right-8 z-10 p-2 bg-background/80 hover:bg-background border border-border rounded-lg text-text-muted hover:text-primary-500 transition-all flex items-center gap-2 text-xs shadow-lg backdrop-blur"
              >
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy to Clipboard</>}
              </button>
            )}

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {jdData ? (
                <div className="space-y-8">
                  <div className="prose prose-invert max-w-none prose-pre:bg-background-dark prose-headings:text-white prose-p:text-text-muted prose-strong:text-white">
                    <ReactMarkdown>{jdData.content}</ReactMarkdown>
                  </div>
                  
                  <div className="pt-8 border-t border-border flex flex-col items-center">
                    <button 
                      onClick={() => navigate(`/upload?jobId=${jdData.job_id}`)}
                      className="group flex flex-col items-center gap-3 w-full"
                    >
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent mb-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="bg-primary-500 hover:bg-primary-600 text-background font-bold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] transition-all flex items-center gap-3 group-hover:scale-105">
                        Finalize & Upload Candidates
                        <Upload size={20} />
                      </div>
                      <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-medium">Proceed to Agentic Ingestion</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Copy className="text-white/10" size={32} />
                  </div>
                  <span className="text-text-muted tracking-wide text-sm max-w-[200px]">
                    Configure parameters and click 'Generate' to see the JD content here.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JDBuilderPage;
