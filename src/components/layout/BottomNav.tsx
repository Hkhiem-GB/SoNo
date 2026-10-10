import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Settings } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export type MainTab = 'debtors' | 'creditors' | 'settings';

interface BottomNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
}) => {
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-safe shadow-lg transition-colors">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
        {/* Tab 1: Con nợ */}
        <button
          type="button"
          onClick={() => onChangeTab('debtors')}
          className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all ${
            activeTab === 'debtors'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold scale-105'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl mb-0.5 ${
              activeTab === 'debtors'
                ? 'bg-emerald-50 dark:bg-emerald-950/60'
                : 'bg-transparent'
            }`}
          >
            <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xs">{t('tabDebtors')}</span>
        </button>

        {/* Tab 2: Chủ nợ */}
        <button
          type="button"
          onClick={() => onChangeTab('creditors')}
          className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all ${
            activeTab === 'creditors'
              ? 'text-rose-600 dark:text-rose-400 font-extrabold scale-105'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl mb-0.5 ${
              activeTab === 'creditors'
                ? 'bg-rose-50 dark:bg-rose-950/60'
                : 'bg-transparent'
            }`}
          >
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xs">{t('tabCreditors')}</span>
        </button>

        {/* Tab 3: Cài đặt */}
        <button
          type="button"
          onClick={() => onChangeTab('settings')}
          className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all ${
            activeTab === 'settings'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold scale-105'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl mb-0.5 ${
              activeTab === 'settings'
                ? 'bg-indigo-50 dark:bg-indigo-950/60'
                : 'bg-transparent'
            }`}
          >
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-xs">{t('tabSettings')}</span>
        </button>
      </div>
    </nav>
  );
};
