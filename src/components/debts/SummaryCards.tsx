import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Scale, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
import type { FinancialSummary } from '@/types';

interface SummaryCardsProps {
  summary: FinancialSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-3">
      {/* 2 Main cards: Receivables and Payables */}
      <div className="grid grid-cols-2 gap-3">
        {/* Receivables (Người khác nợ tôi) */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/10 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('totalReceivable')}
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-2 truncate">
            {formatCurrency(summary.totalOweMe, 'VND', language)}
          </div>
        </div>

        {/* Payables (Tôi nợ người khác) */}
        <div className="bg-gradient-to-br from-rose-50 to-red-50/50 dark:from-rose-950/30 dark:to-red-950/10 border border-rose-100 dark:border-rose-800/40 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 mb-1">
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('totalPayable')}
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-300 mt-2 truncate">
            {formatCurrency(summary.totalIOwe, 'VND', language)}
          </div>
        </div>
      </div>

      {/* Net Balance & Quick Indicators */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('netBalance')}
            </div>
            <div
              className={`text-base font-bold ${
                summary.netBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {summary.netBalance > 0 ? '+' : ''}
              {formatCurrency(summary.netBalance, 'VND', language)}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {summary.overdueCount > 0 && (
            <div className="flex items-center space-x-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-full text-xs font-semibold animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{summary.overdueCount} {t('statusOverdue').toLowerCase()}</span>
            </div>
          )}
          <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium">
            {summary.activeDebtsCount} {t('activeDebts').toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  );
};
