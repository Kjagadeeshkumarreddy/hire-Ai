import React, { useState } from 'react';
import { useJDMutations } from '../../hooks/useJD';
import { Loader2 } from 'lucide-react';

export const JDForm = ({ onGenerated }) => {
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
        <label className="block text-sm font-medium text-text-muted mb-1">Job Title</label>
        <input 
          required
          className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" 
          value={formData.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
          placeholder="e.g. Senior Backend Engineer"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
           <label className="block text-sm font-medium text-text-muted mb-1">Department</label>
           <input 
             className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" 
             value={formData.department}
             onChange={e => setFormData({...formData, department: e.target.value})}
             placeholder="Engineering"
           />
        </div>
        <div>
           <label className="block text-sm font-medium text-text-muted mb-1">Seniority Level</label>
           <select 
             className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
             value={formData.seniority_level}
             onChange={e => setFormData({...formData, seniority_level: e.target.value})}
           >
             <option value="junior">Junior</option>
             <option value="mid">Mid-Level</option>
             <option value="senior">Senior</option>
             <option value="lead">Lead / Manager</option>
           </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-1">Key Requirements (comma separated)</label>
        <textarea 
          required
          rows={3}
          className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" 
          value={formData.key_requirements}
          onChange={e => setFormData({...formData, key_requirements: e.target.value})}
          placeholder="Python, React, System Design, 5+ years experience"
        />
      </div>

      <button 
        type="submit" 
        disabled={generateJD.isPending}
        className="w-full btn-primary mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {generateJD.isPending ? <Loader2 className="animate-spin" size={18} /> : 'Generate with Groq'}
      </button>
    </form>
  );
};
