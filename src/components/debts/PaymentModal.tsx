import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
import type { Debt } from '@/types';

interface PaymentModalProps {
  isOpen: boolean;
  debt: Debt | null;
  onClose: () => void;
  onSavePayment: (data: {
    debtId: string;
    amount: number;
    paymentDate: string;
    note?: string;
  }) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  debt,
  onClose,
  onSavePayment,
}) => {
  const { t, language } = useLanguage();
  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && debt) {
      setAmountStr(debt.remainingAmount > 0 ? debt.remainingAmount.toString() : '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setError(null);
    }
  }, [isOpen, debt]);

  if (!debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));

    if (isNaN(amount) || amount <= 0) {
      setError('Vui lòng nhập số tiền thanh toán hợp lệ (> 0)');
      return;
    }

    if (amount > debt.remainingAmount) {
      setError(`Số tiền không được vượt quá số dư còn lại (${formatCurrency(debt.remainingAmount, 'VND', language)})`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSavePayment({
        debtId: debt.id,
        amount,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu thanh toán');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('paymentTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Debt Info Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>{t('personName')}:</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{debt.personName}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>{t('amount')}:</span>
            <span className="font-semibold">{formatCurrency(debt.amount, 'VND', language)}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>{t('remaining')}:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(debt.remainingAmount, 'VND', language)}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('paymentAmount')} (VND) *
          </label>
          <input
            type="number"
            min="1000"
            max={debt.remainingAmount}
            step="1000"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('paymentDate')}
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('paymentNote')}
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Chuyển khoản Vietcombank, tiền mặt..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-md transition"
          >
            {isSubmitting ? '...' : t('confirm')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
