import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { candidateApi } from '../api/candidates';
import { Loader2 } from 'lucide-react';

const ComparisonPage = () => {
  const { t } = useTranslation();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, IDs would be passed via Zustand or URL params. Loading all scored for simplicity here.
    candidateApi.list('default-job').then(data => {
      setCandidates(data.filter(c => c.pipeline_status === 'scored').slice(0, 3));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin text-primary-500" /> {t('comparison.loadingMatrix')}</div>;

  return (
    <div className="max-w-7xl mx-auto animation-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t('comparison.multiCandidate')}</h1>
        <p className="text-text-muted">{t('comparison.sideAnalysis')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {candidates.map(candidate => (
          <div key={candidate.id} className="glass-panel p-6 flex flex-col items-center">
            <h2 className="text-xl font-bold text-white mb-4 text-center">{candidate.full_name}</h2>
            
            <div className="w-full bg-surface/50 rounded-xl p-4 mb-6 text-center">
              <span className="text-sm text-text-muted block mb-1">{t('comparison.overallMatch')}</span>
              <span className="text-4xl font-black text-primary-500">{candidate.scores?.total_score || 0}</span>
            </div>

            <div className="w-full mb-6 space-y-3">
               <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 text-center opacity-50">{t('comparison.matchBreakdown')}</h3>
                {candidate.scores && Object.entries(candidate.scores).map(([key, val]) => (
                  key !== 'total_score' && typeof val === 'number' && (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        <span className="capitalize">{key}</span>
                        <span className="text-white">{val}%</span>
                      </div>
                      <div className="h-1 w-full bg-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full" 
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  )
                ))}
            </div>

            <div className="w-full text-left space-y-4">
               <div>
                 <h4 className="text-sm text-text-muted font-bold mb-1">{t('comparison.githubMetrics')}</h4>
                 <p className="text-white text-sm bg-surface p-3 rounded">
                   {candidate.github_data?.public_repos || 0} Repositories
                 </p>
               </div>
               {candidate.risk_flags?.length > 0 && (
                 <div>
                   <h4 className="text-sm text-orange-500 font-bold mb-1">{t('comparison.riskFlags')}</h4>
                   <ul className="text-sm text-text-muted list-disc pl-4 space-y-1">
                     {candidate.risk_flags.map((f, i) => <li key={i}>{f}</li>)}
                   </ul>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComparisonPage;
