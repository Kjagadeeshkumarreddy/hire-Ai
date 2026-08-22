import React from 'react';
import { CheckCircle2, Eye } from 'lucide-react';

// ─── Per-template mini resume previews ──────────────────────────────────────
// Each returns a tiny, realistic "document" that matches the template's style.

const MiniPreviews = {
  modern_minimal: () => (
    <div className="w-full h-full bg-white rounded-sm p-3 font-sans text-[4px] leading-[6px] text-slate-700 overflow-hidden">
      <div className="text-center mb-2">
        <div className="text-[7px] font-bold text-slate-900 tracking-wide">Alex Rivera</div>
        <div className="text-[3.5px] text-slate-400 mt-0.5">San Francisco, CA · alex.rivera@email.com · (415) 555-0192</div>
      </div>
      <div className="border-t border-slate-200 my-1.5" />
      <div className="text-[4.5px] font-bold text-slate-800 uppercase tracking-widest mb-0.5">Summary</div>
      <div className="space-y-0.5 mb-1.5">
        <div className="h-[3px] bg-slate-100 rounded-full w-full" />
        <div className="h-[3px] bg-slate-100 rounded-full w-5/6" />
      </div>
      <div className="border-t border-slate-200 my-1.5" />
      <div className="text-[4.5px] font-bold text-slate-800 uppercase tracking-widest mb-0.5">Experience</div>
      <div className="mb-1">
        <div className="flex justify-between">
          <div className="text-[4px] font-bold text-slate-700">Senior Frontend Developer</div>
          <div className="text-[3px] text-slate-400">2022 – Present</div>
        </div>
        <div className="text-[3px] text-slate-400 italic">Nova Digital, San Francisco</div>
        <div className="mt-0.5 space-y-0.5">
          <div className="h-[2.5px] bg-slate-50 rounded-full w-full" />
          <div className="h-[2.5px] bg-slate-50 rounded-full w-11/12" />
        </div>
      </div>
      <div className="mb-1">
        <div className="flex justify-between">
          <div className="text-[4px] font-bold text-slate-700">Software Engineer</div>
          <div className="text-[3px] text-slate-400">2019 – 2021</div>
        </div>
        <div className="text-[3px] text-slate-400 italic">Brightpath Technologies</div>
        <div className="mt-0.5 space-y-0.5">
          <div className="h-[2.5px] bg-slate-50 rounded-full w-full" />
          <div className="h-[2.5px] bg-slate-50 rounded-full w-4/5" />
        </div>
      </div>
      <div className="border-t border-slate-200 my-1.5" />
      <div className="text-[4.5px] font-bold text-slate-800 uppercase tracking-widest mb-0.5">Skills</div>
      <div className="flex flex-wrap gap-0.5">
        {['React', 'TypeScript', 'Node.js', 'Python', 'AWS'].map(s => (
          <span key={s} className="bg-slate-100 text-slate-500 px-1 py-[1px] rounded text-[3px]">{s}</span>
        ))}
      </div>
    </div>
  ),

  corporate_professional: () => (
    <div className="w-full h-full bg-white rounded-sm font-serif text-[4px] leading-[6px] text-slate-700 overflow-hidden">
      <div className="bg-[#1a365d] p-2.5 text-center">
        <div className="text-[7px] font-bold text-white tracking-wider">MARGARET CHEN</div>
        <div className="text-[4px] text-blue-200 mt-0.5 font-sans">Senior Project Manager</div>
        <div className="text-[3px] text-blue-300/70 mt-0.5 font-sans">margaret.chen@email.com · (212) 555-0847 · New York, NY</div>
      </div>
      <div className="p-3">
        <div className="text-[4.5px] font-bold text-[#1a365d] uppercase tracking-wider border-b border-[#1a365d]/20 pb-0.5 mb-1">Professional Summary</div>
        <div className="space-y-0.5 mb-2">
          <div className="h-[3px] bg-slate-100 rounded-full w-full" />
          <div className="h-[3px] bg-slate-100 rounded-full w-5/6" />
        </div>
        <div className="text-[4.5px] font-bold text-[#1a365d] uppercase tracking-wider border-b border-[#1a365d]/20 pb-0.5 mb-1">Experience</div>
        <div className="mb-1">
          <div className="text-[4px] font-bold text-slate-800">Director of Program Management</div>
          <div className="text-[3px] text-[#1a365d] font-sans">GlobalTech Corp · 2021 – Present</div>
          <div className="mt-0.5 space-y-0.5">
            <div className="h-[2.5px] bg-slate-50 rounded-full w-full" />
            <div className="h-[2.5px] bg-slate-50 rounded-full w-11/12" />
          </div>
        </div>
        <div className="mb-1">
          <div className="text-[4px] font-bold text-slate-800">Senior Project Manager</div>
          <div className="text-[3px] text-[#1a365d] font-sans">Meridian Financial · 2017 – 2021</div>
          <div className="mt-0.5 space-y-0.5">
            <div className="h-[2.5px] bg-slate-50 rounded-full w-full" />
            <div className="h-[2.5px] bg-slate-50 rounded-full w-4/5" />
          </div>
        </div>
        <div className="text-[4.5px] font-bold text-[#1a365d] uppercase tracking-wider border-b border-[#1a365d]/20 pb-0.5 mb-1 mt-1.5">Certifications</div>
        <div className="flex flex-wrap gap-0.5">
          {['PMP', 'CSM', 'AWS'].map(s => (
            <span key={s} className="bg-[#1a365d]/10 text-[#1a365d] px-1 py-[1px] rounded text-[3px] font-sans">{s}</span>
          ))}
        </div>
      </div>
    </div>
  ),

  creative_designer: () => (
    <div className="w-full h-full bg-[#1a1a2e] rounded-sm font-sans text-[4px] leading-[6px] text-slate-300 overflow-hidden">
      <div className="p-3 pb-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-[5px] text-white font-bold">JB</div>
          <div>
            <div className="text-[7px] font-black text-white tracking-tight">JORDAN BLAKE</div>
            <div className="text-[3.5px] text-pink-400 font-bold tracking-wider uppercase">UI/UX Designer & Brand Strategist</div>
          </div>
        </div>
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[5px]">🎯</span>
          <div className="text-[4.5px] font-bold text-pink-400 uppercase tracking-wider">Who I Am</div>
        </div>
        <div className="space-y-0.5 mb-2">
          <div className="h-[3px] bg-white/5 rounded-full w-full" />
          <div className="h-[3px] bg-white/5 rounded-full w-4/5" />
        </div>
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[5px]">💼</span>
          <div className="text-[4.5px] font-bold text-pink-400 uppercase tracking-wider">Impact</div>
        </div>
        <div className="mb-1">
          <div className="text-[4px] font-bold text-white">Lead Product Designer</div>
          <div className="text-[3px] text-purple-400">Prism Studios · 2022 – Present</div>
          <div className="mt-0.5 space-y-0.5">
            <div className="flex items-center gap-1"><span className="text-pink-500 text-[4px]">→</span><div className="h-[2.5px] bg-white/5 rounded-full flex-1" /></div>
            <div className="flex items-center gap-1"><span className="text-pink-500 text-[4px]">→</span><div className="h-[2.5px] bg-white/5 rounded-full flex-1 w-5/6" /></div>
          </div>
        </div>
        <div className="flex items-center gap-1 mb-1 mt-1.5">
          <span className="text-[5px]">🛠</span>
          <div className="text-[4.5px] font-bold text-pink-400 uppercase tracking-wider">Toolkit</div>
        </div>
        <div className="flex flex-wrap gap-0.5">
          {['Figma', 'Sketch', 'React', 'Framer'].map(s => (
            <span key={s} className="bg-pink-500/10 text-pink-300 px-1 py-[1px] rounded text-[3px]">{s}</span>
          ))}
        </div>
      </div>
    </div>
  ),

  tech_engineering: () => (
    <div className="w-full h-full bg-[#0d1117] rounded-sm font-mono text-[4px] leading-[6px] text-slate-300 overflow-hidden">
      <div className="p-3">
        <div className="text-[7px] font-bold text-emerald-400 mb-0.5">Priya Kapoor</div>
        <div className="text-[3px] text-slate-500 font-mono">github.com/priyakapoor · linkedin.com/in/priyakapoor · Seattle, WA</div>
        <div className="border-t border-emerald-500/20 my-1.5" />
        
        <div className="text-[4.5px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Technical Skills</div>
        <div className="border border-slate-700/50 rounded overflow-hidden mb-2">
          <div className="flex bg-slate-800/50 text-[3px] text-emerald-500 font-bold">
            <div className="px-1 py-0.5 w-1/3 border-r border-slate-700/50">Category</div>
            <div className="px-1 py-0.5 flex-1">Technologies</div>
          </div>
          {[['Languages', 'Python, C++, Rust, Go'], ['ML/AI', 'PyTorch, TensorFlow'], ['Cloud', 'AWS, GCP']].map(([cat, tech]) => (
            <div key={cat} className="flex text-[3px] border-t border-slate-700/30">
              <div className="px-1 py-0.5 w-1/3 border-r border-slate-700/30 text-slate-400">{cat}</div>
              <div className="px-1 py-0.5 flex-1 text-slate-500">{tech}</div>
            </div>
          ))}
        </div>

        <div className="text-[4.5px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Experience</div>
        <div className="mb-1">
          <div className="flex justify-between">
            <div className="text-[4px] font-bold text-white">Staff Software Engineer</div>
            <div className="text-[3px] text-slate-600 bg-slate-800 px-1 rounded">2022–Present</div>
          </div>
          <div className="text-[3px] text-emerald-600">Quantum Lab, AWS · Seattle, WA</div>
          <div className="mt-0.5 space-y-0.5">
            <div className="h-[2.5px] bg-slate-800 rounded-full w-full" />
            <div className="h-[2.5px] bg-slate-800 rounded-full w-11/12" />
          </div>
        </div>

        <div className="text-[4.5px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5 mt-1.5">Projects</div>
        <div className="text-[3.5px] font-bold text-white">VectorForge <span className="text-slate-600 font-normal">— 1,800+ ★</span></div>
        <div className="h-[2.5px] bg-slate-800 rounded-full w-4/5 mt-0.5" />
      </div>
    </div>
  ),

  academic_research: () => (
    <div className="w-full h-full bg-[#fffef8] rounded-sm font-serif text-[4px] leading-[6px] text-slate-700 overflow-hidden">
      <div className="p-3">
        <div className="text-center mb-2">
          <div className="text-[7px] font-bold text-slate-900">Dr. Elena Vasquez</div>
          <div className="text-[3.5px] text-violet-700 italic">Department of Cognitive Neuroscience</div>
          <div className="text-[3px] text-slate-400 mt-0.5">University of Cambridge · e.vasquez@cam.ac.uk</div>
        </div>
        <div className="border-t border-violet-200 my-1.5" />
        <div className="text-[4.5px] font-bold text-violet-800 mb-0.5">Research Interests</div>
        <div className="space-y-0.5 mb-1.5">
          <div className="h-[3px] bg-violet-50 rounded-full w-full" />
          <div className="h-[3px] bg-violet-50 rounded-full w-4/5" />
        </div>
        <div className="border-t border-violet-200 my-1.5" />
        <div className="text-[4.5px] font-bold text-violet-800 mb-0.5">Selected Publications</div>
        <div className="space-y-1 mb-1.5">
          <div className="flex gap-0.5">
            <span className="text-[3.5px] text-violet-400 font-bold shrink-0">1.</span>
            <div><span className="font-bold text-[3.5px]">Vasquez, E.</span><span className="text-[3px] text-slate-500">, Chen, Y. (2023). "Targeted memory reactivation..." </span><span className="text-[3px] text-violet-600 italic">Nature Neuroscience</span></div>
          </div>
          <div className="flex gap-0.5">
            <span className="text-[3.5px] text-violet-400 font-bold shrink-0">2.</span>
            <div><span className="font-bold text-[3.5px]">Vasquez, E.</span><span className="text-[3px] text-slate-500"> (2022). "Deep learning approaches..." </span><span className="text-[3px] text-violet-600 italic">NeuroImage</span></div>
          </div>
        </div>
        <div className="border-t border-violet-200 my-1.5" />
        <div className="text-[4.5px] font-bold text-violet-800 mb-0.5">Grants & Fellowships</div>
        <div className="text-[3px] text-slate-500">Leverhulme Early Career Fellowship — £180,000</div>
      </div>
    </div>
  ),

  executive_leadership: () => (
    <div className="w-full h-full bg-white rounded-sm font-sans text-[4px] leading-[6px] text-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-700 to-amber-900 p-2.5">
        <div className="text-[7px] font-black text-white tracking-wider">DAVID THORNTON</div>
        <div className="text-[4px] text-amber-200 font-medium">Chief Technology Officer & Digital Transformation Leader</div>
        <div className="text-[3px] text-amber-300/60 mt-0.5">Chicago, IL · david.thornton@email.com</div>
      </div>
      <div className="p-3">
        <div className="text-[4.5px] font-bold text-amber-800 uppercase tracking-wider border-b border-amber-200 pb-0.5 mb-1">Executive Profile</div>
        <div className="space-y-0.5 mb-2">
          <div className="h-[3px] bg-amber-50 rounded-full w-full" />
          <div className="h-[3px] bg-amber-50 rounded-full w-5/6" />
        </div>
        <div className="text-[4.5px] font-bold text-amber-800 uppercase tracking-wider border-b border-amber-200 pb-0.5 mb-1">Leadership</div>
        <div className="mb-1">
          <div className="text-[4px] font-bold text-slate-800">Chief Technology Officer</div>
          <div className="text-[3px] text-amber-700">Apex Financial Group · 2020 – Present</div>
          <div className="mt-0.5 space-y-0.5">
            <div className="h-[2.5px] bg-amber-50 rounded-full w-full" />
            <div className="h-[2.5px] bg-amber-50 rounded-full w-11/12" />
          </div>
        </div>
        <div className="text-[4.5px] font-bold text-amber-800 uppercase tracking-wider border-b border-amber-200 pb-0.5 mb-1 mt-1.5">Key Achievements</div>
        <div className="border border-amber-100 rounded overflow-hidden">
          {[['Revenue', '$50M+'], ['Teams', '20 → 200+'], ['Uptime', '99.99%']].map(([k, v]) => (
            <div key={k} className="flex text-[3px] border-b border-amber-50 last:border-0">
              <div className="px-1 py-0.5 w-1/3 bg-amber-50/50 text-amber-800 font-bold">{k}</div>
              <div className="px-1 py-0.5 flex-1 text-slate-600">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

// ─── Category color configuration ───────────────────────────────────────────

const categoryStyles = {
  Modern:    { badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',  ring: 'ring-indigo-500/50 border-indigo-500/40',  shadow: 'shadow-indigo-500/10' },
  Corporate: { badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',          ring: 'ring-sky-500/50 border-sky-500/40',        shadow: 'shadow-sky-500/10' },
  Creative:  { badge: 'bg-pink-500/20 text-pink-400 border-pink-500/30',       ring: 'ring-pink-500/50 border-pink-500/40',      shadow: 'shadow-pink-500/10' },
  Technical: { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', ring: 'ring-emerald-500/50 border-emerald-500/40', shadow: 'shadow-emerald-500/10' },
  Academic:  { badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30', ring: 'ring-violet-500/50 border-violet-500/40',  shadow: 'shadow-violet-500/10' },
  Executive: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',   ring: 'ring-amber-500/50 border-amber-500/40',    shadow: 'shadow-amber-500/10' },
};

// ─── Template Card Component ────────────────────────────────────────────────

const TemplateCard = ({ template, isSelected, onSelect, onPreview }) => {
  const styles = categoryStyles[template.category] || categoryStyles.Modern;
  const Preview = MiniPreviews[template.id];

  return (
    <div
      onClick={() => onSelect(template.id)}
      className={`
        relative group cursor-pointer rounded-2xl transition-all duration-300 overflow-hidden flex flex-col
        ${isSelected
          ? `ring-2 ${styles.ring} shadow-xl ${styles.shadow} scale-[1.02] border-2`
          : 'border-2 border-border/40 hover:border-border hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5'
        }
        bg-surface-dark/60 backdrop-blur-sm
      `}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2.5 right-2.5 z-20 animate-in zoom-in duration-200">
          <div className="bg-primary-500 text-white p-0.5 rounded-full shadow-lg shadow-primary-500/30">
            <CheckCircle2 size={16} />
          </div>
        </div>
      )}

      {/* Document Preview */}
      <div className="relative mx-3 mt-3 rounded-lg overflow-hidden shadow-lg aspect-[3/4] border border-border/30">
        {Preview ? <Preview /> : (
          <div className="w-full h-full bg-surface-dark flex items-center justify-center">
            <span className="text-3xl">{template.icon}</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview?.(template.id); }}
            className="flex items-center gap-1.5 bg-white/95 text-slate-900 text-[10px] font-bold px-4 py-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200 hover:bg-white"
          >
            <Eye size={12} />
            Preview
          </button>
          <span className="text-[9px] text-white/70 font-medium">
            {isSelected ? '✓ Selected' : 'Click card to select'}
          </span>
        </div>
      </div>

      {/* Template Info */}
      <div className="p-3 pt-2.5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-white text-[13px] leading-tight">{template.name}</h3>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${styles.badge}`}>
            {template.category}
          </span>
        </div>
        <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2 mb-2 flex-1">
          {template.description}
        </p>

        {/* Section tags */}
        <div className="flex flex-wrap gap-1">
          {template.preview_sections?.slice(0, 3).map((section, i) => (
            <span key={i} className="text-[8px] font-mono text-text-muted/50 bg-border/30 px-1.5 py-0.5 rounded">
              {section}
            </span>
          ))}
          {template.preview_sections?.length > 3 && (
            <span className="text-[8px] font-mono text-text-muted/30 px-0.5">
              +{template.preview_sections.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateCard;
