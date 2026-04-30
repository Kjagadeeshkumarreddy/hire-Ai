import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../api/client';
import { Network, Lock, User, Loader2, Briefcase } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('hr');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setLogin = useAuthStore(state => state.login);

  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { data } = await apiClient.post('/auth/login', {
          email,
          password,
          role
      });

      // Synchronously route access arrays back into zustand and js-cookie securely
      setLogin(data.access_token, data.refresh_token, data.user);
      navigate('/');
    } catch (err) {
      console.error("Login Error Context:", err);
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (err.response?.data?.message || err.message);
      setError(message || "Structurally deficient login matrix.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background font-sans">
      
      {/* Left Interface */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-surface border-r border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <Network size={200} />
        </div>
        <div className="z-10 mt-12">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-8 shadow-lg shadow-primary-500/20">
 	     <Network className="text-white" size={32} />
 	   </div>
           <h1 className="text-4xl font-black text-white leading-tight mb-4">
             AI-Powered <br/> Hiring Architecture
           </h1>
           <p className="text-text-muted text-lg max-w-md">
             A LangGraph orchestrated platform analyzing granular engineering candidates free from implicit systemic bias matrices.
           </p>
        </div>
      </div>

      {/* Right Login Box */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-24 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-text-muted">Enter your administrative credentials to continue.</p>
          </div>

          {error && (
             <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg flex items-center justify-center">
               {error}
             </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-text-muted" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors placeholder:text-text-muted/50" 
                  placeholder="admin@hiring.ai"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Target Context Role</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase size={18} className="text-text-muted" />
                </div>
                <select 
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none" 
                >
                  <option value="student">Student (Candidate View)</option>
                  <option value="hr">HR Manager (Recruitment View)</option>
                  <option value="admin">System Admin (Oversight View)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-text-muted" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors placeholder:text-text-muted/50" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 mt-4 text-base font-bold transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : "Authenticate to Grid"}
            </button>
            
            <div className="mt-6 text-center text-sm text-text-muted">
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className="text-primary-500 font-bold hover:text-white transition-colors"
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
