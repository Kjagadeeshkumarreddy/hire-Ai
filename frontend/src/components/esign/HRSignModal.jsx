import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ShieldCheck, Type, PenTool, CheckCircle, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { esignApi } from '../../api/esign';

const HRSignModal = ({ signature, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [signType, setSignType] = useState('typed');
  const [typedName, setTypedName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Native HTML5 Canvas State
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  
  const { user } = useAuthStore();

  // Canvas drawing coords helper
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }, [getCanvasCoords]);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#3b82f6'; // Counter-signature HR blue
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasDrawn(true);
  }, [isDrawing, getCanvasCoords]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Wire up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || signType !== 'drawn') return;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [signType, isDrawing, startDrawing, draw, stopDrawing]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let signatureImage = null;
      if (signType === 'drawn') {
        if (!hasDrawn || !canvasRef.current) {
          setError('Please provide a signature.');
          return;
        }
        signatureImage = canvasRef.current.toDataURL('image/png');
      }

      if (signType === 'typed' && !typedName.trim()) {
        setError('Please type your full name.');
        return;
      }

      const data = await esignApi.hrSubmitSignature(signature.id, {
        signature_image: signatureImage,
        signature_type: signType,
        typed_name: typedName,
      });

      if (data.status === 'success') {
        onSuccess();
      } else {
        throw new Error(data.error || 'Failed to submit signature');
      }
    } catch (err) {
      console.error('Counter-sign error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to submit signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0A0A0B] border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <ShieldCheck className="text-primary-500" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('hrSignModal.counterSignOffer')}</h3>
              <p className="text-xs text-text-muted">Finalizing offer for {signature.candidate_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
 
        <div className="p-8 space-y-6">
          <div className="flex p-1 bg-background rounded-xl border border-border">
            <button 
              onClick={() => setSignType('typed')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${signType === 'typed' ? 'bg-surface text-primary-400 shadow-lg' : 'text-text-muted hover:text-text-main'}`}
            >
              <Type size={16} />
              {t('hrSignModal.typed')}
            </button>
            <button 
              onClick={() => setSignType('drawn')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${signType === 'drawn' ? 'bg-surface text-primary-400 shadow-lg' : 'text-text-muted hover:text-text-main'}`}
            >
              <PenTool size={16} />
              {t('hrSignModal.drawn')}
            </button>
          </div>
 
          {signType === 'typed' ? (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('signup.fullName')}</label>
              <input 
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={user?.full_name || t('hrSignModal.typeYourName')}
                className="w-full bg-background border border-border rounded-xl py-3 px-4 text-white focus:border-primary-500 outline-none transition-all font-serif italic text-xl"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('signOffer.drawSignature')}</label>
                <button 
                  onClick={clearCanvas}
                  className="text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  {t('hrSignModal.clearCanvas')}
                </button>
              </div>
              <div className="bg-white rounded-xl overflow-hidden h-48 border-2 border-dashed border-border group hover:border-primary-500/50 transition-colors cursor-crosshair relative">
                <canvas 
                  ref={canvasRef}
                  width={500}
                  height={192}
                  className="w-full h-full"
                  style={{ touchAction: 'none' }}
                />
                {!hasDrawn && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-400 text-sm font-medium">{t('signOffer.drawHere')}</p>
                   </div>
                )}
              </div>
            </div>
          )}
 
          <div className="bg-primary-500/5 border border-primary-500/10 rounded-xl p-4">
            <p className="text-[10px] text-primary-500/80 leading-relaxed">
              {t('hrSignModal.consentText')}
            </p>
          </div>
 
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm animate-in shake duration-300">
              <AlertCircle size={18} />
              <span className="break-all">{error}</span>
            </div>
          )}
        </div>
 
        <div className="p-6 bg-surface/50 border-t border-border flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-background border border-border text-text-main rounded-xl text-sm font-bold hover:bg-surface transition-all"
          >
            {t('shortlisted.cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-2 py-3 px-8 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('signOffer.signing')}
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                {t('hrSignModal.finalizeSign')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HRSignModal;
