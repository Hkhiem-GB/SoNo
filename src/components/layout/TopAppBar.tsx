import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export const TopAppBar: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 pt-safe transition-colors shadow-2xs">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* App Title & Brand Icon */}
        <div className="flex items-center space-x-2.5">
          <img
            src="/logo.svg"
            alt="Sổ Nợ"
            className="w-8 h-8 rounded-xl shadow-xs"
          />
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 m-0">
              {t('appName')}
            </h1>
          </div>
        </div>

        {/* Right actions: Language pill */}
        <div className="flex items-center space-x-2">
          {/* Language Toggle Pill */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/60 text-xs font-bold text-slate-700 shadow-2xs transition active:scale-95"
            title="Đổi ngôn ngữ / Switch language"
          >
            {language === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
          </button>
        </div>
      </div>
    </header>
  );
};
