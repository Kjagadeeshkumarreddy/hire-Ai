import apiClient from './client';

export const jdApi = {
  generate: async (payload) => {
    const { data } = await apiClient.post('/jd/generate', payload);
    return data;
  },

  getVersionHistory: async (jobId) => {
    const { data } = await apiClient.get(`/jd/${jobId}/versions`);
    return data;
  },

  approveVersion: async (jobId, version) => {
    const { data } = await apiClient.patch(`/jd/${jobId}/versions/${version}/approve`);
    return data;
  },

  rejectVersion: async (jobId, version) => {
    const { data } = await apiClient.patch(`/jd/${jobId}/versions/${version}/reject`);
    return data;
  },

  improve: async (jobId, feedback) => {
    const { data } = await apiClient.post(`/jd/${jobId}/improve`, { feedback });
    return data;
  },
  
  listJobs: async () => {
    const { data } = await apiClient.get('/jd/jobs');
    return data;
  },

  deleteJob: async (jobId) => {
    const { data } = await apiClient.delete(`/jd/${jobId}`);
    return data;
  },

  getJobContent: async (jobId) => {
    const { data } = await apiClient.get(`/jd/${jobId}/content`);
    return data;
  },

  getDashboardStats: async (jobId) => {
    const { data } = await apiClient.get('/jd/dashboard/stats', { params: { job_id: jobId } });
    return data;
  },

  getDashboardActivity: async (jobId) => {
    const { data } = await apiClient.get('/jd/dashboard/activity', { params: { job_id: jobId } });
    return data;
  },



  getOfferTemplate: async (jobId) => {
    const { data } = await apiClient.post(`/jd/${jobId}/offer-template`);
    return data;
  },

  refineOfferTemplate: async (jobId, currentHtml, feedback) => {
    const { data } = await apiClient.post(`/jd/${jobId}/offer-template/refine`, { current_html: currentHtml, feedback });
    return data;
  }
};
