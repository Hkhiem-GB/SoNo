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
  // Read instant local storage preference to prevent UI text flash
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sono_language') as Language;
      if (stored === 'vi' || stored === 'en') {
        return stored;
      }
    }
    return 'vi';
  });

  useEffect(() => {
    // Sync with persisted settings in SQLite
    settingsRepository.get('language', language).then((savedLang) => {
      if ((savedLang === 'vi' || savedLang === 'en') && savedLang !== language) {
        setLanguageState(savedLang);
      }
    });
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sono_language', newLang);
    }
    try {
      await settingsRepository.set('language', newLang);
    } catch (e) {
      console.warn('[LanguageContext] Failed to persist language to SQLite:', e);
    }
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
