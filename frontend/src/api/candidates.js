import apiClient from './client';

export const candidateApi = {
  uploadBatch: async (jobId, { excelFile, zipFile }) => {
    const formData = new FormData();
    formData.append('excel_file', excelFile);
    formData.append('zip_file', zipFile);
    
    const { data } = await apiClient.post(`/candidates/${jobId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  list: async (jobId) => {
    const { data } = await apiClient.get(`/candidates/${jobId}/list`);
    return data;
  },

  getSummaryCards: async (jobId) => {
    const { data } = await apiClient.get(`/candidates/${jobId}/summary-cards`);
    return data;
  },

  getDetail: async (candidateId) => {
    const { data } = await apiClient.get(`/candidates/${candidateId}`);
    return data;
  },

  toggleShortlist: async (candidateId) => {
    const { data } = await apiClient.patch(`/candidates/${candidateId}/shortlist`);
    return data;
  },

  investigate: async (candidateId) => {
    const { data } = await apiClient.post(`/candidates/${candidateId}/investigate`);
    return data;
  },

  compare: async (jobId, candidateIds) => {
    const { data } = await apiClient.post(`/candidates/${jobId}/compare`, { candidate_ids: candidateIds });
    return data;
  },

  bulkInvestigate: async (jobId) => {
    const { data } = await apiClient.post(`/candidates/${jobId}/bulk-investigate`);
    return data;
  },

  getEmailDraft: async (candidateId) => {
    const { data } = await apiClient.get(`/candidates/${candidateId}/email-draft`);
    return data;
  },

  sendEmail: async (candidateId, { subject, body }) => {
    const { data } = await apiClient.post(`/candidates/${candidateId}/send-email`, { subject, body });
    return data;
  },

  getQuestions: async (candidateId, category = 'technical') => {
    const { data } = await apiClient.get(`/candidates/${candidateId}/questions`, { params: { category } });
    return data;
  },

  generateQuestions: async (candidateId, category = 'technical') => {
    const { data } = await apiClient.post(`/candidates/${candidateId}/questions`, null, { params: { category } });
    return data;
  },

  promote: async (jobId, { candidateIds, roundName }) => {
    const { data } = await apiClient.post(`/candidates/${jobId}/promote`, candidateIds, {
      params: { round_name: roundName }
    });
    return data;
  },

  sendOfferLetter: async (candidateId, payload) => {
    const { data } = await apiClient.post(`/candidates/${candidateId}/send-offer`, payload);
    return data;
  },
  
  saveOfferProgress: async (candidateId, payload) => {
    const { data } = await apiClient.post(`/candidates/${candidateId}/offer/save`, payload);
    return data;
  },

  getSavedOffers: async () => {
    const { data } = await apiClient.get('/candidates/offers/saved');
    return data;
  }
};
