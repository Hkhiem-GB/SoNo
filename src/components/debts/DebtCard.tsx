import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  MoreVertical,
  PlusCircle,
  History,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency, formatDate, isOverdue, getDaysRemaining } from '@/utils/formatters';
import type { Debt } from '@/types';

interface DebtCardProps {
  debt: Debt;
  onToggleSettlement: (debt: Debt) => void;
  onOpenPaymentModal: (debt: Debt) => void;
  onOpenHistoryModal: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
}

export const DebtCard: React.FC<DebtCardProps> = ({
  debt,
  onToggleSettlement,
  onOpenPaymentModal,
  onOpenHistoryModal,
  onEdit,
  onDelete,
}) => {
  const { t, language } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);

  const isDebtOverdue = isOverdue(debt.dueDate, debt.isSettled);
  const daysDiff = getDaysRemaining(debt.dueDate);
  const paidPercent = debt.amount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100)) : 0;

  return (
    <div
      className={`relative bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-2xs transition-all duration-200 ${
        debt.isSettled
          ? 'opacity-65 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
          : isDebtOverdue
            ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-200 dark:ring-rose-950'
            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
      }`}
    >
      {/* Header: Person Name, Badge, Settle Checkbox & More Button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Quick settlement toggle button */}
          <button
            type="button"
            onClick={() => onToggleSettlement(debt)}
            className="text-slate-400 hover:text-emerald-500 transition shrink-0"
            title={debt.isSettled ? t('markUnsettled') : t('markSettled')}
          >
            {debt.isSettled ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
            ) : (
              <Circle className="w-6 h-6" />
            )}
          </button>

          <div className="min-w-0">
            <h4
              className={`font-bold text-base truncate ${
                debt.isSettled
                  ? 'line-through text-slate-500 dark:text-slate-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {debt.personName || 'Không tên'}
            </h4>

            {/* Badge type */}
            <div className="flex items-center space-x-1 mt-0.5">
              <span
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                  debt.type === 'owe_me'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {debt.type === 'owe_me' ? (
                  <>
                    <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                    <span>{t('oweMe')}</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3 h-3 text-rose-600" />
                    <span>{t('iOwe')}</span>
                  </>
                )}
              </span>

              {debt.isSettled && (
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md text-[10px] font-medium">
                  {t('statusSettled')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Amount & Menu */}
        <div className="flex items-center space-x-1 shrink-0">
          <div className="text-right">
            <div
              className={`font-black text-base sm:text-lg ${
                debt.type === 'owe_me'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(debt.remainingAmount, 'VND', language)}
            </div>
            {debt.paidAmount > 0 && (
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                {t('paid')}: {formatCurrency(debt.paidAmount, 'VND', language)}
              </div>
            )}
          </div>

          {/* Menu Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 z-50 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(debt);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('edit')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenHistoryModal(debt);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('viewHistory')}</span>
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(debt);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Note if any */}
      {debt.note && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 pl-9">
          {debt.note}
        </p>
      )}

      {/* Partial Payment Progress Bar if partially paid */}
      {debt.paidAmount > 0 && !debt.isSettled && (
        <div className="mt-3 pl-9 pr-1">
          <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
            <span>{t('paid')} ({paidPercent}%)</span>
            <span>{t('remaining')}: {formatCurrency(debt.remainingAmount, 'VND', language)}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Due date info & quick payment button */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs pl-9">
        {/* Due date info */}
        <div className="flex items-center space-x-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {debt.dueDate ? (
            <span
              className={`font-medium ${
                isDebtOverdue
                  ? 'text-rose-600 dark:text-rose-400 flex items-center space-x-1 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {formatDate(debt.dueDate, language)}
              {isDebtOverdue && (
                <span className="ml-1 inline-flex items-center space-x-0.5 text-rose-600">
                  <AlertCircle className="w-3 h-3 inline" />
                  <span>({t('overdueDays', { days: Math.abs(daysDiff ?? 0) })})</span>
                </span>
              )}
              {!isDebtOverdue && !debt.isSettled && daysDiff !== null && daysDiff <= 3 && daysDiff >= 0 && (
                <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">
                  ({daysDiff === 0 ? t('dueToday') : t('dueInDays', { days: daysDiff })})
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{t('noDueDate')}</span>
          )}
        </div>

        {/* Quick actions: Record payment & history */}
        {!debt.isSettled && (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => onOpenHistoryModal(debt)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title={t('viewHistory')}
            >
              <History className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenPaymentModal(debt)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('recordPayment')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
