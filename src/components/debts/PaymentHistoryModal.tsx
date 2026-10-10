import React, { useState, useEffect } from 'react';
import { History, Receipt } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { paymentRepository } from '@/repositories/paymentRepository';
import type { Activity, Debt, PaymentHistoryItem } from '@/types';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  activity?: Activity | null;
  debt?: Debt | null;
  onClose: () => void;
  onPaymentDeleted?: () => void;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  activity,
  debt,
  onClose,
}) => {
  const { language } = useLanguage();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const targetId = activity ? activity.id : debt ? debt.id : null;
  const titleText = activity
    ? `Lịch sử trả tiền — ${activity.title}`
    : debt
      ? `Lịch sử trả tiền — ${debt.personName || 'Khoản nợ'}`
      : 'Lịch sử trả tiền';

  const amountDisplay = activity ? activity.amount : debt ? debt.amount : 0;
  const paidDisplay = activity ? activity.paidAmount : debt ? debt.paidAmount : 0;

  useEffect(() => {
    if (isOpen && targetId) {
      setLoading(true);
      paymentRepository
        .getByActivityId(targetId)
        .then((data) => {
          setPayments(data);
        })
        .catch((err) => {
          console.error('[PaymentHistoryModal] Error fetching payments:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, targetId]);

  if (!activity && !debt) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleText}>
      <div className="space-y-3">
        {/* Summary info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
          <div>
            <span className="text-slate-400">Tổng ban đầu: </span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {formatCurrency(amountDisplay, 'VND', language)}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Đã trả: </span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(paidDisplay, 'VND', language)}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">Đang tải lịch sử thanh toán...</div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p>Chưa có đợt thanh toán nào được ghi nhận cho khoản này.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {payments.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Lần {payments.length - idx}: +{formatCurrency(p.amount, 'VND', language)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {formatDate(p.paidAt, language)}
                  </div>
                  {p.note && (
                    <div className="text-slate-600 dark:text-slate-300 mt-1 italic">
                      "{p.note}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
