import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useJDMutations } from '../../hooks/useJD';
import { Loader2 } from 'lucide-react';

export const JDForm = ({ onGenerated }) => {
  const { t } = useTranslation();
  const { generateJD } = useJDMutations();
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    seniority_level: 'mid',
    tone: 'professional',
    key_requirements: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      key_requirements: formData.key_requirements.split(',').map(s => s.trim())
    };
    
    generateJD.mutate(payload, {
      onSuccess: (data) => {
        if (onGenerated) onGenerated(data);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1">{t('jdForm.jobTitle')}</label>
        <input 
          required
          className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" 
          value={formData.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
          placeholder={t('jdForm.titlePlaceholder')}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
           <label className="block text-sm font-medium text-text-muted mb-1">{t('jdForm.department')}</label>
           <input 
             className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" 
             value={formData.department}
             onChange={e => setFormData({...formData, department: e.target.value})}
             placeholder="Engineering"
           />
        </div>
        <div>
           <label className="block text-sm font-medium text-text-muted mb-1">{t('jdForm.seniorityLevel')}</label>
           <select 
             className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
             value={formData.seniority_level}
             onChange={e => setFormData({...formData, seniority_level: e.target.value})}
           >
             <option value="junior">{t('jdForm.junior')}</option>
             <option value="mid">{t('jdForm.midLevel')}</option>
             <option value="senior">{t('jdForm.senior')}</option>
             <option value="lead">{t('jdForm.leadManager')}</option>
           </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-1">{t('jdForm.keyRequirements')}</label>
        <textarea 
          required
          rows={3}
          className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" 
          value={formData.key_requirements}
          onChange={e => setFormData({...formData, key_requirements: e.target.value})}
          placeholder={t('jdForm.requirementsPlaceholder')}
        />
      </div>

      <button 
        type="submit" 
        disabled={generateJD.isPending}
        className="w-full btn-primary mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {generateJD.isPending ? <Loader2 className="animate-spin" size={18} /> : t('jdForm.generateWithGroq')}
      </button>
    </form>
  );
};
