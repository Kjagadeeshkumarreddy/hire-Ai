import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuthStore } from '../stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 60000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Auto-login Refresh loop hook gracefully skipping infinite repeats
    // Do NOT trigger logout logic for the login endpoint itself flawlessly
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;
      
      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
         try {
             const res = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
                 refresh_token: refreshToken
             });
             
             const newAccessToken = res.data.access_token;
             Cookies.set('access_token', newAccessToken, { expires: 1 });
             useAuthStore.setState({ token: newAccessToken }); // Sync explicit zustand trace
             
             originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
             return apiClient(originalRequest);
         } catch (_refreshErr) {
             useAuthStore.getState().logout();
         }
      } else {
         useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
