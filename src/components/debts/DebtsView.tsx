import React, { useState, useEffect } from 'react';
import { Inbox } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useDb } from '@/context/DbContext';
import { debtService } from '@/services/debtService';
import { SummaryCards } from '@/components/debts/SummaryCards';
import { DebtFilterBar } from '@/components/debts/DebtFilterBar';
import { DebtCard } from '@/components/debts/DebtCard';
import { DebtFormModal } from '@/components/debts/DebtFormModal';
import { PaymentModal } from '@/components/debts/PaymentModal';
import { PaymentHistoryModal } from '@/components/debts/PaymentHistoryModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { Debt, DebtFilter, FinancialSummary } from '@/types';

interface DebtsViewProps {
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  presetPerson?: { id: string; name: string } | null;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  isAddModalOpen,
  onCloseAddModal,
  presetPerson,
}) => {
  const { t } = useLanguage();
  const { dataVersion, refreshData } = useDb();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<DebtFilter>({
    type: 'all',
    status: 'all',
    searchQuery: '',
    sortBy: 'date_desc',
  });

  // Modal states
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([debtService.getDebts(filter), debtService.getSummary()]).then(
      ([debtList, sum]) => {
        setDebts(debtList);
        setSummary(sum);
        setLoading(false);
      },
    );
  }, [filter, dataVersion]);

  const handleToggleSettlement = async (debt: Debt) => {
    await debtService.toggleSettlement(debt.id, debt.isSettled);
    refreshData();
  };

  const handleSaveDebt = async (data: {
    id?: string;
    personId?: string;
    personName?: string;
    personPhone?: string;
    type: 'owe_me' | 'i_owe';
    amount: number;
    note?: string;
    dueDate?: string;
  }) => {
    if (data.id) {
      await debtService.updateDebt({
        id: data.id,
        personId: data.personId!,
        type: data.type,
        amount: data.amount,
        note: data.note,
        dueDate: data.dueDate,
      });
    } else {
      await debtService.createDebt(data);
    }
    refreshData();
  };

  const handleSavePayment = async (data: {
    debtId: string;
    amount: number;
    paymentDate: string;
    note?: string;
  }) => {
    await debtService.recordPayment(data);
    refreshData();
  };

  const handleDeleteConfirm = async () => {
    if (deletingDebt) {
      await debtService.deleteDebt(deletingDebt.id);
      setDeletingDebt(null);
      refreshData();
    }
  };

  return (
    <div className="space-y-4">
      {/* Financial Summary Cards */}
      {summary && <SummaryCards summary={summary} />}

      {/* Filter and Search Bar */}
      <DebtFilterBar filter={filter} onChange={setFilter} />

      {/* Debts List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Đang tải danh sách nợ...</div>
      ) : debts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {t('noDebtsTitle')}
            </h4>
            <p className="text-xs text-slate-400 mt-1">{t('noDebtsSubtitle')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onToggleSettlement={handleToggleSettlement}
              onOpenPaymentModal={(d) => setPaymentDebt(d)}
              onOpenHistoryModal={(d) => setHistoryDebt(d)}
              onEdit={(d) => setEditingDebt(d)}
              onDelete={(d) => setDeletingDebt(d)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Debt Modal */}
      <DebtFormModal
        isOpen={isAddModalOpen || !!editingDebt}
        initialDebt={editingDebt}
        presetPerson={presetPerson}
        onClose={() => {
          onCloseAddModal();
          setEditingDebt(null);
        }}
        onSave={handleSaveDebt}
      />

      {/* Record Payment Modal */}
      <PaymentModal
        isOpen={!!paymentDebt}
        debt={paymentDebt}
        onClose={() => setPaymentDebt(null)}
        onSavePayment={handleSavePayment}
      />

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={!!historyDebt}
        debt={historyDebt}
        onClose={() => setHistoryDebt(null)}
        onPaymentDeleted={refreshData}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingDebt}
        title={t('delete')}
        message={t('deleteDebtPrompt')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingDebt(null)}
      />
    </div>
  );
};
