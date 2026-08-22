import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { ChevronDown, Briefcase, Eye, Trash2, X } from 'lucide-react';
import { useJobList, useJDMutations } from '../../hooks/useJD';
import { jdApi } from '../../api/jd';
import ReactMarkdown from 'react-markdown';

export const JobSelector = ({ activeJobId, onSelect, filterType = 'all', showAllOption = false, hideSubRoles = false }) => {
  const { t } = useTranslation();
  const { data: jobs = [], isLoading } = useJobList();
  const { deleteJob } = useJDMutations();
  const activeJob = jobs.find(j => j.id === activeJobId);
  const filteredJobs = jobs.filter(job => {
    if (filterType === 'offer') {
      return job.status === 'offer' || 
             job.title.toLowerCase().includes('generate offer') || 
             job.title.toLowerCase().includes('offer letter');
    }
    if (filterType === 'interview') {
      return job.status !== 'offer' && 
             job.status !== 'archived' && 
             !job.title.toLowerCase().includes('generate offer') && 
             !job.title.toLowerCase().includes('offer letter');
    }
    return true;
  }).filter(job => {
    if (!hideSubRoles) return true;
    const titleLower = job.title.toLowerCase();
    const isSubRole = titleLower.includes(' - technical') || 
                      titleLower.includes(' - round') ||
                      jobs.some(other => job.id !== other.id && titleLower.startsWith(other.title.toLowerCase() + ' - '));
    return !isSubRole;
  });

  const [viewingJD, setViewingJD] = useState(null); // stores { title, content }
  const [isViewing, setIsViewing] = useState(false);

  const handleViewJD = async (e, job) => {
    e.stopPropagation();
    try {
      const data = await jdApi.getJobContent(job.id);
      setViewingJD({ title: job.title, content: data.content });
      setIsViewing(true);
    } catch (err) {
      console.error("Failed to fetch JD content", err);
    }
  };

  const handleDelete = async (e, jobId, jobTitle) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the job "${jobTitle}"? This will also remove all candidate data associated with it flawlessy.`)) {
      try {
        await deleteJob.mutateAsync(jobId);
        if (activeJobId === jobId) {
          onSelect(null); // Clear selection if active job deleted
        }
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
  };

  return (
    <div className="relative group min-w-[240px]">
      <div className="flex items-center gap-3 px-4 py-2 bg-surface/50 border border-white/10 rounded-xl hover:border-primary-500/50 transition-all cursor-pointer backdrop-blur-md">
        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
          <Briefcase size={18} />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">{t('jobSelector.activeRole')}</p>
          <p className="text-sm font-bold text-white whitespace-normal leading-tight mt-0.5">
            {isLoading ? t('jobSelector.loadingRoles') : activeJob?.title || t('jobSelector.selectRole')}
          </p>
        </div>
        <ChevronDown size={16} className="text-text-muted group-hover:text-primary-500 transition-colors" />
      </div>

      <div className="absolute top-full left-0 mt-3 w-max min-w-full max-w-md premium-glass rounded-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform origin-top group-hover:translate-y-0 translate-y-2">
        {filteredJobs.length === 0 && !isLoading && (
          <div className="p-6 text-center">
            <p className="text-xs text-text-muted mb-2">{t('jobSelector.noActiveJobs')}</p>
            <a href="/jd" className="text-xs text-primary-500 font-bold hover:underline">{t('jobSelector.createFirstJD')}</a>
          </div>
        )}
        
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {/* Global 'All Roles' option flawlessy */}
          {showAllOption && (
            <div 
              onClick={() => onSelect(null)}
              className={`w-full text-left px-5 py-4 flex items-center justify-between transition-all duration-300 border-b border-white/5 cursor-pointer relative group/item 
                ${!activeJobId ? 'job-active-gradient' : 'hover:bg-white/[0.03]'}`}
            >
              <div className="flex-1">
                <p className={`text-base font-bold tracking-tight lowercase ${!activeJobId ? 'text-primary-500' : 'text-white/90'}`}>
                  {t('jobSelector.allActiveRoles')}
                </p>
                <p className="text-[10px] text-text-muted/60 font-black uppercase tracking-[0.2em] mt-0.5">
                  {t('jobSelector.globalContext')}
                </p>
              </div>
              {!activeJobId && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_12px_#14b8a6] animate-pulse" />
              )}
            </div>
          )}

          {filteredJobs.map(job => (
            <div 
              key={job.id}
              onClick={() => onSelect(job.id)}
              className={`w-full text-left px-5 py-4 flex items-center justify-between transition-all duration-300 border-b border-white/5 last:border-none cursor-pointer relative group/item 
                ${activeJobId === job.id ? 'job-active-gradient' : 'hover:bg-white/[0.03]'}`}
            >
              <div className="flex-1 mr-4">
                <p className={`text-base font-bold tracking-tight lowercase ${activeJobId === job.id ? 'text-primary-500' : 'text-white/90'} whitespace-normal leading-tight`}>
                  {job.title}
                </p>
                <p className="text-[10px] text-text-muted/60 font-black uppercase tracking-[0.2em] mt-0.5">
                  {job.department || t('candidateDash.general')}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={(e) => handleViewJD(e, job)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted/50 hover:text-white transition-all scale-90"
                    title="View JD"
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, job.id, job.title)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted/50 hover:text-red-400 transition-all scale-90"
                    title="Delete Job"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {activeJobId === job.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_12px_#14b8a6,0_0_20px_#14b8a6] ml-1 flex-shrink-0 animate-pulse" />
                )}
              </div>
              
              {/* Highlight bar for active job flawlessy */}
              {activeJobId === job.id && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* View JD Modal flawlessy */}
      {isViewing && viewingJD && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animation-fade-in">
          <div className="glass-panel w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border-white/20">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <Briefcase className="text-primary-500" size={20} />
                <h3 className="text-lg font-bold text-white">{viewingJD.title}</h3>
              </div>
              <button 
                onClick={() => setIsViewing(false)}
                className="p-2 hover:bg-white/10 rounded-full text-text-muted hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/40">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{viewingJD.content}</ReactMarkdown>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
              <button 
                onClick={() => setIsViewing(false)}
                className="btn-secondary text-xs"
              >
                {t('jobSelector.closeView')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
