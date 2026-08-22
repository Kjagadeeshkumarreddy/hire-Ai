import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Upload, FileText, CheckCircle2, 
  Loader2, Sparkles, Copy, Check, Rocket, Wand2, Send, MessageSquare, User, Bot, Type, Palette,
  LayoutGrid, FileUp, X, ChevronLeft, ChevronRight, Eye, Download, ChevronDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import apiClient from '../api/client';
import TemplateCard from '../components/resume/TemplateCard';

const templateColors = {
  modern_minimal: {
    headerBg: 'linear-gradient(135deg, #6366f1, #818cf8)',
    headerText: '#ffffff',
    pageBg: '#ffffff',
    h1Color: '#1e1b4b',
    h2Color: '#4338ca',
    h3Color: '#3730a3',
    bodyText: '#334155',
    accent: '#6366f1',
    border: '#e0e7ff',
    badgeBg: '#eef2ff',
    hrColor: '#c7d2fe',
    tableBg: '#f5f3ff',
  },
  corporate_professional: {
    headerBg: 'linear-gradient(135deg, #1a365d, #2b4c7e)',
    headerText: '#ffffff',
    pageBg: '#ffffff',
    h1Color: '#1a365d',
    h2Color: '#1a365d',
    h3Color: '#2c5282',
    bodyText: '#2d3748',
    accent: '#2b6cb0',
    border: '#bee3f8',
    badgeBg: '#ebf8ff',
    hrColor: '#90cdf4',
    tableBg: '#ebf8ff',
  },
  creative_designer: {
    headerBg: 'linear-gradient(135deg, #831843, #be185d)',
    headerText: '#ffffff',
    pageBg: '#1a1a2e',
    h1Color: '#f9a8d4',
    h2Color: '#ec4899',
    h3Color: '#f472b6',
    bodyText: '#cbd5e1',
    accent: '#ec4899',
    border: '#4a1942',
    badgeBg: '#500724',
    hrColor: '#831843',
    tableBg: '#1e1233',
  },
  tech_engineering: {
    headerBg: 'linear-gradient(135deg, #064e3b, #047857)',
    headerText: '#ffffff',
    pageBg: '#0d1117',
    h1Color: '#34d399',
    h2Color: '#10b981',
    h3Color: '#6ee7b7',
    bodyText: '#94a3b8',
    accent: '#10b981',
    border: '#1e3a2f',
    badgeBg: '#052e16',
    hrColor: '#065f46',
    tableBg: '#0a1f16',
  },
  academic_research: {
    headerBg: 'linear-gradient(135deg, #5b21b6, #7c3aed)',
    headerText: '#ffffff',
    pageBg: '#fffef8',
    h1Color: '#3b0764',
    h2Color: '#6d28d9',
    h3Color: '#7c3aed',
    bodyText: '#374151',
    accent: '#7c3aed',
    border: '#ddd6fe',
    badgeBg: '#f5f3ff',
    hrColor: '#c4b5fd',
    tableBg: '#faf5ff',
  },
  executive_leadership: {
    headerBg: 'linear-gradient(135deg, #92400e, #b45309)',
    headerText: '#ffffff',
    pageBg: '#ffffff',
    h1Color: '#78350f',
    h2Color: '#b45309',
    h3Color: '#d97706',
    bodyText: '#374151',
    accent: '#d97706',
    border: '#fde68a',
    badgeBg: '#fffbeb',
    hrColor: '#fbbf24',
    tableBg: '#fffbeb',
  },
};

const paletteColors = {
  'text-blue-900': {
    pageBg: '#ffffff',
    h1Color: '#1e3a8a',
    h2Color: '#1e3a8a',
    h3Color: '#2563eb',
    bodyText: '#1e293b',
    accent: '#3b82f6',
    border: '#dbeafe',
    badgeBg: '#eff6ff',
    hrColor: '#bfdbfe',
    tableBg: '#eff6ff',
  },
  'text-emerald-900': {
    pageBg: '#ffffff',
    h1Color: '#064e3b',
    h2Color: '#064e3b',
    h3Color: '#059669',
    bodyText: '#1f2937',
    accent: '#10b981',
    border: '#d1fae5',
    badgeBg: '#ecfdf5',
    hrColor: '#a7f3d0',
    tableBg: '#ecfdf5',
  },
  'text-slate-900': {
    pageBg: '#ffffff',
    h1Color: '#0f172a',
    h2Color: '#1e293b',
    h3Color: '#334155',
    bodyText: '#334155',
    accent: '#0d9488',
    border: '#e2e8f0',
    badgeBg: '#f8fafc',
    hrColor: '#cbd5e1',
    tableBg: '#f8fafc',
  },
  'text-indigo-900': {
    pageBg: '#ffffff',
    h1Color: '#31108f',
    h2Color: '#4338ca',
    h3Color: '#4f46e5',
    bodyText: '#1e293b',
    accent: '#6366f1',
    border: '#e0e7ff',
    badgeBg: '#eef2ff',
    hrColor: '#c7d2fe',
    tableBg: '#eef2ff',
  }
};

