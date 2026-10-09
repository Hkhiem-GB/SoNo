import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { personService } from '@/services/personService';
import type { Debt, DebtType, Person } from '@/types';

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    personId?: string;
    personName?: string;
    personPhone?: string;
    type: DebtType;
    amount: number;
    note?: string;
    dueDate?: string;
  }) => Promise<void>;
  initialDebt?: Debt | null;
  presetPerson?: { id: string; name: string } | null;
}

export const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDebt,
  presetPerson,
}) => {
  const { t } = useLanguage();
  const [people, setPeople] = useState<Person[]>([]);
  const [type, setType] = useState<DebtType>('owe_me');
  const [personId, setPersonId] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [personPhone, setPersonPhone] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      personService.getPeople().then(setPeople);

      if (initialDebt) {
        setType(initialDebt.type);
        setPersonId(initialDebt.personId);
        setPersonName(initialDebt.personName || '');
        setAmountStr(initialDebt.amount.toString());
        setNote(initialDebt.note || '');
        setDueDate(initialDebt.dueDate || '');
      } else if (presetPerson) {
        setType('owe_me');
        setPersonId(presetPerson.id);
        setPersonName(presetPerson.name);
        setPersonPhone('');
        setAmountStr('');
        setNote('');
        setDueDate('');
      } else {
        setType('owe_me');
        setPersonId('');
        setPersonName('');
        setPersonPhone('');
        setAmountStr('');
        setNote('');
        setDueDate('');
      }
      setError(null);
    }
  }, [isOpen, initialDebt]);

  const handleSelectPerson = (id: string) => {
    setPersonId(id);
    const p = people.find((x) => x.id === id);
    if (p) {
      setPersonName(p.name);
      setPersonPhone(p.phone || '');
    } else {
      setPersonName('');
      setPersonPhone('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));

    if (isNaN(amount) || amount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ (> 0)');
      return;
    }

    if (!personId && !personName.trim()) {
      setError('Vui lòng chọn hoặc nhập tên người vay/nợ');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        id: initialDebt?.id,
        personId: personId || undefined,
        personName: personName.trim(),
        personPhone: personPhone.trim() || undefined,
        type,
        amount,
        note: note.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu khoản nợ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialDebt ? t('editDebt') : t('addDebt')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Debt Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('debtType')}
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('owe_me')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'owe_me'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('oweMe')}
            </button>
            <button
              type="button"
              onClick={() => setType('i_owe')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'i_owe'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('iOwe')}
            </button>
          </div>
        </div>

        {/* Person Selection or Creation */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t('selectPerson')}
          </label>
          {people.length > 0 && (
            <select
              value={personId}
              onChange={(e) => handleSelectPerson(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">-- {t('orCreatePerson')} --</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ''}
                </option>
              ))}
            </select>
          )}

          {(!personId || !people.some((p) => p.id === personId)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                placeholder={t('personName') + ' *'}
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
              />
              <input
                type="tel"
                placeholder={t('personPhone')}
                value={personPhone}
                onChange={(e) => setPersonPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('amount')} (VND) *
          </label>
          <input
            type="number"
            min="1000"
            step="1000"
            placeholder={t('amountPlaceholder')}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('dueDate')}
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('note')}
          </label>
          <textarea
            rows={2}
            placeholder={t('notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
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
            className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-md transition"
          >
            {isSubmitting ? '...' : t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
