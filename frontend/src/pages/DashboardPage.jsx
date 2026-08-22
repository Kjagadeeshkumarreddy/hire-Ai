import React, { useState } from 'react';
import { Users, FileText, Activity, AlertCircle, Loader2, ChevronRight, Brain, CheckCircle2, Zap, Clock, Briefcase, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardStats, useDashboardActivity, useJobList } from '../hooks/useJD';

import { JobSelector } from '../components/common/JobSelector';

const ActivityIcon = ({ action }) => {
  switch (action) {
    case 'jd_generated': return <Brain size={16} className="text-primary-400" />;
    case 'jd_refined': return <Zap size={16} className="text-amber-400" />;
    case 'jd_approved': return <CheckCircle2 size={16} className="text-emerald-400" />;
    default: return <Activity size={16} className="text-blue-400" />;
  }
};


const StatCard = ({ title, value, icon: IconComponent, colorClass, isLoading }) => (
  <div className="glass-panel p-6 hover:-translate-y-1 transition-all duration-300 group hover:border-primary-500/30">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-black text-text-muted mb-1">{title}</p>
        {isLoading ? (
          <div className="h-9 w-20 bg-white/5 animate-pulse rounded-lg mt-1" />
        ) : (
          <h3 className="text-3xl font-black text-white">{value}</h3>
        )}
      </div>
      <div className={`p-4 rounded-2xl ${colorClass} group-hover:scale-110 transition-transform`}>
        <IconComponent size={24} className="text-white" />
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const [selectedJobId, setSelectedJobId] = useState(null);
  const { data: jobs } = useJobList();
  const { data: stats, isLoading } = useDashboardStats(selectedJobId);
  const { data: activityData, isLoading: isLoadingActivity } = useDashboardActivity(selectedJobId);

  const selectedJob = jobs?.find(j => j.id === selectedJobId);



  return (
    <div className="max-w-6xl mx-auto py-8 animation-fade-in">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              Global Engine Active
            </div>
            
            <JobSelector activeJobId={selectedJobId} onSelect={setSelectedJobId} showAllOption={true} />

          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            {selectedJob ? 'Project Overview' : 'Global Overview'}
          </h1>
          <p className="text-text-muted font-medium">
            {selectedJob 
              ? `Currently monitoring the hiring progress for ${selectedJob.title}.` 
              : "Welcome back! Here's what's happening across all your hiring pipelines."}
          </p>
        </div>

        <Link to="/jd" className="btn-primary flex items-center gap-2 px-6 py-3 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
          <FileText size={18} />
          Create New JD
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Active Candidates" 
          value={stats?.total_candidates?.toLocaleString() || '0'} 
          icon={Users} 
          isLoading={isLoading}
          colorClass="bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_8px_20px_rgba(59,130,246,0.3)]" 
        />
        <StatCard 
          title="Active Roles" 
          value={stats?.active_jobs || '0'} 
          icon={FileText} 
          isLoading={isLoading}
          colorClass="bg-gradient-to-br from-primary-500 to-primary-700 shadow-[0_8px_20px_rgba(var(--primary-rgb),0.3)]" 
        />
        <StatCard 
          title="Interviews Pending" 
          value={stats?.interviews_pending || '0'} 
          icon={Activity} 
          isLoading={isLoading}
          colorClass="bg-gradient-to-br from-purple-500 to-purple-700 shadow-[0_8px_20px_rgba(168,85,247,0.3)]" 
        />
        <StatCard 
          title="Action Required" 
          value={stats?.action_required || '0'} 
          icon={AlertCircle} 
          isLoading={isLoading}
          colorClass="bg-gradient-to-br from-rose-500 to-rose-700 shadow-[0_8px_20px_rgba(244,63,94,0.3)]" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Pipeline Activity</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">
              <span className="w-1 h-1 rounded-full bg-primary-500 animate-ping" />
              Live Stream
            </div>
          </div>
          
          <div className="min-h-[300px] space-y-4">
            {isLoadingActivity && (
              <div className="flex flex-col items-center justify-center h-64 border border-white/5 rounded-2xl bg-white/5">
                <Loader2 size={32} className="text-primary-500 animate-spin mb-4" />
                <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">Sinking with Neural Engine...</p>
              </div>
            )}

            {!isLoadingActivity && activityData?.activities?.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 border border-white/5 rounded-2xl bg-white/5">
                <Activity size={48} className="text-primary-500/10 mb-4" />
                <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">No recent signal detected</p>
              </div>
            )}

            {activityData?.activities?.map((activity, idx) => (
              <div key={activity.id} className="flex gap-4 group">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary-500/30 transition-colors">
                    <ActivityIcon action={activity.action} />
                  </div>
                  {idx !== activityData.activities.length - 1 && (
                    <div className="w-px h-full bg-gradient-to-b from-white/10 to-transparent my-2" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-white capitalize tracking-tight">
                      {activity.action.replace('_', ' ')}
                    </p>
                    <span className="text-[10px] text-text-muted font-medium flex items-center gap-1">
                      <Clock size={10} /> {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    AI engine processed role <span className="text-primary-400 font-bold uppercase">{activity.job_title}</span>
                    {activity.details?.version && ` as Version ${activity.details.version}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        
        <div className="glass-panel p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-white uppercase tracking-wider">HITL Tasks</h2>
            <Link to="/jd" className="text-primary-500 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
              View All <ChevronRight size={10} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {isLoading && [1, 2, 3].map(i => (
              <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-xl" />
            ))}
            
            {!isLoading && stats?.recent_approvals?.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-xs text-text-muted font-bold uppercase tracking-widest">No pending approvals</p>
              </div>
            )}

            {stats?.recent_approvals?.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 group-hover:border-primary-500/50 transition-colors">
                  <span className="text-primary-500 font-black text-xs uppercase">JD</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-white font-black text-xs truncate uppercase tracking-tight">{item.job_title}</p>
                  <p className="text-[8px] text-text-muted font-bold uppercase tracking-widest">Awaiting Approval • V{item.version}</p>
                </div>
                <Link 
                  to={`/upload?jobId=${item.job_id}`}
                  className="px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-500 text-[10px] font-black uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-all shadow-[0_4px_10px_rgba(var(--primary-rgb),0.1)] border border-primary-500/20"
                >
                  Action
                </Link>

              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
