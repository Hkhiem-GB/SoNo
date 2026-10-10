import React from 'react';
import { ChevronRight, Edit2, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useLanguage } from '@/context/LanguageContext';
import type { Person } from '@/types';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onClick,
  onEdit,
  onDelete,
}) => {
  const { t, language } = useLanguage();
  const isDebtor = person.type === 'debtor';

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white border rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99] flex items-center justify-between ${
        isDebtor
          ? 'border-emerald-100/90 hover:border-emerald-200'
          : 'border-rose-100/90 hover:border-rose-200'
      }`}
    >
      {/* Left: Avatar with Initial & Info */}
      <div className="flex items-center space-x-3.5 min-w-0 pr-2">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 transition-transform group-hover:scale-105 ${
            isDebtor
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              : 'bg-rose-50 text-rose-600 border border-rose-100'
          }`}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <h4 className="font-bold text-base text-slate-900 truncate">
            {person.name}
          </h4>
          <div className="flex items-center space-x-1 text-xs text-slate-400 mt-0.5">
            {isDebtor ? (
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 inline" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 inline" />
            )}
            <span>
              {t('activitiesCount', { count: person.activitiesCount ?? 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Remaining Amount & Quick Actions */}
      <div className="flex items-center space-x-2 shrink-0">
        <div className="text-right">
          <div className="text-[11px] font-medium text-slate-400">
            {t('totalRemaining')}
          </div>
          <div
            className={`font-black text-base sm:text-lg ${
              (person.totalRemaining ?? 0) === 0
                ? 'text-slate-400'
                : isDebtor
                  ? 'text-emerald-600'
                  : 'text-rose-600'
            }`}
          >
            {formatCurrency(person.totalRemaining ?? 0, 'VND', language)}
          </div>
        </div>

        {/* Action buttons (Edit & Delete) */}
        <div className="flex items-center space-x-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
            title={t('editPerson')}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title={t('deletePerson')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition" />
      </div>
    </div>
  );
};
