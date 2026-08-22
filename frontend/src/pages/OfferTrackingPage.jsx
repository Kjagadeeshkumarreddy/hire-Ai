import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useJobStore } from '../stores/jobStore';
import { esignApi } from '../api/esign';
import ActiveRoleSelector from '../components/layout/ActiveRoleSelector';
import { FileText, CheckCircle, Clock, XCircle, Download, UserCheck, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import HRSignModal from '../components/esign/HRSignModal';

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const configs = {
    pending: { label: t('offerTracking.awaitingCandidate'), color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
    candidate_signed: { label: t('offerTracking.awaitingYourSignature'), color: 'bg-primary-500/10 text-primary-500 border-primary-500/20', icon: UserCheck },
    signed: { label: 'Fully Signed', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
    expired: { label: 'Expired', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: Clock },
    revoked: { label: 'Revoked', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
  };

  const config = configs[status] || { label: status, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: AlertCircle };
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </div>
  );
};

const OfferTrackingPage = () => {
  const { t } = useTranslation();
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSignature, setSelectedSignature] = useState(null);
  const { token } = useAuthStore();
  const { activeJobId } = useJobStore();

  const fetchSignatures = async () => {
    setLoading(true);
    try {
      const data = await esignApi.getSignaturesList();
      if (data.status === 'success') {
        setSignatures(data.signatures);
      } else {
        throw new Error(data.detail || 'Failed to fetch signatures');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatures();
  }, [token, activeJobId]);

  const handleDownload = async (signatureId, candidateName) => {
      try {
          const blob = await esignApi.downloadSignedPdf(signatureId);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const safeName = (candidateName || 'offer').replace(/\s+/g, '_');
          a.download = `Signed_Offer_${safeName}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
      } catch (err) {
          console.error('Download failed', err);
      }
  };

  const jobFilteredSignatures = signatures.filter(sig => 
    activeJobId ? sig.job_id === activeJobId : true
  );

  const filteredSignatures = jobFilteredSignatures.filter(sig => 
    sig.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sig.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-text-muted whitespace-nowrap">
              {activeJobId ? t('offerTracking.title') : t('offerTracking.title')}
            </h1>
            <p className="text-text-muted mt-2">{t('offerTracking.monitorDesc')}</p>
          </div>
          <div className="h-12 w-px bg-white/5 hidden md:block" />
          <ActiveRoleSelector />
        </div>
        
        <button 
          onClick={fetchSignatures}
          className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-white/5 border border-border rounded-xl text-sm text-text-main transition-all self-start md:self-center"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('offerTracking.refreshData')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={48} className="text-yellow-500" />
          </div>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">{t('offerTracking.awaitingCandidate')}</p>
          <p className="text-3xl font-bold text-yellow-500 mt-2">{jobFilteredSignatures.filter(s => s.status === 'pending').length}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <UserCheck size={48} className="text-primary-500" />
          </div>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">{t('offerTracking.awaitingYourSignature')}</p>
          <p className="text-3xl font-bold text-primary-500 mt-2">{jobFilteredSignatures.filter(s => s.status === 'candidate_signed').length}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">{t('offerTracking.fullyExecuted')}</p>
          <p className="text-3xl font-bold text-green-500 mt-2">{jobFilteredSignatures.filter(s => s.status === 'signed').length}</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div className="p-6 border-b border-border flex flex-col md:flex-row gap-4 justify-between bg-surface/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text"
              placeholder={t('offerTracking.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:border-primary-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 text-text-muted text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">{t('offerTracking.candidateRole')}</th>
                <th className="px-6 py-4 font-semibold">{t('offerTracking.offerSubject')}</th>
                <th className="px-6 py-4 font-semibold">{t('jobSelector.activeRole')}</th>
                <th className="px-6 py-4 font-semibold">{t('shortlisted.status')}</th>
                <th className="px-6 py-4 font-semibold">{t('offerTracking.lastActivity')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('candidateDash.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="px-6 py-8">
                      <div className="h-4 bg-surface-dark rounded w-3/4 mb-2" />
                      <div className="h-3 bg-surface-dark rounded w-1/2" />
                    </td>
                  </tr>
                ))
              ) : filteredSignatures.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={48} className="opacity-20" />
                      <p>{t('offerTracking.noOffers')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSignatures.map((sig) => (
                  <tr key={sig.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{sig.candidate_name}</p>
                      <p className="text-text-muted text-xs">{sig.job_title}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-main">
                      {sig.offer_subject}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        sig.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        sig.status === 'candidate_signed' ? 'bg-primary-500/20 text-primary-500' :
                        'bg-white/10 text-text-muted'
                      }`}>
                        {sig.status === 'pending' ? t('candidateDash.candidate') : 
                         sig.status === 'candidate_signed' ? 'HR / You' : 
                         sig.status === 'signed' ? 'Completed' : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sig.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {sig.hr_signed_at ? (
                        <span>Finalized {new Date(sig.hr_signed_at).toLocaleDateString()}</span>
                      ) : sig.signed_at ? (
                        <span className="text-primary-400">Candidate signed {new Date(sig.signed_at).toLocaleDateString()}</span>
                      ) : (
                        <span>Sent {new Date(sig.created_at).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sig.status === 'candidate_signed' && (
                          <button 
                            onClick={() => setSelectedSignature(sig)}
                            className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-primary-500/20 transition-all transform hover:scale-105"
                          >
                            {t('offerTracking.counterSign')}
                          </button>
                        )}
                        {sig.status === 'signed' && (
                          <button 
                            onClick={() => handleDownload(sig.id, sig.candidate_name)}
                            className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            title="Download Signed PDF"
                          >
                            <Download size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSignature && (
        <HRSignModal 
          signature={selectedSignature} 
          onClose={() => setSelectedSignature(null)} 
          onSuccess={() => {
            setSelectedSignature(null);
            fetchSignatures();
          }}
        />
      )}
    </div>
  );
};

export default OfferTrackingPage;
