import React, { useState, useRef } from 'react';
import {
  Globe,
  Smartphone,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useDebtStore } from '@/context/DebtContext';
import { backupService, type ValidationResult, type BackupPackage } from '@/services/backupService';
import { RestoreConfirmModal } from '@/components/settings/RestoreConfirmModal';
import { APP_CONFIG } from '@/config/appConfig';
import type { Language } from '@/types';

export const SettingsPage: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { refreshData } = useDebtStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup & Restore states
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [pendingBackup, setPendingBackup] = useState<{
    data: BackupPackage;
    summary: ValidationResult['summary'];
  } | null>(null);

  // Export handler
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setStatusMessage(null);
      const res = await backupService.downloadOrShareBackup();
      setStatusMessage({
        type: 'success',
        text: `${t('backupSuccess')} (${res.fileName})`,
      });
    } catch (err: unknown) {
      console.error('[Settings] Export backup failed:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi khi xuất dữ liệu sao lưu.';
      setStatusMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger file selection for restore
  const handleSelectRestoreFile = () => {
    setStatusMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // File chosen handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setStatusMessage({
          type: 'error',
          text: 'Tệp sao lưu rỗng hoặc không thể đọc được nội dung.',
        });
        return;
      }

      // Validate backup content
      const validation = backupService.validateBackup(content);
      if (!validation.isValid || !validation.data || !validation.summary) {
        setStatusMessage({
          type: 'error',
          text: t('importErrorValidation', { error: validation.error || 'Dữ liệu không đúng định dạng.' }),
        });
        return;
      }

      // Open confirmation modal with validated data summary
      setPendingBackup({
        data: validation.data,
        summary: validation.summary,
      });
    };

    reader.onerror = () => {
      setStatusMessage({
        type: 'error',
        text: 'Không thể đọc tệp sao lưu đã chọn.',
      });
    };

    reader.readAsText(file);
  };

  // Confirm restore handler (atomic transaction)
  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;

    try {
      setIsRestoring(true);
      await backupService.restoreBackup(pendingBackup.data);
      await refreshData();
      const countP = pendingBackup.summary?.peopleCount ?? 0;
      const countA = pendingBackup.summary?.activitiesCount ?? 0;
      const countPay = pendingBackup.summary?.paymentsCount ?? 0;
      setPendingBackup(null);
      setStatusMessage({
        type: 'success',
        text: t('importSuccessDetail', {
          peopleCount: countP,
          activitiesCount: countA,
          paymentsCount: countPay,
        }),
      });
    } catch (err: unknown) {
      console.error('[Settings] Restore backup failed:', err);
      const msg = err instanceof Error ? err.message : t('importError');
      setStatusMessage({
        type: 'error',
        text: `Lỗi khôi phục (đã tự động hoàn tác để giữ nguyên dữ liệu): ${msg}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Reset/seed demo test data handler
  const handleSeedDemoData = async () => {
    if (confirm('Nạp lại dữ liệu mẫu trải nghiệm ban đầu? Thao tác này sẽ thêm các bản ghi mẫu nếu cơ sở dữ liệu trống.')) {
      try {
        await backupService.seedDemoDataIfEmpty();
        await refreshData();
        setStatusMessage({
          type: 'success',
          text: t('seedSuccess'),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi nạp dữ liệu mẫu';
        setStatusMessage({
          type: 'error',
          text: msg,
        });
      }
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-6">
      {/* Header */}
      <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
        {t('settingsTitle')}
      </h2>

      {/* Status feedback message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start space-x-2.5 animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          )}
          <span className="flex-1 font-medium leading-relaxed">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}


      {/* Language Selection Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
          <Globe className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('language')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {(['vi', 'en'] as Language[]).map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => setLanguage(lng)}
              className={`py-3 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2.5 active:scale-95 ${
                language === lng
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-base">{lng === 'vi' ? '🇻🇳' : '🇺🇸'}</span>
              <span>{lng === 'vi' ? t('languageVi') : t('languageEn')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Data Management & Backup/Restore Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
          <Database className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('dataManagement')}
          </h3>
        </div>

        {/* Hidden file input for restore JSON */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="space-y-2.5 pt-1">
          {/* Export button */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportBackup}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl text-left transition flex items-center justify-between group active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {t('exportBackup')}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {t('exportBackupDesc')}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
              {isExporting ? t('exporting') : 'Xuất'}
            </span>
          </button>

          {/* Import / Restore button */}
          <button
            type="button"
            disabled={isRestoring}
            onClick={handleSelectRestoreFile}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl text-left transition flex items-center justify-between group active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {t('importBackup')}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {t('importBackupDesc')}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              Nạp
            </span>
          </button>

          {/* Load demo data option */}
          <button
            type="button"
            onClick={handleSeedDemoData}
            className="w-full p-3 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400 rounded-xl text-left transition flex items-center space-x-2 text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('seedDemo')}</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
          {t('offlineStorageNotice')}
        </p>
      </div>

      {/* App Information Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
          <Smartphone className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('appInfo')}
          </h3>
        </div>

        <div className="flex items-center space-x-4 pt-1">
          <img src="/logo.svg" alt="Sổ Nợ" className="w-14 h-14 rounded-2xl shadow-sm" />
          <div>
            <h4 className="font-black text-lg text-slate-900 dark:text-slate-100">
              {APP_CONFIG.appName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('appSlogan')}
            </p>
            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {t('appVersion')} • {APP_CONFIG.appId}
            </p>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <RestoreConfirmModal
        isOpen={!!pendingBackup}
        summary={pendingBackup?.summary || null}
        isRestoring={isRestoring}
        onClose={() => setPendingBackup(null)}
        onConfirm={handleConfirmRestore}
      />
    </div>
  );
};
