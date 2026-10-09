import React from 'react';
import { Search, ArrowUpDown, Filter } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { DebtFilter, DebtFilterStatus, DebtSortOption, DebtType } from '@/types';

interface DebtFilterBarProps {
  filter: DebtFilter;
  onChange: (newFilter: DebtFilter) => void;
}

export const DebtFilterBar: React.FC<DebtFilterBarProps> = ({ filter, onChange }) => {
  const { t } = useLanguage();

  const handleTypeChange = (type: 'all' | DebtType) => {
    onChange({ ...filter, type });
  };

  const handleStatusChange = (status: DebtFilterStatus) => {
    onChange({ ...filter, status });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filter, searchQuery: e.target.value });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filter, sortBy: e.target.value as DebtSortOption });
  };

  return (
    <div className="space-y-2.5">
      {/* Search & Sort Row */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={handleSearchChange}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 transition shadow-2xs"
          />
        </div>

        <div className="relative">
          <select
            value={filter.sortBy}
            onChange={handleSortChange}
            className="appearance-none pl-8 pr-7 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 shadow-2xs"
          >
            <option value="date_desc">{t('sortByDateDesc')}</option>
            <option value="date_asc">{t('sortByDateAsc')}</option>
            <option value="amount_desc">{t('sortByAmountDesc')}</option>
            <option value="amount_asc">{t('sortByAmountAsc')}</option>
            <option value="due_date">{t('sortByDueDate')}</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Main Category Tabs: All / Owe Me / I Owe */}
      <div className="flex bg-slate-200/70 dark:bg-slate-800/70 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => handleTypeChange('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
            filter.type === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          {t('all')}
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('owe_me')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
            filter.type === 'owe_me'
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
        >
          {t('oweMe')}
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('i_owe')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
            filter.type === 'i_owe'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          {t('iOwe')}
        </button>
      </div>

      {/* Secondary Status Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <div className="text-slate-400 dark:text-slate-500 pl-1 pr-0.5">
          <Filter className="w-3.5 h-3.5" />
        </div>
        {(['all', 'active', 'settled', 'overdue'] as DebtFilterStatus[]).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => handleStatusChange(st)}
            className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition ${
              filter.status === st
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {st === 'all' && t('statusAll')}
            {st === 'active' && t('statusActive')}
            {st === 'settled' && t('statusSettled')}
            {st === 'overdue' && t('statusOverdue')}
          </button>
        ))}
      </div>
    </div>
  );
};
