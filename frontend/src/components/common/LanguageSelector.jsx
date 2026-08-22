import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

export const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' }
  ];

  const changeLanguage = (lngCode) => {
    i18n.changeLanguage(lngCode);
    localStorage.setItem('language', lngCode);
    setIsOpen(false);
  };

  const currentLanguage = languages.find(l => l.code === (i18n.language || 'en')) || languages[0];

  return (
    <div className="relative inline-block text-left z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/40 hover:bg-surface/80 border border-border/50 text-text-muted hover:text-white transition-all text-xs font-semibold backdrop-blur-md"
        type="button"
      >
        <Globe size={14} className="text-primary-500" />
        <span>{currentLanguage.name}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-32 rounded-xl bg-surface border border-border shadow-xl p-1 z-50">
            {languages.map((lng) => (
              <button
                key={lng.code}
                onClick={() => changeLanguage(lng.code)}
                className={`flex items-center justify-between w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  (i18n.language || 'en').startsWith(lng.code)
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-text-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{lng.name}</span>
                {(i18n.language || 'en').startsWith(lng.code) && <Check size={12} className="text-primary-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
