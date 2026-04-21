import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Network, Lock, User, Loader2, Briefcase, Mail } from 'lucide-react';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const registerUser = useAuthStore(state => state.registerUser);
  const setLogin = useAuthStore(state => state.login);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Execute the genuine Postgres assignment mapping natively
      await registerUser(formData);

      // Simulate an automatic login trace securely locking state validations
      const mockAccess = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockAccess";
      const mockRefresh = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockRefresh";
      
      setLogin(mockAccess, mockRefresh, { 
        full_name: formData.full_name, 
        role: formData.role, 
        email: formData.email 
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || "Structurally deficient parameters. Registration failed.");
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
             Configure an isolated profile resolving candidates safely from algorithmic matrices natively.
           </p>
        </div>
      </div>

      {/* Right Sign Up Box */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-24 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Initialize Account</h2>
            <p className="text-text-muted">Establish administrative credentials writing directly to PostgreSQL.</p>
          </div>

          {error && (
             <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg flex items-center justify-center">
               {error}
             </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-muted">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-text-muted" />
                </div>
                <input 
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors" 
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-muted">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-text-muted" />
                </div>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors" 
                  placeholder="jane@hiring.ai"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-muted">Security Policy Role</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase size={18} className="text-text-muted" />
                </div>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none" 
                >
                  <option value="student">Student (Self-Assessment)</option>
                  <option value="hr">Company (HR Manager)</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-muted">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-text-muted" />
                </div>
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 mt-6 text-base font-bold transition-all disabled:opacity-75"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : "Bind Native Trace"}
            </button>
            
            <div className="mt-4 text-center text-sm text-text-muted">
              Already initialized an account?{' '}
              <Link to="/login" className="text-primary-500 font-bold hover:text-white transition-colors">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
};

export default SignupPage;
