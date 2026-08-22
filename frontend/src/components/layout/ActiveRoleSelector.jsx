import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, ChevronDown, Check } from 'lucide-react';
import { useJobStore } from '../../stores/jobStore';
import apiClient from '../../api/client';

const ActiveRoleSelector = () => {
  const { t } = useTranslation();
  const { activeJobId, activeJobTitle, jobs, setJobs, setActiveJob } = useJobStore();
  const [isOpen, setIsOpen] = useState(false);
  const [_loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get('/jd/jobs');
        setJobs(data);
        if (!activeJobId && data.length > 0) {
          setActiveJob(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch jobs', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [activeJobId, setJobs, setActiveJob]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-[#111112] border border-white/5 hover:border-primary-500/30 px-4 py-2 rounded-2xl transition-all group"
      >
        <div className="p-2 bg-primary-500/10 rounded-xl group-hover:bg-primary-500/20 transition-colors">
          <Briefcase size={20} className="text-primary-500" />
        </div>
        <div className="text-left min-w-[150px] max-w-[350px]">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none mb-1">{t('jobSelector.activeRole')}</p>
          <p className="text-sm font-bold text-white truncate">{activeJobTitle}</p>
        </div>
        <ChevronDown size={18} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-max min-w-[320px] max-w-md bg-[#111112] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
              {jobs.length === 0 ? (
                <div className="p-4 text-center text-text-muted text-sm">{t('activeRoleSelector.noOfferStage')}</div>
              ) : (
                jobs
                  .filter(job => job.status === 'offer' || job.title.toLowerCase().includes('generate offer'))
                  .map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setActiveJob(job);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      activeJobId === job.id 
                        ? 'bg-primary-500/10 text-primary-500' 
                        : 'text-text-muted hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="text-left overflow-hidden">
                      <p className="font-semibold text-sm truncate">{job.title}</p>
                      <p className="text-[10px] opacity-60 truncate">{job.department || t('candidateDash.general')}</p>
                    </div>
                    {activeJobId === job.id && <Check size={16} />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ActiveRoleSelector;
