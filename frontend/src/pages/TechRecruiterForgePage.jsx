import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BookOpen, BrainCircuit, Zap, ShieldCheck, Loader2, 
  AlertCircle, CheckCircle2, Award, Send, MessageSquare, User, Hash, Eye
} from 'lucide-react';
import { techRecruiterApi } from '../api/techRecruiter';

const QuestionCard = ({ title, questions, icon: IconComponent, colorClass, delay }) => (
  <div className="p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border-2 border-slate-800 bg-[#0A0A0B]" style={{ animationDelay: `${delay}ms` }}>
    <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
      <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${colorClass} bg-opacity-10`}>
        <IconComponent className={`${colorClass.replace('bg-', 'text-')} w-5 h-5 sm:w-6 sm:h-6`} />
      </div>
      <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest text-white">{title}</h3>
      <span className="ml-auto px-2.5 py-0.5 sm:py-1 rounded-full bg-white/5 text-text-muted text-[10px] sm:text-xs font-bold">
        {questions.length} Q
      </span>
    </div>
    <div className="space-y-3 sm:space-y-4">
      {questions.map((q, i) => (
        <div key={i} className="flex gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
          <div className="mt-1 sm:mt-1.5 shrink-0">
            <span className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-lg bg-white/10 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-text-muted">
              {i + 1}
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed text-sm sm:text-base font-medium">{q}</p>
        </div>
      ))}
      {questions.length === 0 && (
        <p className="text-text-muted text-sm text-center py-4">No questions in this category.</p>
      )}
    </div>
  </div>
);

const TechRecruiterForgePage = () => {
  const { t } = useTranslation();
  const { candidateId } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [marks, setMarks] = useState('');
  const [categoryMarks, setCategoryMarks] = useState({});  // { categoryId: marksValue }
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [questionGenError, setQuestionGenError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await techRecruiterApi.getCandidateQuestions(candidateId);
      setData(result);
      
      // Pre-fill existing marks if available
      if (result.existing_marks) {
        setMarks(String(result.existing_marks.marks_obtained));
        setRemarks(result.existing_marks.remarks || '');
        
        // Pre-fill category marks if available
        if (result.existing_marks.category_marks?.length > 0) {
          const catMap = {};
          result.existing_marks.category_marks.forEach(cm => {
            catMap[cm.category_name] = String(cm.marks_obtained);
          });
          setCategoryMarks(catMap);
        }
      }
    } catch (err) {
      console.error('Failed to load candidate questions', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load evaluation workspace.');
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadData();
  }, [candidateId, loadData]);

  const handleGenerateQuestions = async (category = 'technical', force = false) => {
    setGeneratingQuestions(true);
    setQuestionGenError('');
    try {
      await techRecruiterApi.generateCandidateQuestions(candidateId, category, force);
      // reload candidate questions
      const result = await techRecruiterApi.getCandidateQuestions(candidateId);
      setData(result);
    } catch (err) {
      setQuestionGenError(err.response?.data?.detail || 'Failed to generate interview questions.');
    } finally {
      setGeneratingQuestions(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const hasCategories = data?.categories?.length > 0;
    
    if (hasCategories) {
      // Validate category marks
      for (const cat of data.categories) {
        const val = parseFloat(categoryMarks[cat.id] || 0);
        if (isNaN(val) || val < 0) {
          setSubmitResult({ type: 'error', message: `Please enter valid marks for "${cat.name}".` });
          return;
        }
        if (val > cat.max_marks) {
          setSubmitResult({ type: 'error', message: `Marks for "${cat.name}" cannot exceed ${cat.max_marks}.` });
          return;
        }
      }
      
      setSubmitting(true);
      setSubmitResult(null);
      try {
        const categoryMarksPayload = data.categories.map(cat => ({
          category_id: cat.id,
          marks_obtained: parseFloat(categoryMarks[cat.id] || 0)
        }));
        const result = await techRecruiterApi.submitCategoryMarks(candidateId, categoryMarksPayload, remarks);
        setSubmitResult({ 
          type: 'success', 
          message: result.data.status === 'updated' 
            ? 'Marks updated successfully.' 
            : 'Marks submitted successfully.' 
        });
      } catch (err) {
        setSubmitResult({ 
          type: 'error', 
          message: err.response?.data?.detail || 'Failed to submit marks.' 
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      // Legacy single-score mode
      const marksNum = parseFloat(marks);
      if (isNaN(marksNum) || marksNum < 0) {
        setSubmitResult({ type: 'error', message: 'Please enter valid marks.' });
        return;
      }
      if (marksNum > data.max_marks) {
        setSubmitResult({ type: 'error', message: `Marks cannot exceed ${data.max_marks}.` });
        return;
      }

      setSubmitting(true);
      setSubmitResult(null);
      try {
        const result = await techRecruiterApi.submitMarks(candidateId, marksNum, remarks);
        setSubmitResult({ 
          type: 'success', 
          message: result.data.status === 'updated' 
            ? 'Marks updated successfully.' 
            : 'Marks submitted successfully.' 
        });
      } catch (err) {
        setSubmitResult({ 
          type: 'error', 
          message: err.response?.data?.detail || 'Failed to submit marks.' 
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Parse questions from all question sets
  const getAllQuestions = () => {
    if (!data?.questions?.length) return { easy: [], medium: [], hard: [] };
    
    // Use the most recent question set
    const latest = data.questions[0];
    const q = latest?.questions || {};
    return {
      easy: q.easy || [],
      medium: q.medium || [],
      hard: q.hard || [],
    };
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 size={48} className="animate-spin text-amber-500" />
        <p className="text-text-muted text-xs font-black uppercase tracking-widest">{t('techRecruiterForge.loadingDossier')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6">
        <AlertCircle size={48} className="text-red-500" />
        <p className="text-white text-lg font-bold">{error}</p>
        <button onClick={() => navigate('/tech-recruiter')} className="px-6 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all">
          {t('techRecruiterForge.backToDashboard')}
        </button>
      </div>
    );
  }

  const candidate = data?.candidate;
  const maxMarks = data?.max_marks || 100;
  const questions = getAllQuestions();
  const hasCategories = data?.categories?.length > 0;
  const categoryTotal = hasCategories 
    ? data.categories.reduce((sum, c) => sum + (parseFloat(categoryMarks[c.id] || 0)), 0)
    : 0;
  const categoryMaxTotal = hasCategories 
    ? data.categories.reduce((sum, c) => sum + c.max_marks, 0) 
    : maxMarks;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-0 flex flex-col gap-6 sm:gap-8 pb-12">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/tech-recruiter')}
        className="flex items-center gap-2 text-text-muted hover:text-white transition-colors w-fit group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold">{t('techRecruiterForge.backToDashboard')}</span>
      </button>

      {/* Candidate Header */}
      <div className="p-5 sm:p-8 rounded-3xl sm:rounded-[48px] bg-gradient-to-br from-surface to-[#0A0A0B] border border-border flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center text-center sm:text-left gap-4 sm:gap-6 w-full lg:w-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[24px] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-lg shadow-amber-500/20 shrink-0">
            {candidate?.full_name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-1">
              {candidate?.full_name}
            </h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-xs font-black uppercase tracking-widest text-text-muted mt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-400" />
                {candidate?.anonymized_id || 'PRO-SECURE'}
              </span>
              {candidate?.github_username && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                  <span className="text-primary-500">@{candidate.github_username}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <button
            onClick={() => navigate(`/candidates/${candidate?.id}`)}
            className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-colors"
          >
            <Eye size={14} />
            {t('techRecruiterForge.viewCandidate')}
          </button>
          <div className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Award size={14} />
            Max Marks: {maxMarks}
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Questions Panel */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 ml-1 sm:ml-2">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-amber-500/60">
              {t('techRecruiterForge.interviewQuestionsDossier')}
            </h2>
            {data?.questions?.length > 0 && !generatingQuestions && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleGenerateQuestions('technical', true)}
                  className="flex-1 sm:flex-initial text-center justify-center text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/5 hover:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20"
                >
                  {t('techRecruiterForge.regenTechnical')}
                </button>
                <button
                  onClick={() => handleGenerateQuestions('hr', true)}
                  className="flex-1 sm:flex-initial text-center justify-center text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
                >
                  {t('techRecruiterForge.regenHR')}
                </button>
              </div>
            )}
          </div>

          {generatingQuestions ? (
            <div className="p-8 sm:p-16 text-center bg-[#0D0D0E] border-2 border-slate-800 border-dashed rounded-2xl sm:rounded-[32px] flex flex-col items-center justify-center gap-4 sm:gap-6">
              <Loader2 size={48} className="animate-spin text-amber-500" />
              <div>
                <p className="text-white font-bold text-lg mb-1">{t('techRecruiterForge.forgingCustom')}</p>
                <p className="text-text-muted text-xs">{t('techRecruiterForge.synthesizingDesc')}</p>
              </div>
            </div>
          ) : data?.questions?.length > 0 ? (
            <>
              {questionGenError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl text-center">
                  {questionGenError}
                </div>
              )}
              <QuestionCard 
                title={t('interview.foundation')} 
                questions={questions.easy} 
                icon={BookOpen} 
                colorClass="bg-primary-500" 
                delay={100} 
              />
              <QuestionCard 
                title={t('interview.application')} 
                questions={questions.medium} 
                icon={Zap} 
                colorClass="bg-amber-500" 
                delay={200} 
              />
              <QuestionCard 
                title={t('interview.deepDive')} 
                questions={questions.hard} 
                icon={BrainCircuit} 
                colorClass="bg-purple-500" 
                delay={300} 
              />
            </>
          ) : (
            <div className="p-6 sm:p-12 text-center bg-[#0D0D0E] border-2 border-slate-800 border-dashed rounded-2xl sm:rounded-[32px] flex flex-col items-center justify-center gap-5 sm:gap-6">
              <BrainCircuit size={48} className="text-amber-500/60 mb-2 animate-pulse" />
              <div>
                <h3 className="text-white font-bold text-lg mb-2">{t('techRecruiterForge.generateInterview')}</h3>
                <p className="text-text-muted text-sm max-w-md mx-auto">
                  {t('techRecruiterForge.directForge')}
                </p>
              </div>

              {questionGenError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl text-center">
                  {questionGenError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleGenerateQuestions('technical')}
                  className="w-full sm:w-auto justify-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 hover:scale-102 transition-all flex items-center gap-2"
                >
                  <Zap size={16} />
                  {t('techRecruiterForge.genTechQs')}
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateQuestions('hr')}
                  className="w-full sm:w-auto justify-center px-6 py-3 bg-white/5 text-white hover:bg-white/10 rounded-xl font-bold text-sm border border-white/10 hover:scale-102 transition-all flex items-center gap-2"
                >
                  <User size={16} />
                  {t('techRecruiterForge.genHRQs')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Marks Submission Panel */}
        <div className="w-full xl:w-[400px] shrink-0">
          <div className="sticky top-4">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-amber-500/60 ml-1 sm:ml-2 mb-4">
              {t('techRecruiterForge.scoreSubmission')}
            </h2>
            
            <form onSubmit={handleSubmit} className="p-5 sm:p-8 rounded-2xl sm:rounded-[32px] bg-surface border-2 border-border space-y-5 sm:space-y-6">
              {/* Category Marks or Single Input */}
              {hasCategories ? (
                <div className="space-y-4">
                  {data.categories.map(cat => (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white">{cat.name}</label>
                        <span className="text-[10px] font-black text-text-muted">/ {cat.max_marks}</span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={cat.max_marks}
                        value={categoryMarks[cat.id] || ''}
                        onChange={e => setCategoryMarks(prev => ({
                          ...prev,
                          [cat.id]: e.target.value
                        }))}
                        className="w-full px-4 py-3 bg-[#0A0A0B] border border-border rounded-xl text-white text-lg font-black text-center focus:outline-none focus:border-amber-500 transition-colors placeholder:text-text-muted/30"
                        placeholder="0"
                      />
                      {/* Individual bar */}
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min((parseFloat(categoryMarks[cat.id] || 0) / cat.max_marks) * 100, 100)}%`,
                            background: `linear-gradient(to right, #f59e0b, ${(parseFloat(categoryMarks[cat.id] || 0) / cat.max_marks) > 0.7 ? '#10b981' : '#ef4444'})`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {/* Total summary */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black text-amber-500 uppercase tracking-widest">{t('techRecruiterForge.total')}</span>
                      <span className="text-2xl font-black text-white">{categoryTotal} <span className="text-text-muted text-sm">/ {categoryMaxTotal}</span></span>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min((categoryTotal / categoryMaxTotal) * 100, 100)}%`,
                          background: `linear-gradient(to right, #f59e0b, ${(categoryTotal / categoryMaxTotal) > 0.7 ? '#10b981' : '#ef4444'})`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Award size={16} className="text-amber-400" />
                    {t('techRecruiterForge.marksObtained')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={maxMarks}
                      value={marks}
                      onChange={e => setMarks(e.target.value)}
                      required
                      className="w-full px-4 py-4 bg-[#0A0A0B] border border-border rounded-xl text-white text-2xl font-black text-center focus:outline-none focus:border-amber-500 transition-colors placeholder:text-text-muted/30"
                      placeholder="0"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">
                      / {maxMarks}
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-3">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((parseFloat(marks) || 0) / maxMarks * 100, 100)}%`,
                        background: `linear-gradient(to right, #f59e0b, ${(parseFloat(marks) || 0) / maxMarks > 0.7 ? '#10b981' : '#ef4444'})`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare size={16} className="text-text-muted" />
                  Remarks <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#0A0A0B] border border-border rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors placeholder:text-text-muted/30 resize-none"
                  placeholder={t('techRecruiterForge.performanceNotes')}
                />
              </div>

              {/* Submit Result */}
              {submitResult && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  submitResult.type === 'success' 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' 
                    : 'bg-red-500/10 border border-red-500/20 text-red-500'
                }`}>
                  {submitResult.type === 'success' 
                    ? <CheckCircle2 size={18} /> 
                    : <AlertCircle size={18} />
                  }
                  <span className="text-sm font-bold">{submitResult.message}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || (!hasCategories && !marks)}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('techRecruiterForge.submitting')}
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {data?.existing_marks ? t('techRecruiterForge.updateMarks') : t('techRecruiterForge.submitMarks')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechRecruiterForgePage;
