import React, { useState } from 'react';
import { DbProvider, useDb } from '@/context/DbContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { TopAppBar } from '@/components/layout/TopAppBar';
import { BottomNav, type TabType } from '@/components/layout/BottomNav';
import { DebtsView } from '@/components/debts/DebtsView';
import { PeopleView } from '@/components/people/PeopleView';
import { ReportsView } from '@/components/reports/ReportsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { Wallet, Loader2 } from 'lucide-react';
import type { Person } from '@/types';

const MainContent: React.FC = () => {
  const { isReady, error } = useDb();
  const [activeTab, setActiveTab] = useState<TabType>('debts');
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [presetPerson, setPresetPerson] = useState<{ id: string; name: string } | null>(null);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-rose-200 dark:border-rose-900 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
            !
          </div>
          <h2 className="text-lg font-bold">Lỗi khởi tạo SQLite</h2>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 animate-pulse">
          <Wallet className="w-8 h-8" />
        </div>
        <div className="flex items-center space-x-2 text-sm font-semibold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          <span>Khởi tạo cơ sở dữ liệu SQLite...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Top Header with Notch Safe Area */}
      <TopAppBar />

      {/* Main Tab Screen Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4 pb-safe-nav">
        {activeTab === 'debts' && (
          <DebtsView
            isAddModalOpen={isAddDebtOpen}
            onCloseAddModal={() => {
              setIsAddDebtOpen(false);
              setPresetPerson(null);
            }}
            presetPerson={presetPerson}
          />
        )}

        {activeTab === 'people' && (
          <PeopleView
            onAddDebtForPerson={(person: Person) => {
              setPresetPerson({ id: person.id, name: person.name });
              setActiveTab('debts');
              setIsAddDebtOpen(true);
            }}
          />
        )}

        {activeTab === 'reports' && <ReportsView />}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Bottom Nav Bar with Gesture Safe Area & FAB */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenAddModal={() => {
          setPresetPerson(null);
          setIsAddDebtOpen(true);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <DbProvider>
      <ThemeProvider>
        <LanguageProvider>
          <MainContent />
        </LanguageProvider>
      </ThemeProvider>
    </DbProvider>
  );
}
