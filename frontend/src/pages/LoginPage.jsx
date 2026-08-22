import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../api/client';
import { Network, Lock, User, Loader2, Briefcase, Mail, ArrowLeft, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react';
import { LanguageSelector } from '../components/common/LanguageSelector';

// Extract readable error message from API response
const extractErrorMessage = (err, fallback = 'Something went wrong.') => {
  const detail = err.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
  }
  return JSON.stringify(detail);
};

const LoginPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('hr');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setLogin = useAuthStore(state => state.login);

  const [error, setError] = useState('');
  const token = useAuthStore(state => state.token);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=otp+new password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotRole, setForgotRole] = useState('hr');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  React.useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

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

      setLogin(data.access_token, data.refresh_token, data.user);
      navigate('/');
    } catch (err) {
      console.error("Login Error Context:", err);
      setError(extractErrorMessage(err, "Invalid credentials. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async () => {
    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      await apiClient.post('/auth/otp/send', { email: forgotEmail });
      setForgotStep(2);
    } catch (err) {
      setForgotError(extractErrorMessage(err, 'Failed to send verification code.'));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const { data } = await apiClient.post('/auth/forgot-password', {
        email: forgotEmail,
        role: forgotRole,
        otp: forgotOtp,
        new_password: newPassword
      });
      setForgotSuccess(data.message || 'Password reset successfully!');
      setTimeout(() => {
        setForgotMode(false);
        setForgotStep(1);
        setForgotEmail('');
        setForgotOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setForgotSuccess('');
        setForgotError('');
      }, 3000);
    } catch (err) {
      setForgotError(extractErrorMessage(err, 'Failed to reset password.'));
    } finally {
      setForgotLoading(false);
    }
  };

  const exitForgotMode = () => {
    setForgotMode(false);
    setForgotStep(1);
    setForgotEmail('');
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotRole('hr');
    setForgotError('');
    setForgotSuccess('');
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
            {t('login.aiPowered')} <br /> {t('login.hiringArchitecture')}
          </h1>
          <p className="text-text-muted text-lg max-w-md">
            {t('login.heroDescription')}
          </p>
        </div>
      </div>

      {/* Right Login / Forgot Password Box */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-24 relative">
        <div className="absolute top-6 right-6">
          <LanguageSelector />
        </div>
        <div className="w-full max-w-md space-y-8">

          {/* ─── FORGOT PASSWORD MODE ─── */}
          {forgotMode ? (
            <>
              <div className="text-center md:text-left mb-4">
                <button
                  onClick={exitForgotMode}
                  className="flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors mb-4"
                >
                  <ArrowLeft size={16} /> Back to login
                </button>
                <h2 className="text-3xl font-bold text-white mb-2">
                  <KeyRound className="inline-block mr-2 -mt-1" size={28} />
                  Reset Password
                </h2>
                <p className="text-text-muted text-sm">
                  {forgotStep === 1
                    ? "Enter your email to receive a verification code."
                    : <>Code sent to <span className="text-primary-400 font-semibold">{forgotEmail}</span></>
                  }
                </p>
              </div>

              {forgotError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 text-sm p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={18} /> {forgotSuccess}
                </div>
              )}

              {!forgotSuccess && forgotStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-muted">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail size={18} className="text-text-muted" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors placeholder:text-text-muted/50"
                        placeholder="your@email.com"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-muted">Account Role</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Briefcase size={18} className="text-text-muted" />
                      </div>
                      <select
                        value={forgotRole}
                        onChange={e => setForgotRole(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none"
                      >
                        <option value="student">{t('login.student')}</option>
                        <option value="hr">{t('login.hrManager')}</option>
                        <option value="tech_recruiter">{t('login.techRecruiter')}</option>
                        <option value="admin">{t('login.systemAdmin')}</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendResetOtp}
                    disabled={forgotLoading || !forgotEmail}
                    className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-all disabled:opacity-50"
                  >
                    {forgotLoading ? <Loader2 size={20} className="animate-spin" /> : 'Send Verification Code'}
                  </button>
                </div>
              )}

              {!forgotSuccess && forgotStep === 2 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary-400" />
                      Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-4 bg-surface border border-border rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-primary-500 transition-colors"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-muted">New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={18} className="text-text-muted" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors placeholder:text-text-muted/50"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-muted">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={18} className="text-text-muted" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors placeholder:text-text-muted/50"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || forgotOtp.length < 6 || !newPassword || !confirmPassword}
                    className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-all disabled:opacity-50"
                  >
                    {forgotLoading ? <Loader2 size={20} className="animate-spin" /> : (
                      <><CheckCircle2 size={18} /> Reset Password</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setForgotError(''); }}
                    className="w-full py-2 text-sm text-text-muted hover:text-white transition-colors"
                  >
                    ← Change email
                  </button>

                  <button
                    type="button"
                    onClick={handleSendResetOtp}
                    disabled={forgotLoading}
                    className="w-full py-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    {forgotLoading ? 'Sending...' : 'Resend verification code'}
                  </button>
                </form>
              )}
            </>
          ) : (
            /* ─── NORMAL LOGIN MODE ─── */
            <>
              <div className="text-center md:text-left mb-10">
                <h2 className="text-3xl font-bold text-white mb-2">{t('login.welcomeBack')}</h2>
                <p className="text-text-muted">{t('login.enterCredentials')}</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg flex items-center justify-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-muted">
                    {role === 'tech_recruiter' ? t('login.loginId') : t('login.emailAddress')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={18} className="text-text-muted" />
                    </div>
                    <input
                      type={role === 'tech_recruiter' ? 'text' : 'email'}
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors placeholder:text-text-muted/50"
                      placeholder={role === 'tech_recruiter' ? 'TR-XXXXXX' : 'admin@hiring.ai'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-muted">{t('login.targetContextRole')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Briefcase size={18} className="text-text-muted" />
                    </div>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none"
                    >
                      <option value="student">{t('login.student')}</option>
                      <option value="hr">{t('login.hrManager')}</option>
                      <option value="tech_recruiter">{t('login.techRecruiter')}</option>
                      <option value="admin">{t('login.systemAdmin')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-muted">{t('login.password')}</label>
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
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
                  {loading ? <Loader2 size={20} className="animate-spin" /> : t('authenticateToGrid')}
                </button>

                <div className="mt-6 text-center text-sm text-text-muted">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="text-primary-500 font-bold hover:text-white transition-colors"
                  >
                    {t('login.signUp')}
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
