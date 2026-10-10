import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  DollarSign,
  CheckCircle2,
  Calendar,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Edit2,
  History,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useDebtStore } from '@/context/DebtContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { AddActivityModal } from '@/components/debts/AddActivityModal';
import { EditActivityModal } from '@/components/debts/EditActivityModal';
import { PaymentAmountModal } from '@/components/debts/PaymentAmountModal';
import { PaymentHistoryModal } from '@/components/debts/PaymentHistoryModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { Activity } from '@/types';

interface PersonDetailViewProps {
  personId: string;
  onBack: () => void;
}

export const PersonDetailView: React.FC<PersonDetailViewProps> = ({
  personId,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const {
    getPerson,
    getPersonActivities,
    addActivity,
    updateActivity,
    recordPayment,
    markActivityAsPaid,
    deleteActivity,
  } = useDebtStore();

  const person = getPerson(personId);
  const activities = getPersonActivities(personId);

  // Modal & menu states
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [historyActivity, setHistoryActivity] = useState<Activity | null>(null);
  const [paymentActivity, setPaymentActivity] = useState<Activity | null>(null);
  const [markingPaidActivity, setMarkingPaidActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (!person) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-sm text-slate-500">Không tìm thấy thông tin người này.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const isDebtor = person.type === 'debtor' || person.type === 'DEBTOR';

  const handleMarkPaidConfirm = async () => {
    if (markingPaidActivity) {
      try {
        await markActivityAsPaid(person.id, markingPaidActivity.id);
        setMarkingPaidActivity(null);
      } catch (err: unknown) {
        console.error('[PersonDetailView] Error marking paid:', err);
      }
    }
  };

  const handleDeleteActivityConfirm = async () => {
    if (deletingActivity) {
      try {
        await deleteActivity(person.id, deletingActivity.id);
        setDeletingActivity(null);
      } catch (err: unknown) {
        console.error('[PersonDetailView] Error deleting activity:', err);
      }
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right duration-200">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-3 py-2 -ml-2 rounded-xl text-slate-700 hover:bg-black/5 transition text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>

        <span
          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            isDebtor
              ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-200'
              : 'bg-rose-100/90 text-rose-800 border border-rose-200'
          }`}
        >
          {isDebtor ? (
            <>
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('tabDebtors')}</span>
            </>
          ) : (
            <>
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-700" />
              <span>{t('tabCreditors')}</span>
            </>
          )}
        </span>
      </div>

      {/* Person Summary Card with Standout Gradient */}
      <div
        className={`rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all duration-300 text-white ${
          isDebtor
            ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-emerald-600/25 border border-emerald-400/30'
            : 'bg-gradient-to-br from-rose-500 via-pink-600 to-amber-600 shadow-rose-600/25 border border-rose-400/30'
        }`}
      >
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/15 rounded-full blur-2xl pointer-events-none" />
        <div
          className={`absolute right-8 -bottom-10 w-28 h-28 rounded-full blur-xl pointer-events-none ${
            isDebtor ? 'bg-teal-300/20' : 'bg-amber-300/20'
          }`}
        />

        <div className="relative z-10 text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-xs">
            {person.name}
          </h2>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
            {t('totalRemaining')}
          </div>
          <div className="text-3xl sm:text-4xl font-black tracking-tight pt-1 text-white drop-shadow-sm font-heading">
            {formatCurrency(person.totalRemaining ?? 0, 'VND', language)}
          </div>
        </div>

        {/* Action Button: Add Activity */}
        <div className="relative z-10 mt-4 pt-4 border-t border-white/20 flex justify-center">
          <button
            type="button"
            onClick={() => setIsAddActivityOpen(true)}
            className={`w-full max-w-xs py-3 px-4 rounded-2xl text-xs font-bold shadow-md active:scale-95 transition flex items-center justify-center space-x-2 ${
              isDebtor
                ? 'bg-white text-emerald-800 hover:bg-emerald-50 shadow-black/10'
                : 'bg-white text-rose-800 hover:bg-rose-50 shadow-black/10'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('addActivity')}</span>
          </button>
        </div>
      </div>

      {/* Activities Header */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {t('activitiesTitle')} ({activities.length})
        </h3>
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">
              {t('emptyActivitiesTitle')}
            </h4>
            <p className="text-xs text-slate-400 mt-1">{t('emptyActivitiesDesc')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activities.map((act) => {
            const isMenuOpen = activeMenuId === act.id;

            return (
              <div
                key={act.id}
                className={`relative bg-white border rounded-2xl p-4 shadow-xs transition-all ${
                  act.isPaid
                    ? 'opacity-70 bg-slate-50/70 border-slate-200'
                    : isDebtor
                      ? 'border-emerald-100/90 hover:border-emerald-200'
                      : 'border-rose-100/90 hover:border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left info: Title & Date */}
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`font-bold text-base truncate ${
                        act.isPaid
                          ? 'line-through text-slate-400'
                          : 'text-slate-900'
                      }`}
                    >
                      {act.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(act.date, language)}</span>
                      </div>

                      {act.isPaid ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('isPaid')}</span>
                        </span>
                      ) : act.paidAmount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setHistoryActivity(act)}
                          className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center space-x-1"
                        >
                          <History className="w-3 h-3" />
                          <span>Đã trả {formatCurrency(act.paidAmount, 'VND', language)}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Right info: Remaining amount and 3-dots Menu */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      {act.isPaid ? (
                        <span className="text-xs font-semibold text-slate-400 line-through">
                          {formatCurrency(act.amount, 'VND', language)}
                        </span>
                      ) : (
                        <span
                          className={`font-black text-base sm:text-lg ${
                            isDebtor
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatCurrency(act.remainingAmount, 'VND', language)}
                        </span>
                      )}
                    </div>

                    {/* 3-Dots Action Menu Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(isMenuOpen ? null : act.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu Popup */}
                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 top-8 z-50 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                            {/* Option 1: Nhập số tiền (Thanh toán một phần) */}
                            {!act.isPaid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setPaymentActivity(act);
                                }}
                                className="w-full px-3.5 py-2.5 text-left flex items-center space-x-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition"
                              >
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                <span>{t('enterPaymentAmount')}</span>
                              </button>
                            )}

                            {/* Option 2: Đã trả (Đánh dấu hoàn tất) */}
                            {!act.isPaid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setMarkingPaidActivity(act);
                                }}
                                className="w-full px-3.5 py-2.5 text-left flex items-center space-x-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition"
                              >
                                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                <span>{t('markAsPaid')}</span>
                              </button>
                            )}

                            {/* Option 3: Sửa hoạt động */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setEditingActivity(act);
                              }}
                              className="w-full px-3.5 py-2.5 text-left flex items-center space-x-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition"
                            >
                              <Edit2 className="w-4 h-4 text-blue-500" />
                              <span>Sửa hoạt động</span>
                            </button>

                            {/* Option 4: Lịch sử trả (nếu đã từng thanh toán) */}
                            {act.paidAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setHistoryActivity(act);
                                }}
                                className="w-full px-3.5 py-2.5 text-left flex items-center space-x-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition"
                              >
                                <History className="w-4 h-4 text-amber-500" />
                                <span>Lịch sử thanh toán</span>
                              </button>
                            )}

                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                            {/* Option 5: Xóa hoạt động */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeletingActivity(act);
                              }}
                              className="w-full px-3.5 py-2 text-left flex items-center space-x-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                              <span>{t('delete')}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={isAddActivityOpen}
        personName={person.name}
        onClose={() => setIsAddActivityOpen(false)}
        onAdd={(data) => addActivity(person.id, data)}
      />

      {/* Edit Activity Modal */}
      <EditActivityModal
        isOpen={!!editingActivity}
        activity={editingActivity}
        onClose={() => setEditingActivity(null)}
        onSave={(actId, data) => updateActivity(actId, data)}
      />

      {/* Payment Amount Modal (Option 1: Nhập số tiền thanh toán) */}
      <PaymentAmountModal
        isOpen={!!paymentActivity}
        activity={paymentActivity}
        onClose={() => setPaymentActivity(null)}
        onSavePayment={(actId, amount, note) => recordPayment(person.id, actId, amount, note)}
      />

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={!!historyActivity}
        activity={historyActivity}
        onClose={() => setHistoryActivity(null)}
      />

      {/* Confirm Mark Paid Dialog (Option 2: Đánh dấu Đã trả không tạo fake payment) */}
      <ConfirmDialog
        isOpen={!!markingPaidActivity}
        title={t('markPaidConfirmTitle')}
        message={t('markPaidConfirmMessage')}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        isDestructive={false}
        onConfirm={handleMarkPaidConfirm}
        onCancel={() => setMarkingPaidActivity(null)}
      />

      {/* Confirm Delete Activity Dialog */}
      <ConfirmDialog
        isOpen={!!deletingActivity}
        title={t('deleteActivityConfirmTitle')}
        message={t('deleteActivityConfirmMessage')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        isDestructive={true}
        onConfirm={handleDeleteActivityConfirm}
        onCancel={() => setDeletingActivity(null)}
      />
    </div>
  );
};
