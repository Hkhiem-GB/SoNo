import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { debtService } from '@/services/debtService';
import type { Debt, Payment } from '@/types';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  debt: Debt | null;
  onClose: () => void;
  onPaymentDeleted: () => void;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  debt,
  onClose,
  onPaymentDeleted,
}) => {
  const { t, language } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && debt) {
      setLoading(true);
      debtService.getPaymentHistory(debt.id).then((data) => {
        setPayments(data);
        setLoading(false);
      });
    }
  }, [isOpen, debt]);

  if (!debt) return null;

  const handleDelete = async (paymentId: string) => {
    if (confirm('Xóa lần thanh toán này và cộng lại vào số dư nợ?')) {
      await debtService.deletePayment(paymentId);
      const updated = await debtService.getPaymentHistory(debt.id);
      setPayments(updated);
      onPaymentDeleted();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('paymentHistory')} - ${debt.personName}`}>
      <div className="space-y-3">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">Đang tải...</div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {t('noPaymentsYet')}
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
              >
                <div>
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(p.amount, 'VND', language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {formatDate(p.paymentDate, language)}
                  </div>
                  {p.note && <div className="text-slate-600 dark:text-slate-300 mt-1">{p.note}</div>}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="Xóa thanh toán"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
