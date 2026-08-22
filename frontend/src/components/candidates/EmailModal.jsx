import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { X, Send, Loader2, Sparkles, Mail, CheckCircle } from 'lucide-react';
import { useEmailDraft, useCandidateMutations } from '../../hooks/useCandidates';

const EmailModal = ({ candidateId, candidateName, onClose }) => {
  const { t } = useTranslation();
  const { data: draft, isLoading: isDraftLoading } = useEmailDraft(candidateId);
  const { sendEmail } = useCandidateMutations();
  
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [prevDraft, setPrevDraft] = useState(null);

  if (draft && draft !== prevDraft) {
    setPrevDraft(draft);
    setSubject(draft.subject || '');
    setBody(draft.body || '');
  }

  const handleSend = async () => {
    try {
      await sendEmail.mutateAsync({ candidateId, subject, body });
      setIsSent(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to send email:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-2xl overflow-hidden shadow-2xl border-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('emailModal.interviewInvitation')}</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">To: {candidateName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-text-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isDraftLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Sparkles size={40} className="text-primary-500 animate-pulse" />
              <div className="text-center">
                <p className="text-white font-bold mb-1">{t('emailModal.aiComposing')}</p>
                <p className="text-xs text-text-muted">{t('emailModal.analyzingCandidate')}</p>
              </div>
            </div>
          ) : isSent ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 animate-in zoom-in duration-300">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 border border-green-500/30">
                <CheckCircle size={40} />
              </div>
              <p className="text-xl font-black text-white uppercase">{t('emailModal.invitationSent')}</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted px-1">{t('emailModal.subjectLine')}</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-all font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted px-1">{t('emailModal.emailBodyHtml')}</label>
                <textarea 
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full h-80 bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-all font-medium resize-none leading-relaxed"
                />
              </div>
              
              <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/10 flex items-start gap-3">
                <Sparkles size={16} className="text-primary-500 mt-0.5" />
                <p className="text-[10px] text-text-muted leading-relaxed">
                  <span className="text-primary-500 font-bold">{t('emailModal.proTip')}</span>{t('emailModal.proTipText')}<code className="text-primary-400 font-black">[Link]</code>{t('emailModal.proTipEnd')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isSent && !isDraftLoading && (
          <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-white/10 text-text-muted font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
            >
              {t('shortlisted.cancel')}
            </button>
            <button 
              onClick={handleSend}
              disabled={sendEmail.isPending}
              className="btn-primary flex items-center gap-2 px-8 py-2.5 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
            >
              {sendEmail.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {sendEmail.isPending ? t('emailModal.delivering') : t('emailModal.deployInvitation')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailModal;
