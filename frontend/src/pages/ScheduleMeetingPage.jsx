import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CalendarDays, Clock, Users, ArrowLeft, Plus, Trash2, Video,
  Loader2, CheckCircle2, Send, Coffee, Timer, Copy, X, Monitor,
  ChevronDown, Zap, AlertCircle, Mail, ExternalLink
} from 'lucide-react';
import { useJobList } from '../hooks/useJD';
import { useSchedulableCandidates, useScheduleList, useScheduleDetail, useScheduleMutations } from '../hooks/useSchedule';
import { scheduleApi } from '../api/schedule';
import { JobSelector } from '../components/common/JobSelector';
import apiClient from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

const ScheduleMeetingPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { data: allJobs = [] } = useJobList();
  const jobs = allJobs.filter(j => j.status !== 'offer');
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');

  // Schedule configuration state
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [duration, setDuration] = useState(30);
  const [platform, setPlatform] = useState('custom');
  const [customLink, setCustomLink] = useState('');
  const [breaks, setBreaks] = useState([]);

  // Candidate selection
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);

  // OAuth Integration Status
  const [oauthStatus, setOauthStatus] = useState({ google_connected: false, teams_connected: false });
  const [_oauthLoading, setOauthLoading] = useState(true);

  useEffect(() => {
    const fetchOauthStatus = async () => {
      try {
        const response = await apiClient.get('/auth/oauth/status');
        setOauthStatus(response.data);
      } catch (err) {
        console.error('Failed to load OAuth status:', err);
      } finally {
        setOauthLoading(false);
      }
    };
    fetchOauthStatus();
  }, []);

  const isPlatformDisabled = (platformValue) => {
    if (platformValue === 'google_meet') return !oauthStatus.google_connected;
    if (platformValue === 'teams') return !oauthStatus.teams_connected;
    return false;
  };

  const queryClient = useQueryClient();

  // Reschedule State
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Preview slot editing state
  const [editingPreviewIdx, setEditingPreviewIdx] = useState(null);
  const [previewEditDate, setPreviewEditDate] = useState('');
  const [previewEditStart, setPreviewEditStart] = useState('');
  const [previewEditEnd, setPreviewEditEnd] = useState('');

  // UI state
  const [step, setStep] = useState('configure'); // configure, preview, done
  const [previewSlots, setPreviewSlots] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [createdScheduleId, setCreatedScheduleId] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [error, setError] = useState('');

  // Data hooks
  const { data: candidates = [], isLoading: loadingCandidates } = useSchedulableCandidates(selectedJobId);
  const { data: existingSchedules = [] } = useScheduleList(selectedJobId);
  const { data: scheduleDetail } = useScheduleDetail(createdScheduleId);
  const { createSchedule: _createSchedule, sendInvites: _sendInvites, deleteSchedule } = useScheduleMutations();

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  // Sync with URL params
  useEffect(() => {
    if (jobId) setSelectedJobId(jobId);
    else if (jobs.length > 0 && !selectedJobId) setSelectedJobId(jobs[0].id);
  }, [jobId, jobs, selectedJobId]);

  const handleAddBreak = () => {
    setBreaks(prev => [...prev, { start_time: '12:00', end_time: '13:00', label: 'Lunch Break' }]);
  };

  const handleRemoveBreak = (idx) => {
    setBreaks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleBreakChange = (idx, field, value) => {
    setBreaks(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const toggleCandidate = (id) => {
    setSelectedCandidateIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllCandidates = () => {
    if (selectedCandidateIds.length === candidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(candidates.map(c => c.id));
    }
  };

  const handlePreview = async () => {
    if (!selectedJobId || !scheduleDate || !startTime || !endTime) {
      setError('Please fill in all required fields.');
      return;
    }
    if (selectedCandidateIds.length === 0) {
      setError('Please select at least one candidate.');
      return;
    }
    if (platform === 'google_meet' && !oauthStatus.google_connected) {
      setError('Please connect your Google Calendar account in Settings first.');
      return;
    }
    if (platform === 'teams' && !oauthStatus.teams_connected) {
      setError('Please connect your Microsoft Teams account in Settings first.');
      return;
    }
    setError('');
    setIsGenerating(true);
    try {
      const result = await scheduleApi.previewSlots(selectedJobId, {
        schedule_date: scheduleDate,
        start_time: startTime,
        end_time: endTime,
        meeting_duration_minutes: duration,
        breaks: breaks
      });
      if (result.available_slots < selectedCandidateIds.length) {
        setError(`Only ${result.available_slots} slots available but ${selectedCandidateIds.length} candidates selected. Adjust time range or reduce candidates.`);
        setIsGenerating(false);
        return;
      }
      setPreviewSlots(result);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (platform === 'google_meet' && !oauthStatus.google_connected) {
      setError('Please connect your Google Calendar account in Settings first.');
      return;
    }
    if (platform === 'teams' && !oauthStatus.teams_connected) {
      setError('Please connect your Microsoft Teams account in Settings first.');
      return;
    }
    setIsGenerating(true);
    setError('');
    
    const customSlotsPayload = previewSlots?.slots 
      ? previewSlots.slots.slice(0, selectedCandidateIds.length).map((slot, idx) => ({
          candidate_id: selectedCandidateIds[idx],
          slot_start: slot.start,
          slot_end: slot.end
        }))
      : null;

    try {
      const result = await scheduleApi.createSchedule(selectedJobId, {
        schedule_date: scheduleDate,
        start_time: startTime,
        end_time: endTime,
        meeting_duration_minutes: duration,
        breaks: breaks,
        platform: platform,
        candidate_ids: selectedCandidateIds,
        custom_meeting_link: platform === 'custom' ? customLink : null,
        custom_slots: customSlotsPayload
      });
      setCreatedScheduleId(result.schedule_id);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendInvites = async () => {
    if (!createdScheduleId) return;
    setIsSendingInvites(true);
    try {
      const result = await scheduleApi.sendInvites(createdScheduleId);
      setSendResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send invitations');
    } finally {
      setIsSendingInvites(false);
    }
  };

  const handleStartEditSlot = (slot) => {
    const slotDate = new Date(slot.slot_start);
    const pad = (n) => n < 10 ? '0' + n : n;
    const dateStr = slotDate.getFullYear() + '-' + pad(slotDate.getMonth() + 1) + '-' + pad(slotDate.getDate());
    const startStr = pad(slotDate.getHours()) + ':' + pad(slotDate.getMinutes());
    
    const endDate = new Date(slot.slot_end);
    const endStr = pad(endDate.getHours()) + ':' + pad(endDate.getMinutes());
    
    setEditingSlotId(slot.id);
    setEditDate(dateStr);
    setEditStart(startStr);
    setEditEnd(endStr);
  };

  const handleSaveReschedule = async (slotId) => {
    setIsRescheduling(true);
    setError('');
    try {
      const startParts = editStart.split(':');
      const endParts = editEnd.split(':');
      const dateParts = editDate.split('-');
      
      const startDt = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        parseInt(startParts[0]),
        parseInt(startParts[1])
      );
      
      const endDt = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        parseInt(endParts[0]),
        parseInt(endParts[1])
      );
      
      const pad = (n) => n < 10 ? '0' + n : n;
      const formatOffsetISO = (dt) => {
        const tzo = -dt.getTimezoneOffset();
        const dif = tzo >= 0 ? '+' : '-';
        return dt.getFullYear() +
          '-' + pad(dt.getMonth() + 1) +
          '-' + pad(dt.getDate()) +
          'T' + pad(dt.getHours()) +
          ':' + pad(dt.getMinutes()) +
          ':' + pad(dt.getSeconds()) +
          dif + pad(Math.floor(Math.abs(tzo) / 60)) +
          ':' + pad(Math.abs(tzo) % 60);
      };
      
      const startISO = formatOffsetISO(startDt);
      const endISO = formatOffsetISO(endDt);
      
      await apiClient.patch(`/schedule/slots/${slotId}/reschedule`, {
        slot_start: startISO,
        slot_end: endISO
      });
      
      setEditingSlotId(null);
      queryClient.invalidateQueries({ queryKey: ['schedule-detail'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reschedule interview slot');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleStartEditPreviewSlot = (idx, slot) => {
    const slotDate = new Date(slot.start);
    const pad = (n) => n < 10 ? '0' + n : n;
    const dateStr = slotDate.getFullYear() + '-' + pad(slotDate.getMonth() + 1) + '-' + pad(slotDate.getDate());
    const startStr = pad(slotDate.getHours()) + ':' + pad(slotDate.getMinutes());
    
    const endDate = new Date(slot.end);
    const endStr = pad(endDate.getHours()) + ':' + pad(endDate.getMinutes());
    
    setEditingPreviewIdx(idx);
    setPreviewEditDate(dateStr);
    setPreviewEditStart(startStr);
    setPreviewEditEnd(endStr);
  };

  const handleSavePreviewSlotEdit = (idx) => {
    try {
      const startParts = previewEditStart.split(':');
      const endParts = previewEditEnd.split(':');
      const dateParts = previewEditDate.split('-');
      
      const startDt = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        parseInt(startParts[0]),
        parseInt(startParts[1])
      );
      
      const endDt = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        parseInt(endParts[0]),
        parseInt(endParts[1])
      );
      
      const pad = (n) => n < 10 ? '0' + n : n;
      const formatOffsetISO = (dt) => {
        const tzo = -dt.getTimezoneOffset();
        const dif = tzo >= 0 ? '+' : '-';
        return dt.getFullYear() +
          '-' + pad(dt.getMonth() + 1) +
          '-' + pad(dt.getDate()) +
          'T' + pad(dt.getHours()) +
          ':' + pad(dt.getMinutes()) +
          ':' + pad(dt.getSeconds()) +
          dif + pad(Math.floor(Math.abs(tzo) / 60)) +
          ':' + pad(Math.abs(tzo) % 60);
      };
      
      const startISO = formatOffsetISO(startDt);
      const endISO = formatOffsetISO(endDt);
      
      const formatDisplay = (dt) => {
        const hrs = dt.getHours();
        const mins = dt.getMinutes();
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const displayHrs = hrs % 12 || 12;
        return pad(displayHrs) + ':' + pad(mins) + ' ' + ampm;
      };
      
      const updatedSlots = [...previewSlots.slots];
      updatedSlots[idx] = {
        ...updatedSlots[idx],
        start: startISO,
        end: endISO,
        start_display: formatDisplay(startDt),
        end_display: formatDisplay(endDt)
      };
      
      setPreviewSlots({
        ...previewSlots,
        slots: updatedSlots
      });
      
      setEditingPreviewIdx(null);
    } catch (err) {
      console.error('Failed to save edited preview slot:', err);
      setError('Failed to save edited slot times.');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const platformOptions = [
    { value: 'custom', label: 'Custom Link', icon: Monitor, desc: 'Enter your own meeting link' },
    { value: 'google_meet', label: 'Google Meet', icon: Video, desc: 'Auto-create via Google API' },
    { value: 'teams', label: 'Microsoft Teams', icon: Monitor, desc: 'Auto-create via Teams API' },
  ];

  const durationOptions = [15, 20, 30, 45, 60];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 pt-2 selection:bg-cyan-500/30">
      <div className="max-w-[1600px] mx-auto animation-fade-in pb-20">

        {/* Navigation Bar */}
        <nav className="flex items-center justify-between mb-8">
          <Link to="/shortlisted" className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group px-4 py-2 rounded-xl hover:bg-white/5">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest text-white/40 group-hover:text-white">Back to Shortlist</span>
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-start min-w-[320px]">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 mb-2 ml-2">Active Job</span>
              <JobSelector
                activeJobId={selectedJobId}
                onSelect={(id) => {
                  setSelectedJobId(id);
                  if (id) navigate(`/schedule/${id}`);
                }}
                filterType="interview"
              />
            </div>
          </div>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest mb-4">
            <CalendarDays size={12} className="animate-pulse" />
            Interview Scheduler Engine
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Schedule Interviews</h1>
          <p className="text-text-muted font-medium">Configure time slots, select candidates, and dispatch meeting invitations</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 animation-fade-in">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <span className="text-sm text-red-300">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {step === 'done' ? (
          /* ═══════════ STEP 3: SUCCESS / REVIEW ═══════════ */
          <div className="space-y-8 animation-fade-in">
            {/* Success Header */}
            <div className="bg-[#0A0A0B] border border-slate-800 rounded-[48px] p-12 text-center shadow-2xl">
              <div className="relative mb-8 inline-block">
                <div className="absolute -inset-16 bg-violet-500/20 rounded-full blur-[80px]" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-violet-500 to-violet-600 rounded-[32px] flex items-center justify-center text-white shadow-2xl border border-white/20">
                  <CheckCircle2 size={48} />
                </div>
              </div>
              <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-3">Schedule Created</h2>
              <p className="text-lg text-slate-400 font-medium">
                {scheduleDetail?.slots?.length || 0} interview slots generated for {formatDate(scheduleDate)}
              </p>
            </div>

            {/* Slot Timeline */}
            {scheduleDetail && (
              <div className="bg-[#0A0A0B] border border-slate-800 rounded-[40px] p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400 border border-violet-500/20">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">Interview Timeline</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{formatDate(scheduleDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {sendResult ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <CheckCircle2 size={16} className="text-green-400" />
                        <span className="text-sm font-bold text-green-400">{sendResult.sent_count} invites sent</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSendInvites}
                        disabled={isSendingInvites}
                        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-500 to-violet-600 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSendingInvites ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {isSendingInvites ? 'Sending...' : 'Send All Invitations'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {scheduleDetail.slots?.map((slot) => (
                    <div key={slot.id} className="group flex items-center gap-5 p-5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-violet-500/30 rounded-2xl transition-all duration-300">
                      {/* Time Badge or Reschedule Picker */}
                      {editingSlotId === slot.id ? (
                        <div className="flex flex-col gap-2 p-3 bg-white/[0.04] border border-violet-500/30 rounded-2xl animate-in zoom-in-95 duration-200">
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="px-2 py-1.5 bg-[#1E293B] border border-slate-700 rounded-lg text-xs text-white font-bold focus:outline-none focus:border-violet-500/50"
                              style={{ colorScheme: 'dark' }}
                            />
                            <input
                              type="time"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              className="px-2 py-1.5 bg-[#1E293B] border border-slate-700 rounded-lg text-xs text-white font-bold focus:outline-none focus:border-violet-500/50"
                              style={{ colorScheme: 'dark' }}
                            />
                            <span className="text-slate-500 text-xs font-bold align-center self-center">to</span>
                            <input
                              type="time"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              className="px-2 py-1.5 bg-[#1E293B] border border-slate-700 rounded-lg text-xs text-white font-bold focus:outline-none focus:border-violet-500/50"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingSlotId(null)}
                              disabled={isRescheduling}
                              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-lg border border-white/5"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveReschedule(slot.id)}
                              disabled={isRescheduling}
                              className="px-3 py-1 bg-violet-500 hover:bg-violet-600 text-[10px] font-black uppercase tracking-widest text-white rounded-lg flex items-center gap-1 shadow-lg shadow-violet-500/20"
                            >
                              {isRescheduling ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center w-32 shrink-0 group/time">
                          <span className="text-lg font-black text-violet-400 tracking-tight">
                            {new Date(slot.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                            to {new Date(slot.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => handleStartEditSlot(slot)}
                            className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-violet-400 hover:text-white hover:bg-violet-500 transition-all duration-300"
                          >
                            Reschedule
                          </button>
                        </div>
                      )}

                      {/* Connector */}
                      <div className="w-px h-12 bg-gradient-to-b from-violet-500/40 to-transparent" />

                      {/* Candidate */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-black text-sm group-hover:scale-110 transition-transform">
                            {slot.candidate_name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-bold truncate">{slot.candidate_name}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">{slot.candidate_email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Meeting Info */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">ID</span>
                            <span className="font-mono text-xs text-white/80">{slot.meeting_id}</span>
                            <button onClick={() => handleCopy(slot.meeting_id)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-white">
                              <Copy size={10} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pass</span>
                            <span className="font-mono text-xs text-amber-400">{slot.meeting_password}</span>
                            <button onClick={() => handleCopy(slot.meeting_password)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-white">
                              <Copy size={10} />
                            </button>
                          </div>
                        </div>

                        {/* Email Status */}
                        <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                          slot.email_sent
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                        }`}>
                          {slot.email_sent ? 'Sent' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setStep('configure');
                  setCreatedScheduleId(null);
                  setPreviewSlots(null);
                  setSendResult(null);
                  setSelectedCandidateIds([]);
                }}
                className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
              >
                Create Another Schedule
              </button>
              <button
                onClick={() => navigate('/shortlisted')}
                className="px-8 py-4 bg-violet-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Return to Shortlist
              </button>
            </div>
          </div>
        ) : (
          /* ═══════════ STEP 1 & 2: CONFIGURE + PREVIEW ═══════════ */
          <div className="flex gap-8 items-start flex-col xl:flex-row">

            {/* ──── LEFT: Schedule Configuration ──── */}
            <div className="w-full xl:w-[480px] shrink-0 space-y-6">
              <div className="bg-[#0A0A0B] border border-slate-800 rounded-[40px] p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400 border border-violet-500/20">
                    <CalendarDays size={20} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Schedule Configuration</h3>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60 ml-1">Interview Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-5 py-4 bg-[#1E293B] border-2 border-slate-700 rounded-2xl text-white font-bold focus:outline-none focus:border-violet-500/50 transition-all cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60 ml-1">From</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-5 py-4 bg-[#1E293B] border-2 border-slate-700 rounded-2xl text-white font-bold focus:outline-none focus:border-violet-500/50 transition-all"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60 ml-1">To</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-5 py-4 bg-[#1E293B] border-2 border-slate-700 rounded-2xl text-white font-bold focus:outline-none focus:border-violet-500/50 transition-all"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60 ml-1">Meeting Duration Per Candidate</label>
                  <div className="flex gap-2">
                    {durationOptions.map(d => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`flex-1 py-3 rounded-xl border-2 text-sm font-black transition-all ${
                          duration === d
                            ? 'bg-violet-500/20 border-violet-500 text-violet-400'
                            : 'bg-white/5 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60 ml-1">Meeting Platform</label>
                  <div className="space-y-2">
                    {platformOptions.map(opt => {
                      const disabled = isPlatformDisabled(opt.value);
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            if (!disabled) {
                              setPlatform(opt.value);
                            }
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 relative ${
                            disabled 
                              ? 'bg-white/[0.01] border-slate-900 text-slate-600 cursor-not-allowed opacity-50' 
                              : platform === opt.value
                                ? 'bg-violet-500/10 border-violet-500/50 text-white cursor-pointer'
                                : 'bg-white/[0.02] border-slate-800 text-slate-400 hover:border-slate-600 cursor-pointer'
                          }`}
                        >
                          <opt.icon size={20} className={platform === opt.value && !disabled ? 'text-violet-400' : ''} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-bold ${disabled ? 'text-slate-500' : 'text-white'}`}>{opt.label}</p>
                              {disabled && (
                                <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-[8px] font-black uppercase tracking-widest text-red-400 rounded-md">
                                  Disconnected
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500">{opt.desc}</p>
                          </div>
                          {disabled ? (
                            <Link 
                              to="/settings" 
                              className="text-[9px] font-black uppercase tracking-widest text-violet-400 hover:text-white border-b border-dashed border-violet-400/50 hover:border-white transition-all flex items-center gap-1 z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Connect <ExternalLink size={8} />
                            </Link>
                          ) : (
                            platform === opt.value && <CheckCircle2 size={18} className="text-violet-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Link Input */}
                {platform === 'custom' && (
                  <div className="space-y-2 animation-fade-in">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60 ml-1">Meeting Link (Optional)</label>
                    <input
                      type="url"
                      value={customLink}
                      onChange={(e) => setCustomLink(e.target.value)}
                      placeholder="https://meet.google.com/... or https://teams.microsoft.com/..."
                      className="w-full px-5 py-4 bg-[#1E293B] border-2 border-slate-700 rounded-2xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
                    />
                  </div>
                )}

                {/* Breaks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60 ml-1 flex items-center gap-2">
                      <Coffee size={12} />
                      Custom Breaks
                    </label>
                    <button
                      onClick={handleAddBreak}
                      className="text-[10px] font-black uppercase tracking-widest text-violet-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Break
                    </button>
                  </div>

                  {breaks.map((brk, idx) => (
                    <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3 animation-fade-in">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={brk.label}
                          onChange={(e) => handleBreakChange(idx, 'label', e.target.value)}
                          placeholder="Break label"
                          className="bg-transparent text-sm text-white font-bold focus:outline-none border-none placeholder:text-slate-600 flex-1"
                        />
                        <button
                          onClick={() => handleRemoveBreak(idx)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="time"
                          value={brk.start_time}
                          onChange={(e) => handleBreakChange(idx, 'start_time', e.target.value)}
                          className="flex-1 px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                        />
                        <span className="text-slate-500 self-center text-xs font-bold">TO</span>
                        <input
                          type="time"
                          value={brk.end_time}
                          onChange={(e) => handleBreakChange(idx, 'end_time', e.target.value)}
                          className="flex-1 px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ──── RIGHT: Candidate Selection + Preview ──── */}
            <div className="flex-1 space-y-6 min-w-0">
              {/* Candidate Selection Panel */}
              <div className="bg-[#0A0A0B] border border-slate-800 rounded-[40px] p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-500/10 rounded-2xl text-primary-400 border border-primary-500/20">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Select Candidates</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedCandidateIds.length} of {candidates.length} selected</p>
                    </div>
                  </div>
                  <button
                    onClick={selectAllCandidates}
                    className="text-[10px] font-black uppercase tracking-widest text-primary-400 hover:text-white transition-colors px-3 py-1.5 border border-primary-500/20 rounded-lg hover:bg-primary-500/10"
                  >
                    {selectedCandidateIds.length === candidates.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {loadingCandidates ? (
                  <div className="py-12 flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-primary-500 animate-spin" />
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Loading candidates...</p>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="py-12 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                    <Users size={40} className="mx-auto text-slate-700 mb-3" />
                    <p className="text-sm text-slate-400 font-bold">No shortlisted candidates found</p>
                    <p className="text-xs text-slate-600 mt-1">Shortlist candidates from the Candidates page first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {candidates.map(c => (
                      <div
                        key={c.id}
                        onClick={() => toggleCandidate(c.id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all group ${
                          selectedCandidateIds.includes(c.id)
                            ? 'bg-violet-500/10 border-violet-500/30 text-white'
                            : 'bg-white/[0.02] border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                          selectedCandidateIds.includes(c.id)
                            ? 'bg-violet-500 border-violet-500'
                            : 'border-slate-700 group-hover:border-violet-500/50'
                        }`}>
                          {selectedCandidateIds.includes(c.id) && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-black text-sm shrink-0">
                          {c.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{c.full_name}</p>
                          <p className="text-[10px] text-slate-500 font-medium truncate">{c.email}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                          selectedCandidateIds.includes(c.id)
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {c.pipeline_status?.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview Panel */}
              {step === 'preview' && previewSlots && (
                <div className="bg-[#0A0A0B] border border-violet-500/20 rounded-[40px] p-8 shadow-xl animation-fade-in">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
                      <Timer size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Slot Preview</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {previewSlots.available_slots} slots available · {selectedCandidateIds.length} candidates selected
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                    {previewSlots.slots.slice(0, selectedCandidateIds.length).map((slot, idx) => {
                      const candidate = candidates.find(c => c.id === selectedCandidateIds[idx]);
                      
                      if (editingPreviewIdx === idx) {
                        return (
                          <div key={idx} className="flex flex-col gap-3 p-4 bg-white/[0.05] border border-violet-500/30 rounded-xl animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-black text-xs shrink-0">
                                {idx + 1}
                              </div>
                              <p className="text-sm font-bold text-white truncate">{candidate?.full_name || 'Candidate'}</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 items-center">
                              <input
                                type="date"
                                value={previewEditDate}
                                onChange={(e) => setPreviewEditDate(e.target.value)}
                                className="px-2 py-1.5 bg-[#1E293B] border border-slate-700 rounded-lg text-xs text-white font-bold focus:outline-none focus:border-violet-500/50"
                                style={{ colorScheme: 'dark' }}
                              />
                              <input
                                type="time"
                                value={previewEditStart}
                                onChange={(e) => setPreviewEditStart(e.target.value)}
                                className="px-2 py-1.5 bg-[#1E293B] border border-slate-700 rounded-lg text-xs text-white font-bold focus:outline-none focus:border-violet-500/50"
                                style={{ colorScheme: 'dark' }}
                              />
                              <span className="text-slate-500 text-xs font-bold">to</span>
                              <input
                                type="time"
                                value={previewEditEnd}
                                onChange={(e) => setPreviewEditEnd(e.target.value)}
                                className="px-2 py-1.5 bg-[#1E293B] border border-slate-700 rounded-lg text-xs text-white font-bold focus:outline-none focus:border-violet-500/50"
                                style={{ colorScheme: 'dark' }}
                              />
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingPreviewIdx(null)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-lg border border-white/5 transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSavePreviewSlotEdit(idx)}
                                className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-[10px] font-black uppercase tracking-widest text-white rounded-lg shadow-lg shadow-violet-500/20 transition-all"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={idx} className="flex items-center justify-between gap-4 p-3 bg-white/[0.03] border border-white/5 hover:border-violet-500/20 rounded-xl group/slot transition-all duration-300">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-black text-xs shrink-0">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{candidate?.full_name || 'Candidate'}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {new Date(slot.start).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-mono font-bold text-violet-400 bg-violet-500/5 px-2.5 py-1 rounded-lg border border-violet-500/10">
                              {slot.start_display} — {slot.end_display}
                            </span>
                            <button
                              onClick={() => handleStartEditPreviewSlot(idx, slot)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-violet-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/slot:opacity-100 duration-300"
                              title="Edit Time/Date"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => { setStep('configure'); setPreviewSlots(null); }}
                      className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                    >
                      Modify
                    </button>
                    <button
                      onClick={handleCreateSchedule}
                      disabled={isGenerating}
                      className="flex-1 py-4 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-violet-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      {isGenerating ? 'Creating...' : 'Create Schedule'}
                    </button>
                  </div>
                </div>
              )}

              {/* Generate Button (visible only in configure step) */}
              {step === 'configure' && (
                <button
                  onClick={handlePreview}
                  disabled={isGenerating || selectedCandidateIds.length === 0 || !scheduleDate}
                  className="w-full py-5 bg-gradient-to-r from-violet-500 to-violet-600 rounded-[32px] text-white font-black uppercase tracking-[0.3em] text-sm shadow-[0_15px_40px_rgba(139,92,246,0.25)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-4"
                >
                  {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <CalendarDays size={20} />}
                  {isGenerating ? 'Generating Slots...' : `Generate ${selectedCandidateIds.length} Interview Slots`}
                </button>
              )}

              {/* Existing Schedules */}
              {existingSchedules.length > 0 && step === 'configure' && (
                <div className="bg-[#0A0A0B] border border-slate-800 rounded-[40px] p-8 shadow-xl">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-4 flex items-center gap-3">
                    <Clock size={16} className="text-slate-500" />
                    Previous Schedules
                  </h3>
                  <div className="space-y-2">
                    {existingSchedules.map(s => (
                      <div
                        key={s.id}
                        onClick={() => { setCreatedScheduleId(s.id); setStep('done'); }}
                        className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-violet-500/20 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 group-hover:scale-110 transition-transform">
                            <CalendarDays size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{formatDate(s.schedule_date)}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                              {s.start_time} — {s.end_time} · {s.total_slots} slots · {s.emails_sent} emails sent
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                            s.status === 'completed'
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                          }`}>
                            {s.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to delete this schedule? This will permanently delete all generated slots and meeting details.")) {
                                deleteSchedule.mutate(s.id);
                              }
                            }}
                            disabled={deleteSchedule.isPending}
                            className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-all"
                            title="Delete Schedule"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleMeetingPage;
