import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi } from '../api/schedule';

export function useSchedulableCandidates(jobId) {
  return useQuery({
    queryKey: ['schedulable-candidates', jobId],
    queryFn: () => scheduleApi.getSchedulableCandidates(jobId),
    enabled: !!jobId && jobId !== 'null',
  });
}

export function useScheduleList(jobId) {
  return useQuery({
    queryKey: ['schedules', jobId],
    queryFn: () => scheduleApi.listSchedules(jobId),
    enabled: !!jobId && jobId !== 'null',
  });
}

export function useScheduleDetail(scheduleId) {
  return useQuery({
    queryKey: ['schedule-detail', scheduleId],
    queryFn: () => scheduleApi.getSchedule(scheduleId),
    enabled: !!scheduleId,
  });
}

export function useScheduleMutations() {
  const qc = useQueryClient();

  const createSchedule = useMutation({
    mutationFn: ({ jobId, payload }) => scheduleApi.createSchedule(jobId, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['schedules', variables.jobId] });
    }
  });

  const sendInvites = useMutation({
    mutationFn: (scheduleId) => scheduleApi.sendInvites(scheduleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-detail'] });
      qc.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const deleteSlot = useMutation({
    mutationFn: ({ scheduleId, slotId }) => scheduleApi.deleteSlot(scheduleId, slotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-detail'] });
      qc.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const deleteSchedule = useMutation({
    mutationFn: (scheduleId) => scheduleApi.deleteSchedule(scheduleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['schedule-detail'] });
    }
  });

  const updateSlotStatus = useMutation({
    mutationFn: ({ slotId, status }) => scheduleApi.updateSlotStatus(slotId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-detail'] });
    }
  });

  return { createSchedule, sendInvites, deleteSlot, deleteSchedule, updateSlotStatus };

}
