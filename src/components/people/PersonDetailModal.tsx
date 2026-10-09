import React, { useState, useEffect } from 'react';
import { Phone, Plus, Trash2, Edit2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
import { personService } from '@/services/personService';
import type { Debt, Person } from '@/types';

interface PersonDetailModalProps {
  isOpen: boolean;
  person: Person | null;
  onClose: () => void;
  onEditPerson: (person: Person) => void;
  onDeletePerson: (person: Person) => void;
  onAddDebtForPerson: (person: Person) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  isOpen,
  person,
  onClose,
  onEditPerson,
  onDeletePerson,
  onAddDebtForPerson,
}) => {
  const { t, language } = useLanguage();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && person) {
      setLoading(true);
      personService.getPersonDebts(person.id).then((data) => {
        setDebts(data);
        setLoading(false);
      });
    }
  }, [isOpen, person]);

  if (!person) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={person.name}>
      <div className="space-y-4">
        {/* Contact Info Header */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          {person.phone && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">{t('personPhone')}:</span>
              <a
                href={`tel:${person.phone}`}
                className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{person.phone}</span>
              </a>
            </div>
          )}

          {person.note && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {person.note}
            </div>
          )}

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-slate-400">{t('totalReceivable')}</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(person.totalOweMe ?? 0, 'VND', language)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">{t('totalPayable')}</div>
              <div className="font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(person.totalIOwe ?? 0, 'VND', language)}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onAddDebtForPerson(person)}
            className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addDebt')}</span>
          </button>
          <button
            type="button"
            onClick={() => onEditPerson(person)}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title={t('edit')}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeletePerson(person)}
            className="p-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            title={t('delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Debts List */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            {t('navDebts')} ({debts.length})
          </h4>

          {loading ? (
            <div className="py-4 text-center text-xs text-slate-400">Đang tải...</div>
          ) : debts.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">{t('noDebtsTitle')}</div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {debts.map((d) => (
                <div
                  key={d.id}
                  className="p-3 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`font-semibold ${
                          d.type === 'owe_me'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {d.type === 'owe_me' ? t('oweMe') : t('iOwe')}
                      </span>
                      {d.isSettled && (
                        <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded text-[10px]">
                          {t('statusSettled')}
                        </span>
                      )}
                    </div>
                    {d.note && <div className="text-slate-500 dark:text-slate-400 mt-0.5">{d.note}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(d.remainingAmount, 'VND', language)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
