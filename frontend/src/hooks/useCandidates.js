import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidates';

export function useCandidateList(jobId) {
  return useQuery({
    queryKey: ['candidates', jobId],
    queryFn: () => candidateApi.list(jobId),
    enabled: !!jobId && jobId !== 'null',
    // Keep data fresh during SSE updates by polling or relying on query invalidation
  });
}

export function useCandidateMutations() {
  const qc = useQueryClient();
  
  const uploadBatch = useMutation({
    mutationFn: ({ jobId, zipFile, excelFile }) => candidateApi.uploadBatch(jobId, { excelFile, zipFile }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['candidates', variables.jobId] });
    }
  });

  const toggleShortlist = useMutation({
    mutationFn: candidateApi.toggleShortlist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] });
    }
  });

  const bulkInvestigate = useMutation({
    mutationFn: (jobId) => candidateApi.bulkInvestigate(jobId),
    onSuccess: (_, jobId) => {
      qc.invalidateQueries({ queryKey: ['candidates', jobId] });
    }
  });

  const sendEmail = useMutation({
    mutationFn: ({ candidateId, subject, body }) => candidateApi.sendEmail(candidateId, { subject, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] });
    }
  });

  return { uploadBatch, toggleShortlist, bulkInvestigate, sendEmail };
}

export function useEmailDraft(candidateId) {
  return useQuery({
    queryKey: ['email_draft', candidateId],
    queryFn: () => candidateApi.getEmailDraft(candidateId),
    enabled: !!candidateId,
    staleTime: 0, // Always regenerate on request flawlessly
  });
}
