import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
import type { Activity } from '@/types';

interface EditActivityModalProps {
  isOpen: boolean;
  activity: Activity | null;
  onClose: () => void;
  onSave: (activityId: string, data: { title: string; amount: number; date: string }) => Promise<void>;
}

export const EditActivityModal: React.FC<EditActivityModalProps> = ({
  isOpen,
  activity,
  onClose,
  onSave,
}) => {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activity && isOpen) {
      setTitle(activity.title);
      setAmountStr(activity.amount.toString());
      setDate(activity.date ? activity.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [activity, isOpen]);

  if (!activity) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập mô tả hoạt động.');
      return;
    }

    const amount = Math.round(parseFloat(amountStr));
    if (isNaN(amount) || amount <= 0) {
      setError('Số tiền phải là số nguyên dương lớn hơn 0.');
      return;
    }

    // Business rule: Cannot reduce original amount below already paid amount
    if (amount < activity.paidAmount) {
      setError(
        `Không thể sửa số tiền nhỏ hơn số tiền đã trả (${formatCurrency(
          activity.paidAmount,
          'VND',
          language
        )}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(activity.id, {
        title: title.trim(),
        amount,
        date,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật hoạt động';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sửa hoạt động nợ">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {activity.paidAmount > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-700 dark:text-amber-300">
            Khoản nợ này đã được thanh toán một phần: <strong>{formatCurrency(activity.paidAmount, 'VND', language)}</strong>. Số tiền mới không được nhỏ hơn số tiền đã trả này.
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Nội dung hoạt động *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Tiền ăn tối, Mua hộ vé tàu..."
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Số tiền ban đầu (VNĐ) *
          </label>
          <input
            type="number"
            min={activity.paidAmount > 0 ? activity.paidAmount : 1}
            step="1000"
            required
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Ngày phát sinh *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
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
            className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
