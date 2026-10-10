import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { VietnamFlag, UsFlag } from '@/components/common/FlagIcons';

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

        {/* Right actions: Language pill with Vietnam flag on the right */}
        <div className="flex items-center space-x-2">
          {/* Language Toggle Pill */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/60 text-xs font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Đổi ngôn ngữ / Switch language"
          >
            <span>{language === 'vi' ? 'VI' : 'EN'}</span>
            {language === 'vi' ? (
              <VietnamFlag className="w-5 h-3.5 rounded-xs shadow-2xs" />
            ) : (
              <UsFlag className="w-5 h-3.5 rounded-xs shadow-2xs" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
