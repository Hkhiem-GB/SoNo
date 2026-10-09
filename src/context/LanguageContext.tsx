import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, type TranslationKey } from '@/i18n/translations';
import { settingsRepository } from '@/repositories/settingsRepository';
import type { Language } from '@/types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    // Load initial language preference
    settingsRepository.get('language', 'vi').then((savedLang) => {
      if (savedLang === 'vi' || savedLang === 'en') {
        setLanguageState(savedLang);
      }
    });
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    await settingsRepository.set('language', newLang);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = (translations[language] || translations.vi) as Record<string, string>;
    const fallback = translations.vi as Record<string, string>;
    let text = dict[key] || fallback[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
