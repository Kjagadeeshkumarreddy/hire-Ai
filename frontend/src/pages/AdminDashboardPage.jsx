import { useTranslation } from 'react-i18next';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, UserCheck, Activity, Database, Server, BarChart3, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client';

const StatCard = ({ title, value, icon: IconComponent, color, subtitle }) => (
  <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl shadow-black/20 group hover:border-primary-500/30 transition-all duration-300">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-white">{value}</h3>
        {subtitle && <p className="text-[10px] text-text-muted font-medium italic">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-500 shadow-lg shadow-${color.split('-')[1]}-500/10 group-hover:scale-110 transition-transform`}>
        <IconComponent size={24} />
      </div>
    </div>
  </div>
);

const AdminDashboardPage = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/stats');
      return response.data;
    },
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-xs font-black text-text-muted uppercase tracking-tighter animate-pulse">Syncing Platform Metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
        <p className="text-red-500 font-bold">Failed to retrieve administrative oversight data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary-500">
            <ShieldCheck size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Administrative Oversight</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">{t('adminDash.title')}</h1>
          <p className="text-text-muted">Real-time telemetry from the PostgreSQL and LangGraph matrices.</p>
        </div>
        <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-surface border border-border rounded-xl">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
             <span className="text-[10px] font-bold text-text-muted uppercase">System Nominal</span>
           </div>
           <div className="w-px h-4 bg-border" />
           <div className="text-[10px] font-bold text-text-muted uppercase">Latency: 24ms</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Operators" 
          value={stats.users.total} 
          icon={Users} 
          color="bg-primary-500"
          subtitle={`${stats.users.breakdown.admin || 0} Admins | ${stats.users.breakdown.hr || 0} HRs`}
        />
        <StatCard 
          title="Active Pipelines" 
          value={stats.hiring.active_jobs} 
          icon={Briefcase} 
          color="bg-blue-500"
          subtitle={`Out of ${stats.hiring.total_jobs} total JDs`}
        />
        <StatCard 
          title="Ingested Profiles" 
          value={stats.hiring.total_candidates} 
          icon={UserCheck} 
          color="bg-purple-500"
          subtitle="Across all active campaigns"
        />
        <StatCard 
          title="System Flux" 
          value="99.9%" 
          icon={Activity} 
          color="bg-green-500"
          subtitle="Uptime persistence mapping"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-border bg-gradient-to-r from-surface to-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                 <BarChart3 size={20} />
               </div>
               <h3 className="font-bold text-white">Resource Distribution</h3>
            </div>
          </div>
          <div className="p-8 h-64 flex items-center justify-center border-b border-border/50">
             <div className="flex flex-col items-center gap-2 opacity-30 text-text-muted">
               <Database size={48} />
               <p className="text-xs font-bold uppercase tracking-widest">Telemetry Visualization Pending</p>
             </div>
          </div>
          <div className="p-4 bg-background/30 grid grid-cols-3 divide-x divide-border">
             <div className="px-4 py-2 text-center">
               <p className="text-[10px] font-bold text-text-muted uppercase mb-1">DB Load</p>
               <p className="text-sm font-black text-white">4.2%</p>
             </div>
             <div className="px-4 py-2 text-center">
               <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Queue Depth</p>
               <p className="text-sm font-black text-white">0</p>
             </div>
             <div className="px-4 py-2 text-center">
               <p className="text-[10px] font-bold text-text-muted uppercase mb-1">API Throughput</p>
               <p className="text-sm font-black text-white">12/s</p>
             </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-2xl">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Server size={18} className="text-primary-500" />
            System Health
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-text-muted uppercase">
                <span>Database Connectivity</span>
                <span className="text-green-500">Nominal</span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-text-muted uppercase">
                <span>Redis Persistence</span>
                <span className="text-green-500">Nominal</span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-text-muted uppercase">
                <span>Groq API Latency</span>
                <span className="text-yellow-500">Elevated (1.2s)</span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-[60%]" />
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border">
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-all uppercase tracking-widest">
              Refresh Diagnostics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
