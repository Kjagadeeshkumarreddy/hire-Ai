import { create } from 'zustand';
import Cookies from 'js-cookie';
import apiClient from '../api/client';

export const useAuthStore = create((set) => ({
  token: Cookies.get('access_token') || null,
  user: null, // Depending on complexity, user details might also be fetched or cached.
  
  // Registration hook dynamically injecting payloads to Postgres
  registerUser: async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload);
    return data;
  },

  fetchUser: async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      set({ user: data });
    } catch (err) {
      // If token is invalid or expired, clear state to force login
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      set({ token: null, user: null });
    }
  },

  login: (access_token, refresh_token, user_data) => {
    // 24 Hour expiry loosely mapped in browser cookie limits roughly matching backend boundaries
    Cookies.set('access_token', access_token, { expires: 1, secure: false }); 
    // 7 Days defined on refresh natively
    Cookies.set('refresh_token', refresh_token, { expires: 7, secure: false });
    
    set({ token: access_token, user: user_data });
  },
  
  logout: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    set({ token: null, user: null });
    window.location.href = '/login';
  },

  updateEmail: async (current_password, new_email) => {
    const { data } = await apiClient.patch('/auth/email', { current_password, new_email });
    set((state) => ({ user: { ...state.user, email: data.new_email } }));
    return data;
  },

  deleteAccount: async () => {
    // Structural termination across the backend
    await apiClient.delete('/auth/me');
    
    // Cleanup local state
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    set({ token: null, user: null });
    window.location.href = '/login';
  }
}));
