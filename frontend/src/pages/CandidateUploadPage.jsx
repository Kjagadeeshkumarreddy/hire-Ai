import { useTranslation } from 'react-i18next';
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { UploadZone } from '../components/candidates/UploadZone';
import { usePipelineStore } from '../stores/pipelineStore';
import { JobSelector } from '../components/common/JobSelector';

const CandidateUploadPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobIdFromUrl = searchParams.get('jobId');
  const [selectedJobId, setSelectedJobId] = React.useState(jobIdFromUrl || localStorage.getItem('activeJobId') || '');
  const { progress } = usePipelineStore();

  const handleJobSelect = (id) => {
    setSelectedJobId(id);
    setSearchParams({ jobId: id });
    localStorage.setItem('activeJobId', id);
  };
  
  return (
    <div className="max-w-5xl mx-auto animation-fade-in">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('upload.langGraphSync')}</h1>
          <p className="text-text-muted">{t('upload.uploadDescription')}</p>
        </div>
        <div className="shrink-0">
          <p className="text-[10px] uppercase tracking-widest font-black text-primary-500 mb-2">{t('upload.targetJDContext')}</p>
          <JobSelector activeJobId={selectedJobId} onSelect={handleJobSelect} filterType="interview" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <UploadZone jobId={selectedJobId} />
        
        {progress.status === 'running' && (
          <div className="glass-panel p-6 border-l-4 border-primary-500">
            <h2 className="text-lg font-bold text-white mb-2">{t('upload.liveProgressStreaming')}</h2>
            <div className="flex items-center justify-between text-sm text-text-muted mb-4">
              <span>Step: <span className="text-white capitalize">{progress.current_step.replace('_', ' ')}</span></span>
              <span>{progress.processed} / {progress.total} Parsed</span>
            </div>
            <div className="w-full bg-border rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${(progress.processed / Math.max(progress.total, 1)) * 100}%` }} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateUploadPage;