const StyleTransformerPage = ({ defaultTab = 'gallery' }) => {
  const { t } = useTranslation();

  // Tab state
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync activeTab with defaultTab prop changes from router
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Gallery mode states
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef(null);
  const scrollLockRef = useRef(false); // Prevents scroll listener from fighting programmatic scrolls

  // Carousel navigation
  const scrollToIndex = useCallback((index) => {
    const container = carouselRef.current;
    if (!container) return;
    const cards = container.querySelectorAll('[data-template-card]');
    if (!cards[index]) return;

    // Lock scroll detection during programmatic scroll
    scrollLockRef.current = true;
    setCarouselIndex(index);

    const card = cards[index];
    const containerWidth = container.offsetWidth;
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    let targetScroll = cardCenter - containerWidth / 2;

    // Clamp to valid scroll range
    const maxScroll = container.scrollWidth - containerWidth;
    targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

    container.scrollTo({ left: targetScroll, behavior: 'smooth' });

    // Unlock after scroll animation completes
    setTimeout(() => { scrollLockRef.current = false; }, 600);
  }, []);

  const handlePrev = () => {
    const newIndex = Math.max(0, carouselIndex - 1);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(templates.length - 1, carouselIndex + 1);
    scrollToIndex(newIndex);
  };

  // Detect which card is centered after MANUAL scroll only
  useEffect(() => {
    const container = carouselRef.current;
    if (!container || templates.length === 0) return;
    let timeout;
    const handleScroll = () => {
      // Skip detection during programmatic scrolls
      if (scrollLockRef.current) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const cards = container.querySelectorAll('[data-template-card]');
        const containerCenter = container.scrollLeft + container.offsetWidth / 2;
        const maxScroll = container.scrollWidth - container.offsetWidth;
        const currentScroll = container.scrollLeft;

        // If scrolled to the very end, select the last card
        if (currentScroll >= maxScroll - 10) {
          setCarouselIndex(cards.length - 1);
          return;
        }
        // If scrolled to the very start, select the first card
        if (currentScroll <= 10) {
          setCarouselIndex(0);
          return;
        }

        let closest = 0;
        let minDist = Infinity;
        cards.forEach((card, i) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const dist = Math.abs(containerCenter - cardCenter);
          if (dist < minDist) { minDist = dist; closest = i; }
        });
        setCarouselIndex(closest);
      }, 80);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [templates]);

  // Shared states
  const [transferSourceResume, setTransferSourceResume] = useState(null);
  const [templateResume, setTemplateResume] = useState(null); // For custom upload mode
  const [transferJobId, setTransferJobId] = useState(null);
  const [transferProgress, setTransferProgress] = useState(null);
  const [transferStatus, setTransferStatus] = useState('idle'); // idle, processing, completed, failed
  const [convertedResume, setConvertedResume] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState('visual'); // 'visual' or 'raw'
  const [styleConfig, setStyleConfig] = useState(null);
  const [previewSettings, setPreviewSettings] = useState({
    fontFamily: 'font-sans',
    fontSize: '16px', 
    headingColor: 'text-slate-900',
    headingFont: 'font-sans'
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Click outside to close download dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDownloadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (format) => {
    setIsDownloading(true);
    setShowDownloadDropdown(false);
    try {
      const themeId = activeTab === 'gallery' ? selectedTemplateId : previewSettings.headingColor;
      
      const response = await apiClient.post('/style-transfer/download', {
        markdown: convertedResume,
        format: format,
        theme_id: themeId || 'text-slate-900',
        font_family: previewSettings.fontFamily,
        font_size: previewSettings.fontSize
      }, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      let extension = 'md';
      if (format === 'pdf') extension = 'pdf';
      else if (format === 'docx') extension = 'docx';
      
      link.setAttribute('download', `Transformed_Resume.${extension}`);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download resume. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Chat/Refine States
  const [chatMessage, setChatMessage] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  // Template Preview Modal states
  const [previewModal, setPreviewModal] = useState({ open: false, templateId: null, markdown: '', meta: null, loading: false });

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const { data } = await apiClient.get('/style-transfer/templates');
        setTemplates(data.templates || []);
      } catch (err) {
        console.error("Failed to fetch templates", err);
      } finally {
        setTemplatesLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(convertedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Gallery mode: transform with selected template
  const handleGalleryTransfer = async () => {
    if (!transferSourceResume || !selectedTemplateId) {
      alert("Please upload your resume and select a template.");
      return;
    }

    setTransferStatus('processing');
    setConvertedResume('');
    setChatHistory([]);
    const formData = new FormData();
    formData.append('candidate', transferSourceResume);

    try {
      const { data } = await apiClient.post(
        `/style-transfer/transform-with-template?template_id=${selectedTemplateId}`, 
        formData
      );
      setTransferJobId(data.job_id);
    } catch (_err) {
      alert("Transformation failed to start.");
      setTransferStatus('failed');
    }
  };

  // Custom mode: transform with uploaded template  
  const handleCustomTransfer = async () => {
    if (!transferSourceResume || !templateResume) {
      alert("Please upload both your resume and a style template.");
      return;
    }

    setTransferStatus('processing');
    setConvertedResume('');
    setChatHistory([]);
    const formData = new FormData();
    formData.append('candidate', transferSourceResume);
    formData.append('template', templateResume);

    try {
      const { data } = await apiClient.post('/style-transfer/transform', formData);
      setTransferJobId(data.job_id);
    } catch (_err) {
      alert("Transformation failed to start.");
      setTransferStatus('failed');
    }
  };

  const handleRefine = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || isRefining) return;

    const userMsg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsRefining(true);

    try {
      const { data } = await apiClient.post('/style-transfer/refine', {
        current_markdown: convertedResume,
        instruction: userMsg
      });
      
      setConvertedResume(data.updated_markdown);
      setChatHistory(prev => [...prev, { role: 'bot', content: "I've updated your resume based on your request!" }]);
    } catch (_err) {
      alert("Refinement failed. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  // Poll job status
  useEffect(() => {
    let interval;
    if (transferJobId && transferStatus === 'processing') {
      interval = setInterval(async () => {
        try {
          const { data } = await apiClient.get(`/style-transfer/job/${transferJobId}`);
          setTransferProgress(data.progress);
          if (data.status === 'completed') {
            setConvertedResume(data.output_markdown);
            setStyleConfig(data.style_config);
            setTransferStatus('completed');
            setTransferJobId(null);
            clearInterval(interval);
          } else if (data.status === 'failed') {
            setTransferStatus('failed');
            setTransferJobId(null);
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Polling failed", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [transferJobId, transferStatus]);

  const _getHeadingStyles = () => {
    let classes = `${previewSettings.headingColor} ${previewSettings.headingFont} `;
    if (styleConfig?.visual_theme) {
      const theme = styleConfig.visual_theme;
      const casing = theme["Casing"]?.toLowerCase() || "";
      if (casing.includes("all caps")) classes += "uppercase ";
      else classes += "capitalize ";
    } else if (!previewSettings.headingColor.includes("slate")) {
      /* default heading style */
    } else {
       classes += "uppercase ";
    }
    return classes.trim();
  };

  const handleResetTransform = () => {
    setTransferStatus('idle');
    setConvertedResume('');
    setTransferJobId(null);
    setTransferProgress(null);
    setChatHistory([]);
    setStyleConfig(null);
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const finalColor = activeTab === 'gallery' && selectedTemplateId
    ? (templateColors[selectedTemplateId] || templateColors.modern_minimal)
    : (paletteColors[previewSettings.headingColor] || paletteColors['text-slate-900']);

  const isDark = activeTab === 'gallery' && ['creative_designer', 'tech_engineering'].includes(selectedTemplateId);


  // Template Preview Handler
  const handlePreviewTemplate = async (templateId) => {
    setPreviewModal({ open: true, templateId, markdown: '', meta: null, loading: true });
    try {
      const { data } = await apiClient.get(`/style-transfer/templates/${templateId}/preview`);
      setPreviewModal({ open: true, templateId, markdown: data.markdown, meta: data.template, loading: false });
    } catch (err) {
      console.error('Preview fetch failed', err);
      setPreviewModal(prev => ({ ...prev, loading: false, markdown: '### Failed to load template preview.' }));
    }
  };

  const canTransform = activeTab === 'gallery' 
    ? transferSourceResume && selectedTemplateId 
    : transferSourceResume && templateResume;

  return (
    <>
    <div className="p-4 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header section with vibrant gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 to-indigo-600 p-10 text-white shadow-2xl shadow-primary-500/20">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
               <Wand2 size={24} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest uppercase opacity-80">
              {activeTab === 'gallery' ? t('styleTransformer.galleryBadge') : t('styleTransformer.customBadge')}
            </span>
          </div>
          <h1 className="text-3xl font-black mb-2">
            {activeTab === 'gallery' ? t('styleTransformer.galleryTitle') : t('styleTransformer.customTitle')}
          </h1>
          <p className="text-primary-100 max-w-xl text-lg">
            {activeTab === 'gallery' ? t('styleTransformer.galleryDesc') : t('styleTransformer.customDesc')}
          </p>
        </div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-indigo-400/10 rounded-full -mb-10 blur-2xl" />
      </div>

      {/* Main Content */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        
        <div className="p-8">

          {/* ─── Resume Upload (shared between both tabs) ─── */}
          <div className="mb-8">
            <label className="text-sm font-bold text-text-muted uppercase tracking-wider block mb-3">{t('styleTransformer.sourceResume')}</label>
            <input 
              id="transformer-resume-upload" 
              type="file" 
              className="hidden"
              onChange={(e) => setTransferSourceResume(e.target.files[0])}
              accept=".pdf,.docx"
            />
            <div 
              className={`border-2 border-dashed rounded-xl p-6 flex items-center justify-center transition-all cursor-pointer bg-surface-dark/50 ${transferSourceResume ? 'border-primary-500 bg-primary-500/5' : 'border-border hover:border-primary-500'}`}
              onClick={() => document.getElementById('transformer-resume-upload').click()}
            >
              {transferSourceResume ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-primary-400" />
                  <span className="text-primary-400 font-bold text-sm">{transferSourceResume.name}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setTransferSourceResume(null); }}
                    className="p-1 hover:bg-border rounded-lg transition-colors"
                  >
                    <X size={14} className="text-text-muted" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={28} className="text-text-muted" />
                  <span className="text-text-muted font-medium text-sm">{t('studentDash.dragResume')}</span>
                  <span className="text-xs text-text-muted opacity-60">{t('styleTransformer.pdfDocx')}</span>
                </div>
              )}
            </div>
          </div>

          {/* ─── GALLERY TAB ─── */}
          {activeTab === 'gallery' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Choose a Template</label>
                {selectedTemplate && (
                  <span className="text-xs text-primary-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    {selectedTemplate.name} selected
                  </span>
                )}
              </div>

              {templatesLoading ? (
                <div className="flex gap-6 justify-center">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-80 w-64 bg-surface-dark animate-pulse rounded-2xl border border-border/30 shrink-0" />
                  ))}
                </div>
              ) : (
                <div className="relative">
                  {/* Left Arrow */}
                  <button
                    onClick={handlePrev}
                    disabled={carouselIndex === 0}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-surface/90 backdrop-blur-md border border-border rounded-full shadow-xl hover:bg-primary-600 hover:border-primary-500 hover:text-white text-text-muted transition-all disabled:opacity-20 disabled:cursor-not-allowed -ml-3"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Right Arrow */}
                  <button
                    onClick={handleNext}
                    disabled={carouselIndex === templates.length - 1}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-surface/90 backdrop-blur-md border border-border rounded-full shadow-xl hover:bg-primary-600 hover:border-primary-500 hover:text-white text-text-muted transition-all disabled:opacity-20 disabled:cursor-not-allowed -mr-3"
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Fade edges */}
                  <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none rounded-l-2xl" />
                  <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none rounded-r-2xl" />

                  {/* Scrollable Carousel */}
                  <div
                    ref={carouselRef}
                    className="flex gap-5 overflow-x-auto scroll-smooth py-4 no-scrollbar items-start"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {/* Left spacer so first card can center */}
                    <div className="shrink-0" style={{ width: 'calc(50% - 144px)' }} />

                    {templates.map((template, i) => (
                      <div
                        key={template.id}
                        data-template-card
                        className={`shrink-0 transition-all duration-500 ease-out ${
                          i === carouselIndex
                            ? 'w-72 scale-105 opacity-100 z-10'
                            : Math.abs(i - carouselIndex) === 1
                              ? 'w-64 scale-95 opacity-70'
                              : 'w-60 scale-90 opacity-40'
                        }`}
                      >
                        <TemplateCard
                          template={template}
                          isSelected={selectedTemplateId === template.id}
                          onSelect={(id) => { setSelectedTemplateId(id); scrollToIndex(i); }}
                          onPreview={handlePreviewTemplate}
                        />
                      </div>
                    ))}

                    {/* Right spacer so last card can center */}
                    <div className="shrink-0" style={{ width: 'calc(50% - 144px)' }} />
                  </div>

                  {/* Dot Indicators */}
                  <div className="flex justify-center gap-2 mt-4">
                    {templates.map((template, i) => (
                      <button
                        key={template.id}
                        onClick={() => scrollToIndex(i)}
                        className={`rounded-full transition-all duration-300 ${
                          i === carouselIndex
                            ? 'w-6 h-2.5 bg-primary-500 shadow-lg shadow-primary-500/30'
                            : selectedTemplateId === template.id
                              ? 'w-2.5 h-2.5 bg-primary-400/60'
                              : 'w-2.5 h-2.5 bg-border hover:bg-text-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── CUSTOM UPLOAD TAB ─── */}
          {activeTab === 'custom' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-4">
                  <label className="text-sm font-bold text-text-muted uppercase tracking-wider">{t('styleTransformer.styleTemplate')}</label>
                  <input 
                    id="template-upload" 
                    type="file" 
                    className="hidden"
                    onChange={(e) => setTemplateResume(e.target.files[0])}
                    accept=".pdf,.docx"
                  />
                  <div 
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer bg-surface-dark/50 ${templateResume ? 'border-primary-500 bg-primary-500/5' : 'border-border hover:border-primary-500'}`}
                    onClick={() => document.getElementById('template-upload').click()}
                  >
                    {templateResume ? (
                      <div className="flex items-center gap-2 text-primary-400 font-bold">
                        <CheckCircle2 size={32} />
                        <span className="truncate max-w-[300px]">{templateResume.name}</span>
                      </div>
                    ) : (
                      <>
                        <FileText size={32} className="text-text-muted mb-2" />
                        <span className="text-sm text-text-muted font-medium">{t('styleTransformer.uploadStyleTemplate')}</span>
                        <span className="text-xs text-text-muted mt-1 opacity-60">{t('styleTransformer.visualWritingStyle')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Pro Tips */}
                <div className="space-y-6">
                  <div className="bg-primary-500/5 border border-primary-500/10 rounded-2xl p-6 h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary-500/20 rounded-lg">
                         <Rocket size={18} className="text-primary-400" />
                      </div>
                      <h3 className="font-bold text-white text-sm">{t('styleTransformer.proTips')}</h3>
                    </div>
                    <ul className="text-xs text-text-muted space-y-4 leading-relaxed italic opacity-80 list-disc pl-4">
                      <li>{t('styleTransformer.tip1')}</li>
                      <li>{t('styleTransformer.tip2')}</li>
                      <li>{t('styleTransformer.tip3')}</li>
                      <li>{t('styleTransformer.tip4')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Processing State ─── */}
          {transferStatus === 'processing' && (
            <div className="mt-6 bg-surface-dark p-6 rounded-xl border border-border space-y-4 animate-pulse">
              <div className="flex justify-between items-center text-xs">
                <span className="text-primary-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {transferProgress?.current_step?.replace(/_/g, ' ') || 'Starting...'}
                </span>
                {transferProgress?.total_sections && (
                  <span className="text-text-muted font-mono">
                    {transferProgress.completed_sections} / {transferProgress.total_sections}
                  </span>
                )}
              </div>
              <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary-500 h-full transition-all duration-500" 
                  style={{ width: `${(transferProgress?.completed_sections / transferProgress?.total_sections) * 100 || 30}%` }}
                />
              </div>
            </div>
          )}

          {/* ─── Transform Button ─── */}
          {transferStatus !== 'completed' && (
            <button 
              onClick={activeTab === 'gallery' ? handleGalleryTransfer : handleCustomTransfer}
              disabled={transferStatus === 'processing' || !canTransform}
              className="mt-6 w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transferStatus === 'processing' ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  {t('styleTransformer.executing')}
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  {t('styleTransformer.transferFlawlessly')}
                </>
              )}
            </button>
          )}

          {/* ─── RESULTS: Preview + Chat ─── */}
          {transferStatus === 'completed' && convertedResume && (
            <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-500">
              <div className="xl:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-white font-bold flex items-center gap-2">
                     <CheckCircle2 size={18} className="text-green-500" />
                     {t('styleTransformer.transformedResume')}
                   </h3>
                   <div className="flex gap-2">
                     <button 
                      onClick={() => setPreviewMode(previewMode === 'visual' ? 'raw' : 'visual')}
                      className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-all border ${
                        previewMode === 'raw' 
                        ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-600/20' 
                        : 'bg-surface-dark border-border text-text-muted hover:bg-border'
                      }`}
                     >
                       {previewMode === 'raw' ? <Wand2 size={14} /> : <FileText size={14} />}
                       {previewMode === 'raw' ? t('styleTransformer.viewPreview') : t('styleTransformer.viewRawCode')}
                     </button>
                     <button 
                      onClick={handleCopy}
                      className="flex items-center gap-2 text-xs font-bold bg-surface-dark border border-border px-3 py-2 rounded-lg hover:bg-border transition-all text-text-muted"
                     >
                       {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                       {copied ? t('jdBuilder.copied') : t('styleTransformer.copyMarkdown')}
                     </button>
                     <div className="relative" ref={dropdownRef}>
                       <button 
                        onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                        disabled={isDownloading}
                        className="flex items-center gap-2 text-xs font-bold bg-primary-600 border border-primary-500 px-3 py-2 rounded-lg hover:bg-primary-500 transition-all text-white shadow-lg shadow-primary-600/20 disabled:opacity-50"
                       >
                         {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                         {isDownloading ? t('styleTransformer.downloading') : t('styleTransformer.download')}
                         <ChevronDown size={12} className="opacity-80" />
                       </button>
                       {showDownloadDropdown && (
                         <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-2xl z-30 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                           <button
                             onClick={() => handleDownload('pdf')}
                             className="w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg text-slate-200 hover:bg-primary-600 hover:text-white transition-all flex flex-col gap-0.5"
                           >
                             <span>{t('styleTransformer.downloadPdf')}</span>
                             <span className="text-[10px] text-text-muted font-normal hover:text-primary-100">Best layout preservation & colors</span>
                           </button>
                           <button
                             onClick={() => handleDownload('docx')}
                             className="w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg text-slate-200 hover:bg-primary-600 hover:text-white transition-all flex flex-col gap-0.5 mt-1"
                           >
                             <span>{t('styleTransformer.downloadDocx')}</span>
                             <span className="text-[10px] text-text-muted font-normal hover:text-primary-100">Fully editable Word format</span>
                           </button>
                           <button
                             onClick={() => handleDownload('markdown')}
                             className="w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg text-slate-200 hover:bg-primary-600 hover:text-white transition-all flex flex-col gap-0.5 mt-1"
                           >
                             <span>{t('styleTransformer.downloadMd')}</span>
                             <span className="text-[10px] text-text-muted font-normal hover:text-primary-100 font-sans">Raw markdown source</span>
                           </button>
                         </div>
                       )}
                     </div>
                     <button
                       onClick={handleResetTransform}
                       className="flex items-center gap-2 text-xs font-bold bg-surface-dark border border-border px-3 py-2 rounded-lg hover:bg-border transition-all text-text-muted"
                     >
                       <Sparkles size={14} />
                       Try Another
                     </button>
                   </div>
                </div>
                <div className="border border-border rounded-xl shadow-inner custom-scrollbar overflow-auto max-h-[800px]" style={{ backgroundColor: finalColor.pageBg }}>
                  {previewMode === 'visual' ? (
                    <div className="space-y-0">
                      {/* Visual Style Toolbar */}
                      <div className="bg-slate-50 border-b border-slate-100 p-3 flex flex-wrap items-center gap-4 sticky top-0 z-20">
                        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                           <Type size={14} className="text-slate-400" />
                           <select 
                             value={previewSettings.fontFamily}
                             onChange={(e) => setPreviewSettings({...previewSettings, fontFamily: e.target.value, headingFont: e.target.value})}
                             className="text-[10px] font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none text-slate-600"
                           >
                             <option value="font-sans">{t('styleTransformer.modernSans')}</option>
                             <option value="font-serif">{t('styleTransformer.classicSerif')}</option>
                             <option value="font-mono">{t('styleTransformer.techMono')}</option>
                           </select>
                        </div>

                        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('styleTransformer.size')}</span>
                           <select 
                             value={previewSettings.fontSize}
                             onChange={(e) => setPreviewSettings({...previewSettings, fontSize: e.target.value})}
                             className="text-[10px] font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none text-slate-600"
                           >
                             <option value="14px">{t('styleTransformer.std14px')}</option>
                             <option value="16px">{t('styleTransformer.norm16px')}</option>
                             <option value="18px">{t('styleTransformer.large18px')}</option>
                             <option value="20px">{t('styleTransformer.xl20px')}</option>
                           </select>
                        </div>

                        <div className="flex items-center gap-2">
                           <Palette size={14} className="text-slate-400" />
                           <div className="flex gap-1.5">
                             {[
                               { name: t('styleTransformer.navy'), class: 'text-blue-900' },
                               { name: t('styleTransformer.emerald'), class: 'text-emerald-900' },
                               { name: t('styleTransformer.slate'), class: 'text-slate-900' },
                               { name: t('styleTransformer.indigo'), class: 'text-indigo-900' }
                             ].map((col) => (
                               <button
                                 key={col.name}
                                 onClick={() => setPreviewSettings({...previewSettings, headingColor: col.class})}
                                 className={`w-4 h-4 rounded-full border border-white shadow-sm transition-all hover:scale-110 ${col.class.replace('text-', 'bg-')} ${previewSettings.headingColor === col.class ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
                                 title={col.name}
                               />
                             ))}
                           </div>
                        </div>
                      </div>

                      <div 
                        className={`markdown-preview p-10 ${previewSettings.fontFamily}`}
                        style={{ backgroundColor: finalColor.pageBg, color: finalColor.bodyText }}
                      >
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node: _node, ...props}) => <h1 style={{ fontSize: `calc(${previewSettings.fontSize} * 2.0)`, fontWeight: 800, color: finalColor.h1Color, marginBottom: '8px', paddingBottom: '12px', borderBottom: `3px solid ${finalColor.border}`, letterSpacing: '-0.5px' }} {...props} />,
                            h2: ({node: _node, ...props}) => <h2 style={{ fontSize: `calc(${previewSettings.fontSize} * 1.4)`, fontWeight: 700, color: finalColor.h2Color, marginTop: '28px', marginBottom: '12px', paddingBottom: '6px', borderBottom: `1px solid ${finalColor.border}`, textTransform: 'uppercase', letterSpacing: '1px' }} {...props} />,
                            h3: ({node: _node, ...props}) => <h3 style={{ fontSize: `calc(${previewSettings.fontSize} * 1.15)`, fontWeight: 700, color: finalColor.h3Color, marginTop: '20px', marginBottom: '6px' }} {...props} />,
                            h4: ({node: _node, ...props}) => <h4 style={{ fontSize: previewSettings.fontSize, fontWeight: 600, color: finalColor.accent, fontStyle: 'italic', marginTop: '12px', marginBottom: '4px' }} {...props} />,
                            p: ({node: _node, ...props}) => <p style={{ fontSize: previewSettings.fontSize, color: finalColor.bodyText, lineHeight: '1.7', marginBottom: '12px' }} {...props} />,
                            li: ({node: _node, ...props}) => <li style={{ fontSize: previewSettings.fontSize, color: finalColor.bodyText, lineHeight: '1.6', marginBottom: '4px' }} {...props} />,
                            ul: ({node: _node, ...props}) => <ul style={{ paddingLeft: '20px', marginBottom: '16px', listStyleType: 'disc' }} {...props} />,
                            ol: ({node: _node, ...props}) => <ol style={{ paddingLeft: '20px', marginBottom: '16px', listStyleType: 'decimal' }} {...props} />,
                            strong: ({node: _node, ...props}) => <strong style={{ fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }} {...props} />,
                            em: ({node: _node, ...props}) => <em style={{ color: finalColor.accent, fontStyle: 'italic' }} {...props} />,
                            hr: ({node: _node, ...props}) => <hr style={{ border: 'none', borderTop: `1px solid ${finalColor.hrColor}`, margin: '20px 0' }} {...props} />,
                            a: ({node: _node, ...props}) => <a style={{ color: finalColor.accent, textDecoration: 'underline' }} {...props} />,
                            table: ({node: _node, ...props}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }} {...props} />,
                            th: ({node: _node, ...props}) => <th style={{ textAlign: 'left', padding: '8px 12px', backgroundColor: finalColor.tableBg, borderBottom: `2px solid ${finalColor.border}`, fontWeight: 700, color: finalColor.h2Color }} {...props} />,
                            td: ({node: _node, ...props}) => <td style={{ padding: '8px 12px', borderBottom: `1px solid ${finalColor.border}`, color: finalColor.bodyText }} {...props} />,
                            blockquote: ({node: _node, ...props}) => <blockquote style={{ borderLeft: `3px solid ${finalColor.accent}`, paddingLeft: '16px', margin: '16px 0', color: finalColor.bodyText, fontStyle: 'italic', backgroundColor: finalColor.badgeBg, padding: '12px 16px', borderRadius: '0 8px 8px 0' }} {...props} />,
                          }}
                        >
                          {convertedResume}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0d1117] min-h-[500px]">
                      <textarea
                        value={convertedResume}
                        onChange={(e) => setConvertedResume(e.target.value)}
                        spellCheck="false"
                        className="w-full min-h-[600px] p-10 bg-transparent text-xs text-[#c9d1d9] whitespace-pre-wrap font-mono leading-relaxed focus:outline-none resize-none custom-scrollbar"
                        placeholder={t('styleTransformer.markdownPlaceholder')}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* AI Refinement Chat */}
              <div className="flex flex-col bg-surface-dark border border-border rounded-2xl overflow-hidden h-[600px] xl:h-auto max-h-[800px]">
                <div className="p-4 bg-primary-600/10 border-b border-border flex items-center gap-2">
                  <MessageSquare size={18} className="text-primary-500" />
                  <span className="font-bold text-sm text-white uppercase tracking-widest">{t('styleTransformer.chatAssistant')}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-8 space-y-2 opacity-50">
                      <Bot size={32} className="mx-auto mb-2 text-primary-500" />
                      <p className="text-xs font-bold text-white">{t('styleTransformer.readyToRefine')}</p>
                      <p className="text-[10px] text-text-muted">{t('styleTransformer.refineDesc')}</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-primary-600 text-white rounded-tr-none' 
                          : 'bg-surface border border-border text-slate-200 rounded-tl-none'
                      }`}>
                        <div className="flex items-center gap-1 mb-1 opacity-60">
                          {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                          <span className="text-[8px] font-bold uppercase">{msg.role === 'user' ? 'You' : 'AI Assistant'}</span>
                        </div>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isRefining && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-surface border border-border text-text-muted rounded-2xl rounded-tl-none px-4 py-2 text-xs">
                        <Loader2 size={14} className="animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleRefine} className="p-4 bg-surface border-t border-border">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder={t('styleTransformer.requestChange')}
                      className="w-full bg-white border border-border rounded-xl pl-4 pr-12 py-3 text-xs focus:outline-none focus:border-primary-500 transition-all text-black"
                    />
                    <button 
                      type="submit"
                      disabled={!chatMessage.trim() || isRefining}
                      className="absolute right-2 top-1.5 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-all disabled:opacity-50"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ─── TEMPLATE PREVIEW MODAL ─── */}
      {previewModal.open && (() => {
        const c = templateColors[previewModal.templateId] || templateColors.modern_minimal;
        const isDark = ['creative_designer', 'tech_engineering'].includes(previewModal.templateId);

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewModal({ open: false, templateId: null, markdown: '', meta: null, loading: false })}
          />

          {/* Modal */}
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
               style={{ backgroundColor: c.pageBg }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
                 style={{ background: c.headerBg }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Eye size={18} style={{ color: c.headerText }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: c.headerText }}>
                    {previewModal.meta?.name || 'Template Preview'}
                  </h3>
                  {previewModal.meta?.category && (
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {previewModal.meta.category} Template
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedTemplateId(previewModal.templateId);
                    setPreviewModal({ open: false, templateId: null, markdown: '', meta: null, loading: false });
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: c.headerText, backdropFilter: 'blur(4px)' }}
                >
                  <CheckCircle2 size={14} />
                  Use This Template
                </button>
                <button
                  onClick={() => setPreviewModal({ open: false, templateId: null, markdown: '', meta: null, loading: false })}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {previewModal.loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={32} className="animate-spin" style={{ color: c.accent }} />
                  <span className="text-sm font-medium" style={{ color: isDark ? '#94a3b8' : '#94a3b8' }}>Loading preview...</span>
                </div>
              ) : (
                <div className="p-8 md:p-12">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node: _node, ...props}) => <h1 style={{ fontSize: '28px', fontWeight: 800, color: c.h1Color, marginBottom: '8px', paddingBottom: '12px', borderBottom: `3px solid ${c.border}`, letterSpacing: '-0.5px' }} {...props} />,
                      h2: ({node: _node, ...props}) => <h2 style={{ fontSize: '20px', fontWeight: 700, color: c.h2Color, marginTop: '28px', marginBottom: '12px', paddingBottom: '6px', borderBottom: `1px solid ${c.border}`, textTransform: 'uppercase', letterSpacing: '1px' }} {...props} />,
                      h3: ({node: _node, ...props}) => <h3 style={{ fontSize: '16px', fontWeight: 700, color: c.h3Color, marginTop: '20px', marginBottom: '6px' }} {...props} />,
                      h4: ({node: _node, ...props}) => <h4 style={{ fontSize: '14px', fontWeight: 600, color: c.accent, fontStyle: 'italic', marginTop: '12px', marginBottom: '4px' }} {...props} />,
                      p: ({node: _node, ...props}) => <p style={{ fontSize: '14px', color: c.bodyText, lineHeight: '1.7', marginBottom: '12px' }} {...props} />,
                      li: ({node: _node, ...props}) => <li style={{ fontSize: '14px', color: c.bodyText, lineHeight: '1.6', marginBottom: '4px' }} {...props} />,
                      ul: ({node: _node, ...props}) => <ul style={{ paddingLeft: '20px', marginBottom: '16px', listStyleType: 'disc' }} {...props} />,
                      ol: ({node: _node, ...props}) => <ol style={{ paddingLeft: '20px', marginBottom: '16px', listStyleType: 'decimal' }} {...props} />,
                      strong: ({node: _node, ...props}) => <strong style={{ fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }} {...props} />,
                      em: ({node: _node, ...props}) => <em style={{ color: c.accent, fontStyle: 'italic' }} {...props} />,
                      hr: ({node: _node, ...props}) => <hr style={{ border: 'none', borderTop: `1px solid ${c.hrColor}`, margin: '20px 0' }} {...props} />,
                      a: ({node: _node, ...props}) => <a style={{ color: c.accent, textDecoration: 'underline' }} {...props} />,
                      table: ({node: _node, ...props}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }} {...props} />,
                      th: ({node: _node, ...props}) => <th style={{ textAlign: 'left', padding: '8px 12px', backgroundColor: c.tableBg, borderBottom: `2px solid ${c.border}`, fontWeight: 700, color: c.h2Color }} {...props} />,
                      td: ({node: _node, ...props}) => <td style={{ padding: '8px 12px', borderBottom: `1px solid ${c.border}`, color: c.bodyText }} {...props} />,
                      blockquote: ({node: _node, ...props}) => <blockquote style={{ borderLeft: `3px solid ${c.accent}`, paddingLeft: '16px', margin: '16px 0', color: c.bodyText, fontStyle: 'italic', backgroundColor: c.badgeBg, padding: '12px 16px', borderRadius: '0 8px 8px 0' }} {...props} />,
                    }}
                  >
                    {previewModal.markdown}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </>
  );
};

export default StyleTransformerPage;
