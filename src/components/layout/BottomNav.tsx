import React from 'react';
import { BookOpen, Users, PieChart, Settings, Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export type TabType = 'debts' | 'people' | 'reports' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddModal,
}) => {
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-safe">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Debts Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('debts')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activeTab === 'debts'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{t('navDebts')}</span>
        </button>

        {/* People Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('people')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activeTab === 'people'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{t('navPeople')}</span>
        </button>

        {/* Center Floating Action Button (FAB) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            title={t('addDebt')}
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Reports Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('reports')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activeTab === 'reports'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <PieChart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{t('navReports')}</span>
        </button>

        {/* Settings Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activeTab === 'settings'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{t('navSettings')}</span>
        </button>
      </div>
    </nav>
  );
};
