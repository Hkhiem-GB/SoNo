import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
import type { Activity } from '@/types';

interface PaymentAmountModalProps {
  isOpen: boolean;
  activity: Activity | null;
  onClose: () => void;
  onSavePayment: (activityId: string, amount: number, note?: string) => Promise<void>;
}

export const PaymentAmountModal: React.FC<PaymentAmountModalProps> = ({
  isOpen,
  activity,
  onClose,
  onSavePayment,
}) => {
  const { t, language } = useLanguage();
  const [payAmountStr, setPayAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activity && isOpen) {
      setPayAmountStr(activity.remainingAmount > 0 ? activity.remainingAmount.toString() : '');
      setNote('');
      setError(null);
    }
  }, [activity, isOpen]);

  if (!activity) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = parseFloat(payAmountStr.replace(/[^0-9.]/g, ''));
    const amount = Math.round(rawVal);

    if (isNaN(amount) || amount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ (> 0 VNĐ).');
      return;
    }

    if (amount > activity.remainingAmount) {
      setError(
        `Số tiền thanh toán không được lớn hơn số nợ còn lại (${formatCurrency(
          activity.remainingAmount,
          'VND',
          language
        )}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSavePayment(activity.id, amount, note.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu thanh toán';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('recordPaymentTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Activity Info Banner */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span>Khoản ghi nợ:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{activity.title}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span>Nợ ban đầu:</span>
            <span>{formatCurrency(activity.amount, 'VND', language)}</span>
          </div>
          {activity.paidAmount > 0 && (
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Đã thanh toán trước:</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                {formatCurrency(activity.paidAmount, 'VND', language)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="font-bold text-slate-700 dark:text-slate-300">Nợ còn lại:</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
              {formatCurrency(activity.remainingAmount, 'VND', language)}
            </span>
          </div>
        </div>

        {/* Input Payment Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            {t('paymentAmount')} (VNĐ) *
          </label>
          <input
            type="number"
            min="1000"
            max={activity.remainingAmount}
            step="1000"
            required
            autoFocus
            value={payAmountStr}
            onChange={(e) => setPayAmountStr(e.target.value)}
            placeholder={t('paymentAmountPlaceholder')}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Input Payment Note */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Ghi chú đợt thanh toán (Tùy chọn)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Chuyển khoản Vietcombank, trả trước 200k..."
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : t('confirm')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
