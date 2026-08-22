import apiClient from './client';

export const scheduleApi = {
  /**
   * Create a new interview schedule with time slots for selected candidates.
   */
  createSchedule: async (jobId, payload) => {
    const { data } = await apiClient.post(`/schedule/${jobId}/create`, payload);
    return data;
  },

  /**
   * Preview available time slots without creating a schedule.
   */
  previewSlots: async (jobId, payload) => {
    const { data } = await apiClient.post(`/schedule/${jobId}/preview-slots`, payload);
    return data;
  },

  /**
   * Get all schedules for a job.
   */
  listSchedules: async (jobId) => {
    const { data } = await apiClient.get(`/schedule/${jobId}/list`);
    return data;
  },

  /**
   * Get full schedule details with all slots and candidate info.
   */
  getSchedule: async (scheduleId) => {
    const { data } = await apiClient.get(`/schedule/detail/${scheduleId}`);
    return data;
  },

  /**
   * Send email invitations to all candidates in a schedule.
   */
  sendInvites: async (scheduleId) => {
    const { data } = await apiClient.post(`/schedule/${scheduleId}/send-invites`);
    return data;
  },

  /**
   * Remove a candidate's slot from a schedule.
   */
  deleteSlot: async (scheduleId, slotId) => {
    const { data } = await apiClient.delete(`/schedule/${scheduleId}/slots/${slotId}`);
    return data;
  },

  /**
   * Delete an entire interview schedule.
   */
  deleteSchedule: async (scheduleId) => {
    const { data } = await apiClient.delete(`/schedule/${scheduleId}`);
    return data;
  },


  /**
   * Update the status of an interview slot.
   */
  updateSlotStatus: async (slotId, status) => {
    const { data } = await apiClient.patch(`/schedule/slots/${slotId}/status`, { status });
    return data;
  },

  /**
   * Get shortlisted candidates for scheduling.
   */
  getSchedulableCandidates: async (jobId) => {
    const { data } = await apiClient.get(`/schedule/${jobId}/candidates`);
    return data;
  }
};
