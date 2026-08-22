import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { 
   FileText, PenTool, Type, CheckCircle2, 
   Loader2, AlertTriangle, Clock, Shield, 
   RotateCcw, Send, Eye
} from 'lucide-react';
import { esignApi } from '../api/esign';

const SignOfferPage = () => {
  const { t } = useTranslation();
   const { token } = useParams();
   const canvasRef = useRef(null);

   // State
   const [loading, setLoading] = useState(true);
   const [offerData, setOfferData] = useState(null);
   const [error, setError] = useState(null);
   const [alreadySigned, setAlreadySigned] = useState(false);

   // Signature state
   const [sigMode, setSigMode] = useState('draw'); // 'draw' or 'type'
   const [typedName, setTypedName] = useState('');
   const [isDrawing, setIsDrawing] = useState(false);
   const [hasDrawn, setHasDrawn] = useState(false);
   const [consent, setConsent] = useState(false);

   // Submission state
   const [submitting, setSubmitting] = useState(false);
   const [submitted, setSubmitted] = useState(false);
   const [submitError, setSubmitError] = useState(null);

   // Fetch offer data
   useEffect(() => {
      const fetchOffer = async () => {
         try {
            const data = await esignApi.getOfferForSigning(token);
            if (data.status === 'already_signed') {
               setAlreadySigned(true);
            } else if (data.status === 'valid') {
               setOfferData(data);
            } else {
               setError(data.error || 'Invalid signing link.');
            }
         } catch (err) {
            setError(err.response?.data?.detail || 'This signing link is invalid or has expired.');
         } finally {
            setLoading(false);
         }
      };
      fetchOffer();
   }, [token]);

   // Canvas drawing logic
   const getCanvasCoords = useCallback((e) => {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      if (e.touches) {
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
      const ctx = canvas.getContext('2d');
      const { x, y } = getCanvasCoords(e);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#0d9488';
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

   // Setup canvas events
   useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || sigMode !== 'draw') return;

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
   }, [sigMode, startDrawing, draw, stopDrawing]);

   // Submit signature
   const handleSubmit = async () => {
      if (!consent) return;
      
      let signatureImage = '';
      if (sigMode === 'draw') {
         if (!hasDrawn) return;
         signatureImage = canvasRef.current.toDataURL('image/png');
      } else {
         if (!typedName.trim()) return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
         await esignApi.submitSignature(token, {
            signature_image: signatureImage,
            signature_type: sigMode === 'draw' ? 'drawn' : 'typed',
            typed_name: sigMode === 'type' ? typedName : null,
         });
         setSubmitted(true);
      } catch (err) {
         setSubmitError(err.response?.data?.detail || 'Failed to submit signature. Please try again.');
      } finally {
         setSubmitting(false);
      }
   };

   const canSubmit = consent && (
      (sigMode === 'draw' && hasDrawn) || 
      (sigMode === 'type' && typedName.trim().length > 0)
   );

   // ── Loading State ──
   if (loading) {
      return (
         <div className="min-h-screen bg-[#050508] flex items-center justify-center">
            <div className="text-center">
               <Loader2 size={48} className="animate-spin text-teal-500 mx-auto mb-4" />
               <p className="text-white/60 text-sm font-medium">{t('signOffer.loading')}</p>
            </div>
         </div>
      );
   }

   // ── Error State ──
   if (error) {
      return (
         <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#0a0a0f] border border-red-500/20 rounded-3xl p-10 text-center">
               <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle size={32} className="text-red-500" />
               </div>
               <h1 className="text-xl font-black text-white mb-3">{t('signOffer.linkUnavailable')}</h1>
               <p className="text-white/50 text-sm leading-relaxed">{error}</p>
            </div>
         </div>
      );
   }

   // ── Already Signed ──
   if (alreadySigned) {
      return (
         <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#0a0a0f] border border-green-500/20 rounded-3xl p-10 text-center">
               <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={32} className="text-green-500" />
               </div>
               <h1 className="text-xl font-black text-white mb-3">{t('signOffer.alreadySigned')}</h1>
               <p className="text-white/50 text-sm leading-relaxed">{t('signOffer.alreadySignedDesc')}</p>
            </div>
         </div>
      );
   }

   // ── Success State ──
   if (submitted) {
      return (
         <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#0a0a0f] border border-green-500/20 rounded-3xl p-10 text-center">
               <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                     <CheckCircle2 size={40} className="text-green-500" />
                  </div>
               </div>
               <h1 className="text-2xl font-black text-white mb-3">{t('signOffer.signedTitle')}</h1>
               <p className="text-white/50 text-sm leading-relaxed mb-6">
                  {t('signOffer.recordedSuccess')}
               </p>
               <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                  <p className="text-green-400 text-xs font-medium flex items-center justify-center gap-2">
                     <Shield size={14} /> {t('signOffer.legallyBinding')}
                  </p>
               </div>
            </div>
         </div>
      );
   }

   // ── Main Signing Interface ──
   return (
      <div className="min-h-screen bg-[#050508] text-white">
         {/* Header */}
         <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/10 rounded-xl">
                     <FileText size={20} className="text-teal-500" />
                  </div>
                  <div>
                     <h1 className="text-sm font-black uppercase tracking-widest">
                        {t('offerLetter.offerStudio')} <span className="text-teal-500">{t('signOffer.letter')}</span>
                     </h1>
                     <p className="text-[10px] text-white/40 font-bold uppercase tracking-tight">
                        {offerData?.job_title || 'Position'}
                     </p>
                  </div>
               </div>
               <div className="flex items-center gap-2 text-xs text-white/40">
                  <Clock size={14} />
                  <span>Expires {new Date(offerData?.expires_at).toLocaleDateString()}</span>
               </div>
            </div>
         </header>

         <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Greeting */}
            <div className="mb-8">
               <h2 className="text-2xl font-black mb-2">
                  {t('signOffer.hello')} <span className="text-teal-500">{offerData?.candidate_name}</span>
               </h2>
               <p className="text-white/50 text-sm">
                  {t('signOffer.reviewDesc')}
               </p>
            </div>

            {/* Offer Letter Preview */}
            <div className="mb-10">
               <div className="flex items-center gap-2 mb-4">
                  <Eye size={16} className="text-teal-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/60">{t('signOffer.preview')}</h3>
               </div>
               <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                  <iframe
                     title="Offer Letter"
                     srcDoc={offerData?.offer_html}
                     className="w-full border-none pointer-events-none"
                     style={{ minHeight: '800px' }}
                  />
               </div>
            </div>

            {/* Signature Section */}
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-8">
               <div className="flex items-center gap-2 mb-6">
                  <PenTool size={16} className="text-teal-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest">{t('signOffer.yourSignature')}</h3>
               </div>

               {/* Mode Toggle */}
               <div className="flex gap-3 mb-6">
                  <button
                     onClick={() => { setSigMode('draw'); setTypedName(''); }}
                     className={`flex-1 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        sigMode === 'draw'
                           ? 'bg-teal-500/10 border-teal-500/30 text-teal-500'
                           : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                     }`}
                  >
                     <PenTool size={14} /> {t('signOffer.drawSignature')}
                  </button>
                  <button
                     onClick={() => { setSigMode('type'); clearCanvas(); }}
                     className={`flex-1 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        sigMode === 'type'
                           ? 'bg-teal-500/10 border-teal-500/30 text-teal-500'
                           : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                     }`}
                  >
                     <Type size={14} /> {t('signOffer.typeSignature')}
                  </button>
               </div>

               {/* Draw Mode */}
               {sigMode === 'draw' && (
                  <div className="mb-6">
                     <div className="relative bg-white rounded-xl overflow-hidden" style={{ touchAction: 'none' }}>
                        <canvas
                           ref={canvasRef}
                           width={700}
                           height={200}
                           className="w-full cursor-crosshair"
                           style={{ height: '160px' }}
                        />
                        {!hasDrawn && (
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <p className="text-gray-300 text-sm font-medium">{t('signOffer.drawHere')}</p>
                           </div>
                        )}
                     </div>
                     <button
                        onClick={clearCanvas}
                        className="mt-3 flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
                     >
                        <RotateCcw size={12} /> {t('signOffer.clearRedraw')}
                     </button>
                  </div>
               )}

               {/* Type Mode */}
               {sigMode === 'type' && (
                  <div className="mb-6">
                     <input
                        type="text"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        placeholder={t('signOffer.typeFullName')}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white font-medium focus:outline-none focus:border-teal-500/50 transition-all"
                     />
                     {typedName && (
                        <div className="mt-4 p-6 bg-white rounded-xl">
                           <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: '36px', color: '#0d9488' }}>
                              {typedName}
                           </p>
                        </div>
                     )}
                     <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
                  </div>
               )}

               {/* Legal Consent */}
               <div className="mb-6 p-5 bg-white/[0.02] border border-white/5 rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 accent-teal-500"
                     />
                     <span className="text-xs text-white/50 leading-relaxed">
                        {offerData?.consent_text || 'I agree that this electronic signature is legally binding.'}
                     </span>
                  </label>
               </div>

               {/* Submit Error */}
               {submitError && (
                  <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                     <p className="text-red-400 text-xs font-medium">{submitError}</p>
                  </div>
               )}

               {/* Submit Button */}
               <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                     canSubmit && !submitting
                        ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99]'
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
               >
                  {submitting ? (
                     <>
                        <Loader2 size={18} className="animate-spin" />
                        {t('signOffer.signing')}
                     </>
                  ) : (
                     <>
                        <Send size={18} />
                        {t('signOffer.acceptSign')}
                     </>
                  )}
               </button>

               <p className="text-center text-[10px] text-white/20 mt-4 flex items-center justify-center gap-1">
                  <Shield size={10} /> {t('signOffer.secured256')}
               </p>
            </div>
         </div>
      </div>
   );
};

export default SignOfferPage;
