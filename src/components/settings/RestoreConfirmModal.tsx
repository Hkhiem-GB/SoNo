import React from 'react';
import { AlertTriangle, Database, Users, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { formatDate } from '@/utils/formatters';
import type { ValidationResult } from '@/services/backupService';

interface RestoreConfirmModalProps {
  isOpen: boolean;
  summary: ValidationResult['summary'] | null;
  isRestoring: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const RestoreConfirmModal: React.FC<RestoreConfirmModalProps> = ({
  isOpen,
  summary,
  isRestoring,
  onClose,
  onConfirm,
}) => {
  const { t, language } = useLanguage();

  if (!summary) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('importConfirmTitle')}>
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start space-x-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">{t('restoreModeReplace')}</div>
            <p className="leading-relaxed text-[11px] text-rose-600/90 dark:text-rose-300/90">
              {t('importConfirmMessage', {
                peopleCount: summary.peopleCount,
                activitiesCount: summary.activitiesCount,
                paymentsCount: summary.paymentsCount,
              })}
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
            <Database className="w-3.5 h-3.5" />
            <span>Nội dung bản sao lưu</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-center text-indigo-500 mb-1">
                <Users className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-800 dark:text-slate-100">
                {summary.peopleCount}
              </div>
              <div className="text-[10px] text-slate-400">Người</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-center text-emerald-500 mb-1">
                <FileText className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-800 dark:text-slate-100">
                {summary.activitiesCount}
              </div>
              <div className="text-[10px] text-slate-400">Khoản nợ</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-center text-teal-500 mb-1">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-800 dark:text-slate-100">
                {summary.paymentsCount}
              </div>
              <div className="text-[10px] text-slate-400">Lần trả</div>
            </div>
          </div>

          {summary.exportedAt && (
            <div className="text-[11px] text-slate-400 text-center pt-1">
              Thời điểm xuất: {formatDate(summary.exportedAt, language)}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            disabled={isRestoring}
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={isRestoring}
            onClick={onConfirm}
            className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
          >
            {isRestoring ? (
              <span>Đang khôi phục...</span>
            ) : (
              <span>Xác nhận khôi phục</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
