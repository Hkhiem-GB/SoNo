import React from 'react';
import { Wallet, Sun, Moon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export const TopAppBar: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { isDark, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 pt-safe transition-colors">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* App Title & Brand Icon */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs">
            <Wallet className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 m-0">
              {t('appName')}
            </h1>
          </div>
        </div>

        {/* Right actions: Language pill & Theme quick toggle */}
        <div className="flex items-center space-x-2">
          {/* Language Toggle Pill */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
            title="Đổi ngôn ngữ / Change language"
          >
            {language === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
          </button>

          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Đổi giao diện Sáng / Tối"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
