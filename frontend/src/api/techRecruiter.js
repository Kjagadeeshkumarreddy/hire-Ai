import apiClient from './client';

export const techRecruiterApi = {
  // HR-facing
  generate: (jobId, maxMarks, email) =>
    apiClient.post('/tech-recruiter/generate', { job_id: jobId, max_marks: maxMarks, email }).then(r => r.data),

  list: () =>
    apiClient.get('/tech-recruiter/list').then(r => r.data),

  revoke: (credentialId) =>
    apiClient.delete(`/tech-recruiter/${credentialId}/revoke`).then(r => r.data),

  cleanup: () =>
    apiClient.delete('/tech-recruiter/cleanup').then(r => r.data),

  getMarksForJob: (jobId) =>
    apiClient.get(`/tech-recruiter/marks/${jobId}/all`).then(r => r.data),

  // Category management (HR)
  saveCategories: (jobId, categories) =>
    apiClient.post(`/tech-recruiter/categories/${jobId}`, { categories }).then(r => r.data),

  getCategories: (jobId) =>
    apiClient.get(`/tech-recruiter/categories/${jobId}`).then(r => r.data),

  // Tech Recruiter-facing
  getMyCredential: () =>
    apiClient.get('/tech-recruiter/me/credential').then(r => r.data),

  getCandidates: () =>
    apiClient.get('/tech-recruiter/candidates').then(r => r.data),

  getCandidateQuestions: (candidateId) =>
    apiClient.get(`/tech-recruiter/candidates/${candidateId}/questions`).then(r => r.data),

  generateCandidateQuestions: (candidateId, category = 'technical', force = false) =>
    apiClient.post(`/tech-recruiter/candidates/${candidateId}/questions?category=${category}&force=${force}`).then(r => r.data),

  submitMarks: (candidateId, marksObtained, remarks) =>
    apiClient.post(`/tech-recruiter/candidates/${candidateId}/marks`, {
      marks_obtained: marksObtained,
      remarks: remarks || null
    }).then(r => r.data),

  submitCategoryMarks: (candidateId, categoryMarks, remarks) =>
    apiClient.post(`/tech-recruiter/candidates/${candidateId}/category-marks`, {
      category_marks: categoryMarks,
      remarks: remarks || null
    }).then(r => r.data),

  getMyMarks: () =>
    apiClient.get('/tech-recruiter/my-marks').then(r => r.data),
};
