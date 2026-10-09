import React, { useRef, useState } from 'react';
import {
  Moon,
  Sun,
  Globe,
  Download,
  Upload,
  Database,
  Info,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useDb } from '@/context/DbContext';
import { backupService } from '@/services/backupService';
import { APP_CONFIG } from '@/config/appConfig';
import type { Language, ThemeMode } from '@/types';

export const SettingsView: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { refreshData } = useDb();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleExportBackup = async () => {
    try {
      setLoading(true);
      const jsonStr = await backupService.exportData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `sono-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', t('backupSuccess'));
    } catch (e) {
      showToast('error', 'Lỗi xuất sao lưu');
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const content = await file.text();
      await backupService.importData(content);
      refreshData();
      showToast('success', t('importSuccess'));
    } catch (err) {
      showToast('error', t('importError'));
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSeedDemo = async () => {
    try {
      setLoading(true);
      await backupService.seedDemoDataIfEmpty();
      refreshData();
      showToast('success', t('seedSuccess'));
    } catch (e) {
      showToast('error', 'Lỗi nạp dữ liệu mẫu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
        {t('settingsTitle')}
      </h2>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Theme Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
          <Sun className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('appearance')}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTheme(m)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                theme === m
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {m === 'light' && <Sun className="w-3.5 h-3.5" />}
              {m === 'dark' && <Moon className="w-3.5 h-3.5" />}
              {m === 'system' && <RefreshCw className="w-3.5 h-3.5" />}
              <span>
                {m === 'light' && t('themeLight')}
                {m === 'dark' && t('themeDark')}
                {m === 'system' && t('themeSystem')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Language Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
          <Globe className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('language')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['vi', 'en'] as Language[]).map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => setLanguage(lng)}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                language === lng
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span>{lng === 'vi' ? '🇻🇳' : '🇺🇸'}</span>
              <span>{lng === 'vi' ? t('languageVi') : t('languageEn')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Data Management & SQLite Backup/Restore */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
          <Database className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('dataManagement')}
          </h3>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-between transition"
          >
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-emerald-500" />
              <span>{t('exportBackup')}</span>
            </div>
            <span className="text-[10px] text-slate-400">JSON</span>
          </button>

          <button
            type="button"
            onClick={handleImportClick}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-between transition"
          >
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-indigo-500" />
              <span>{t('importBackup')}</span>
            </div>
            <span className="text-[10px] text-slate-400">JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-2 transition"
          >
            <RefreshCw className="w-4 h-4 text-amber-500" />
            <span>{t('seedDemo')}</span>
          </button>
        </div>
      </div>

      {/* About App & Offline Notice */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 text-xs space-y-2">
        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Bảo mật & Cục bộ 100%</span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('offlineStorageNotice')}
        </p>
        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
          <span>{APP_CONFIG.appName} v{APP_CONFIG.version}</span>
          <span>{APP_CONFIG.appId}</span>
        </div>
      </div>
    </div>
  );
};
