import apiClient from './client';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const esignApi = {
   // HR: Create a signing request (sends email to candidate)
   createSigningRequest: async (savedOfferId, expiresInDays = 7) => {
      const { data } = await apiClient.post('/esign/request', {
         saved_offer_id: savedOfferId,
         expires_in_days: expiresInDays,
      });
      return data;
   },

   // HR: Check signature status
   getSignatureStatus: async (offerId) => {
      const { data } = await apiClient.get(`/esign/status/${offerId}`);
      return data;
   },

   // HR: Download signed PDF
   downloadSignedPdf: async (offerId) => {
      const response = await apiClient.get(`/esign/download/${offerId}`, {
         responseType: 'blob',
      });
      return response.data;
   },

   // PUBLIC: Get offer for signing (no auth needed)
   getOfferForSigning: async (token) => {
      const { data } = await axios.get(`${API_BASE}/esign/sign/${token}`);
      return data;
   },

   // PUBLIC: Submit signature (no auth needed)
   submitSignature: async (token, signatureData) => {
      const { data } = await axios.post(`${API_BASE}/esign/sign/${token}/submit`, signatureData);
      return data;
   },

   // HR: List all signature requests
   getSignaturesList: async () => {
      const { data } = await apiClient.get('/esign/list');
      return data;
   },

   // HR: Submit counter-signature
   hrSubmitSignature: async (signatureId, signatureData) => {
      const { data } = await apiClient.post(`/esign/hr-sign/${signatureId}`, signatureData);
      return data;
   },
};
