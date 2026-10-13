import React, { useState } from 'react';
import { UserPlus, ArrowDownLeft, ArrowUpRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useDebtStore } from '@/context/DebtContext';
import { formatCurrency } from '@/utils/formatters';
import { PersonCard } from '@/components/debts/PersonCard';
import { AddPersonModal } from '@/components/common/AddPersonModal';
import { EditPersonModal } from '@/components/common/EditPersonModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { Person, PersonType } from '@/types';

interface PersonListViewProps {
  type: PersonType;
  onSelectPerson: (personId: string) => void;
}

export const PersonListView: React.FC<PersonListViewProps> = ({
  type,
  onSelectPerson,
}) => {
  const { t, language } = useLanguage();
  const {
    debtors,
    creditors,
    totalDebtorsRemaining,
    totalCreditorsRemaining,
    dbError,
    refreshData,
    addPerson,
    updatePersonName,
    deletePerson,
  } = useDebtStore();

  const isDebtor = type === 'debtor' || type === 'DEBTOR';
  const people = isDebtor ? debtors : creditors;
  const totalAmount = isDebtor ? totalDebtorsRemaining : totalCreditorsRemaining;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);

  const handleConfirmDelete = async () => {
    if (deletingPerson) {
      try {
        await deletePerson(deletingPerson.id);
        setDeletingPerson(null);
      } catch (err: unknown) {
        console.error('[PersonListView] Error deleting person:', err);
      }
    }
  };

  // Warning text calculation when deleting a person who still has unpaid debts
  const hasUnpaidDebt = deletingPerson ? (deletingPerson.totalRemaining || 0) > 0 : false;
  const deleteTitle = hasUnpaidDebt
    ? (language === 'vi' ? '⚠️ Cảnh báo còn khoản nợ chưa trả!' : '⚠️ Warning: Unpaid Debts Remaining!')
    : t('deletePersonConfirmTitle');

  const deleteMessage = deletingPerson
    ? hasUnpaidDebt
      ? language === 'vi'
        ? `"${deletingPerson.name}" hiện vẫn còn khoản nợ chưa thanh toán là ${formatCurrency(deletingPerson.totalRemaining, 'VND', language)}. Nếu bạn xóa người này, tất cả các hoạt động nợ và lịch sử thanh toán liên quan sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu! Bạn có chắc chắn muốn tiếp tục?`
        : `"${deletingPerson.name}" still has an unpaid balance of ${formatCurrency(deletingPerson.totalRemaining, 'VND', language)}. Deleting this person will permanently erase all associated debt activities and payment records! Are you sure?`
      : t('deletePersonConfirmMessage')
    : '';

  return (
    <div className="space-y-4">
      {/* Database Error Banner if any */}
      {dbError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{dbError}</span>
          </div>
          <button
            type="button"
            onClick={() => refreshData()}
            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg text-rose-600 dark:text-rose-400 font-bold flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Overview Balance Card with Standout Gradient */}
      <div
        className={`rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all duration-300 text-white ${
          isDebtor
            ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-emerald-600/25 border border-emerald-400/30'
            : 'bg-gradient-to-br from-rose-500 via-pink-600 to-amber-600 shadow-rose-600/25 border border-rose-400/30'
        }`}
      >
        {/* Soft atmospheric background glow effects */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/15 rounded-full blur-2xl pointer-events-none" />
        <div
          className={`absolute right-8 -bottom-10 w-28 h-28 rounded-full blur-xl pointer-events-none ${
            isDebtor ? 'bg-teal-300/20' : 'bg-amber-300/20'
          }`}
        />

        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white border border-white/20 shadow-xs">
              {isDebtor ? (
                <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              )}
            </span>
            <span className="text-xs font-extrabold tracking-wider uppercase text-white/90 drop-shadow-xs">
              {isDebtor ? t('totalReceivable') : t('totalPayable')}
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black mt-2 tracking-tight text-white drop-shadow-sm font-heading">
            {formatCurrency(totalAmount, 'VND', language)}
          </div>

          <p className="text-xs text-white/85 mt-1.5 font-medium flex items-center space-x-1.5">
            <span>{isDebtor ? t('debtorsSubtitle') : t('creditorsSubtitle')}</span>
            <span className="opacity-60">•</span>
            <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-full text-[11px] backdrop-blur-xs">
              {people.length} {isDebtor ? t('tabDebtors').toLowerCase() : t('tabCreditors').toLowerCase()}
            </span>
          </p>
        </div>
      </div>

      {/* People Cards List */}
      {people.length > 0 ? (
        <div className="space-y-2.5">
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onClick={() => onSelectPerson(person.id)}
              onEdit={() => setEditingPerson(person)}
              onDelete={() => setDeletingPerson(person)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xs mt-2">
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
              isDebtor
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
            }`}
          >
            <UserPlus className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
              {isDebtor ? (language === 'vi' ? 'Chưa có con nợ nào' : 'No debtors yet') : (language === 'vi' ? 'Chưa có chủ nợ nào' : 'No creditors yet')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {isDebtor
                ? (language === 'vi' ? 'Thêm người đang nợ bạn tiền để theo dõi các khoản nợ và trả nợ.' : 'Add people who owe you money to track debts and repayments.')
                : (language === 'vi' ? 'Thêm người mà bạn đang nợ tiền để quản lý thanh toán kịp thời.' : 'Add people you owe money to manage payments on time.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className={`px-5 py-2.5 rounded-2xl text-white font-bold text-xs shadow-md transition active:scale-95 inline-flex items-center space-x-2 ${
              isDebtor
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{isDebtor ? t('addDebtor') : t('addCreditor')}</span>
          </button>
        </div>
      )}

      {/* Floating Action Button (FAB) as the primary add action */}
      <div
        className="fixed z-30 right-6 sm:right-[max(1.5rem,calc((100vw-28rem)/2+1.5rem))]"
        style={{
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 76px)',
        }}
      >
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className={`w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all ${
            isDebtor
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/30 hover:shadow-emerald-600/40'
              : 'bg-gradient-to-tr from-rose-600 to-amber-500 shadow-rose-600/30 hover:shadow-rose-600/40'
          }`}
          title={isDebtor ? t('addDebtor') : t('addCreditor')}
        >
          <UserPlus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isAddOpen}
        type={type}
        onClose={() => setIsAddOpen(false)}
        onAdd={(name, pType) => addPerson(name, pType)}
      />

      {/* Edit Person Modal */}
      <EditPersonModal
        isOpen={!!editingPerson}
        person={editingPerson}
        onClose={() => setEditingPerson(null)}
        onSave={(personId, newName) => updatePersonName(personId, newName)}
      />

      {/* Confirm Delete Dialog with warning if unpaid debt remains */}
      <ConfirmDialog
        isOpen={!!deletingPerson}
        title={deleteTitle}
        message={deleteMessage}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingPerson(null)}
      />
    </div>
  );
};
