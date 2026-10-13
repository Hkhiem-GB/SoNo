import React, { useState, useMemo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { DebtProvider, useDebtStore } from '@/context/DebtContext';
import { SplashScreen } from '@/components/splash/SplashScreen';
import { TopAppBar } from '@/components/layout/TopAppBar';
import { BottomNav, type MainTab } from '@/components/layout/BottomNav';
import { PersonListView } from '@/components/debts/PersonListView';
import { PersonDetailView } from '@/components/debts/PersonDetailView';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { SecurityProvider, useSecurity } from '@/context/SecurityContext';
import { PinLockScreen } from '@/components/security/PinLockScreen';

const MainApp: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>('debtors');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const { isDbReady, isLoading, dbError, refreshData, getPerson } = useDebtStore();
  const { isPinSet, isLocked } = useSecurity();

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    setSelectedPersonId(null); // Return to list view on tab switch
  };

  // Ready only when SQLite is initialized and initial data has been queried into state (or error)
  const isDataReady = (isDbReady && !isLoading) || !!dbError;

  // Determine current active section to style the main background matching the card color
  const currentMainTheme = useMemo(() => {
    if (selectedPersonId) {
      const person = getPerson(selectedPersonId);
      return person?.type === 'creditor' ? 'creditor' : 'debtor';
    }
    if (activeTab === 'debtors') return 'debtor';
    if (activeTab === 'creditors') return 'creditor';
    return 'settings';
  }, [selectedPersonId, activeTab, getPerson]);

  // Main background is a gentle/softer version of the total card gradient (independent of dark mode)
  const mainBgClass = useMemo(() => {
    if (currentMainTheme === 'debtor') return 'bg-[#e6f7f0]'; // Soft pale green/emerald matching card
    if (currentMainTheme === 'creditor') return 'bg-[#fbebee]'; // Soft pale rose/pink matching card
    return 'bg-[#f1f5f9]'; // Soft neutral slate for settings
  }, [currentMainTheme]);

  return (
    <>
      {/* Security PIN Lock Screen: Displays full-screen when enabled and locked */}
      {isPinSet && isLocked && <PinLockScreen />}

      {/* Stage 1: Seamless Splash Screen with SQLite readiness sync & hard timeout fallback */}
      {showSplash && (
        <SplashScreen
          onFinish={() => setShowSplash(false)}
          isReady={isDataReady}
        />
      )}

      {/* Stage 2: Main Application Interface (Main area maintains its tab color, Dark mode only affects Header & Sidebar) */}
      <div className={`min-h-screen ${mainBgClass} text-slate-900 flex flex-col transition-colors duration-300 selection:bg-indigo-500 selection:text-white`}>
        {/* Sticky Top App Bar with Notch Padding - Adapts to Dark Mode */}
        <TopAppBar />

        {/* Content Container with Bottom Nav Safe Padding - Independent of Dark Mode */}
        <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3 pb-safe-nav">
          {dbError ? (
            <div className="py-16 px-4 text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-500 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/10">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Không thể kết nối cơ sở dữ liệu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {dbError}
                </p>
              </div>
              <button
                type="button"
                onClick={() => refreshData()}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 inline-flex items-center space-x-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Thử lại kết nối</span>
              </button>
            </div>
          ) : selectedPersonId ? (
            <PersonDetailView
              personId={selectedPersonId}
              onBack={() => setSelectedPersonId(null)}
            />
          ) : (
            <>
              {activeTab === 'debtors' && (
                <PersonListView
                  type="debtor"
                  onSelectPerson={(id) => setSelectedPersonId(id)}
                />
              )}

              {activeTab === 'creditors' && (
                <PersonListView
                  type="creditor"
                  onSelectPerson={(id) => setSelectedPersonId(id)}
                />
              )}

              {activeTab === 'settings' && <SettingsPage />}
            </>
          )}
        </main>

        {/* Bottom Navigation with Safe Area Inset */}
        {!selectedPersonId && !dbError && (
          <BottomNav activeTab={activeTab} onChangeTab={handleTabChange} />
        )}
      </div>
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <DebtProvider>
          <SecurityProvider>
            <MainApp />
          </SecurityProvider>
        </DebtProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
