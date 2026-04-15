import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jdApi } from '../api/jd';

export function useJDHistory(jobId) {
  return useQuery({
    queryKey: ['jd_versions', jobId],
    queryFn: () => jdApi.getVersionHistory(jobId),
    enabled: !!jobId,
  });
}

export function useJobList() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: jdApi.listJobs,
  });
}

export function useDashboardStats(jobId) {
  return useQuery({
    queryKey: ['dashboard_stats', jobId],
    queryFn: () => jdApi.getDashboardStats(jobId),
    refetchInterval: 30000, // Refresh every 30 seconds flawlessly
  });
}

export function useDashboardActivity(jobId) {
  return useQuery({
    queryKey: ['dashboard_activity', jobId],
    queryFn: () => jdApi.getDashboardActivity(jobId),
    refetchInterval: 15000, // Activity feed refreshes faster for realism
  });
}



export function useJDMutations() {
  const qc = useQueryClient();
  
  const generateJD = useMutation({
    mutationFn: jdApi.generate,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['jd_versions', data.job_id] });
    }
  });

  const approveVersion = useMutation({
    mutationFn: ({ jobId, version }) => jdApi.approveVersion(jobId, version),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['jd_versions', vars.jobId] });
    }
  });

  const improveJD = useMutation({
    mutationFn: ({ jobId, feedback }) => jdApi.improve(jobId, feedback),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['jd_versions', data.job_id] });
    }
  });

  const deleteJob = useMutation({
    mutationFn: jdApi.deleteJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
    }
  });

  return { generateJD, approveVersion, improveJD, deleteJob };
}
