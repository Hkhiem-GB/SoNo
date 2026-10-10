import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/context/LanguageContext';
import type { PersonType } from '@/types';

interface AddPersonModalProps {
  isOpen: boolean;
  type: PersonType;
  onClose: () => void;
  onAdd: (name: string, type: PersonType) => Promise<unknown> | void;
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  isOpen,
  type,
  onClose,
  onAdd,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('personNamePlaceholder'));
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onAdd(name.trim(), type);
      setName('');
      onClose();
    } catch (err: unknown) {
      console.error('[AddPersonModal] Error adding person:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi khi thêm người.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = type === 'debtor' ? t('addDebtor') : t('addCreditor');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            {t('personName')} *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder={t('personNamePlaceholder')}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
          />
          <p className="text-[11px] text-slate-400 mt-1.5 pl-1">
            Chỉ cần nhập tên để thêm nhanh vào danh sách.
          </p>
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
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 ${
              type === 'debtor'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
            }`}
          >
            {isSubmitting ? 'Đang lưu...' : t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
