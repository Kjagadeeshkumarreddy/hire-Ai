import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../api/client';
import { Network, Lock, User, Loader2, Briefcase, Mail, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

const SignupPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
    passkey: '',
    otp: ''
  });
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP verification
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [error, setError] = useState('');
  const [_otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  // Extract readable error message from API response
  const extractErrorMessage = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return t('signup.registrationFailed');
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
    }
    return JSON.stringify(detail);
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      setError('Please enter your email address first.');
      return;
    }
    setOtpSending(true);
    setError('');
    try {
      await apiClient.post('/auth/otp/send', { email: formData.email });
      setOtpSent(true);
      setStep(2);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        otp: formData.otp
      };
      if (formData.role === 'admin' && formData.passkey) {
        payload.passkey = formData.passkey;
      }

      const { data } = await apiClient.post('/auth/register', payload);

      // If the backend returns tokens directly after registration, use them
      if (data.access_token) {
        login(data.access_token, data.refresh_token, {
          full_name: formData.full_name,
          role: formData.role,
          email: formData.email
        });
        navigate('/');
      } else {
        // Otherwise redirect to login
        navigate('/login');
      }
    } catch (err) {
      setError(extractErrorMessage(err));
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
             {t('login.aiPowered')} <br/> {t('login.hiringArchitecture')}
           </h1>
           <p className="text-text-muted text-lg max-w-md">
             {t('signup.heroDescription')}
           </p>
        </div>
      </div>

      {/* Right Sign Up Box */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-24 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left mb-4">
            <h2 className="text-3xl font-bold text-white mb-2">{t('signup.initializeAccount')}</h2>
            {step === 2 && (
              <p className="text-text-muted text-sm">
                Verification code sent to <span className="text-primary-400 font-semibold">{formData.email}</span>
              </p>
            )}
          </div>

          {error && (
             <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg flex items-center justify-center">
               {error}
             </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-muted">{t('signup.fullName')}</label>
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
                  <label className="text-sm font-medium text-text-muted">{t('login.emailAddress')}</label>
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
                  <label className="text-sm font-medium text-text-muted">{t('signup.securityPolicyRole')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Briefcase size={18} className="text-text-muted" />
                    </div>
                    <select 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none" 
                    >
                      <option value="student">{t('signup.studentSelfAssessment')}</option>
                      <option value="hr">{t('signup.companyHR')}</option>
                      <option value="admin">{t('signup.systemAdmin')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-muted">{t('login.password')}</label>
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

                {formData.role === 'admin' && (
                  <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-medium text-primary-400">{t('signup.adminPasskey')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={18} className="text-primary-500" />
                      </div>
                      <input 
                        type="password" 
                        required
                        value={formData.passkey || ''}
                        onChange={e => setFormData({...formData, passkey: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 bg-surface border border-primary-500/30 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors shadow-lg shadow-primary-500/5" 
                        placeholder={t('signup.enterSecretKey')}
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending || !formData.email || !formData.full_name || !formData.password}
                  className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 mt-6 text-base font-bold transition-all disabled:opacity-50"
                >
                  {otpSending ? <Loader2 size={20} className="animate-spin" /> : (
                    <>Send Verification Code <ArrowRight size={18} /></>
                  )}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary-400" />
                    Verification Code
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      maxLength={6}
                      value={formData.otp}
                      onChange={e => setFormData({...formData, otp: e.target.value.replace(/\D/g, '')})}
                      className="w-full px-4 py-4 bg-surface border border-border rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-primary-500 transition-colors" 
                      placeholder="000000"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Enter the 6-digit code sent to your email.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || formData.otp.length < 6}
                  className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 mt-6 text-base font-bold transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : (
                    <><CheckCircle2 size={18} /> {t('signup.bindNativeTrace')}</>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="w-full py-2 text-sm text-text-muted hover:text-white transition-colors"
                >
                  ← Back to form
                </button>

                <button 
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                  className="w-full py-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {otpSending ? 'Sending...' : 'Resend verification code'}
                </button>
              </>
            )}
            
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
