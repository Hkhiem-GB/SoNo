import React, { useEffect, useState } from 'react';
import { PieChart, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useDb } from '@/context/DbContext';
import { formatCurrency } from '@/utils/formatters';
import { debtService } from '@/services/debtService';
import { personService } from '@/services/personService';
import type { FinancialSummary, Person } from '@/types';

export const ReportsView: React.FC = () => {
  const { t, language } = useLanguage();
  const { dataVersion } = useDb();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([debtService.getSummary(), personService.getPeople()]).then(
      ([sumData, peopleData]) => {
        setSummary(sumData);
        setPeople(peopleData);
        setLoading(false);
      },
    );
  }, [dataVersion]);

  if (loading || !summary) {
    return <div className="py-12 text-center text-sm text-slate-400">Đang tạo báo cáo...</div>;
  }

  const totalVolume = summary.totalOweMe + summary.totalIOwe;
  const oweMeRatio = totalVolume > 0 ? Math.round((summary.totalOweMe / totalVolume) * 100) : 50;
  const iOweRatio = 100 - oweMeRatio;

  // Top debtors (người nợ mình nhiều nhất)
  const topDebtors = [...people]
    .filter((p) => (p.totalOweMe ?? 0) > 0)
    .sort((a, b) => (b.totalOweMe ?? 0) - (a.totalOweMe ?? 0))
    .slice(0, 5);

  // Top creditors (người mình nợ nhiều nhất)
  const topCreditors = [...people]
    .filter((p) => (p.totalIOwe ?? 0) > 0)
    .sort((a, b) => (b.totalIOwe ?? 0) - (a.totalIOwe ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
          {t('navReports')}
        </h2>
      </div>

      {/* Overview Ratio Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Tỷ lệ cơ cấu dòng tiền
        </h3>

        {/* Progress Ratio Bar */}
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${oweMeRatio}%` }}
            title={`Cho vay: ${oweMeRatio}%`}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${iOweRatio}%` }}
            title={`Đi vay: ${iOweRatio}%`}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{t('totalReceivable')}: {oweMeRatio}%</span>
          </div>
          <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>{t('totalPayable')}: {iOweRatio}%</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('settledTotal')}</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">
            {summary.settledDebtsCount} khoản
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center space-x-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('overdueDebts')}</span>
          </div>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400">
            {summary.overdueCount} khoản
          </div>
        </div>
      </div>

      {/* Top Debtors */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
          <TrendingDown className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Top người nợ tôi nhiều nhất
          </h3>
        </div>

        {topDebtors.length === 0 ? (
          <div className="text-xs text-slate-400 py-2">Không có khoản nợ nào cần thu hồi.</div>
        ) : (
          <div className="space-y-2 text-xs">
            {topDebtors.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {formatCurrency(p.totalOweMe ?? 0, 'VND', language)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Creditors */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
          <TrendingUp className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Top người tôi đang nợ nhiều nhất
          </h3>
        </div>

        {topCreditors.length === 0 ? (
          <div className="text-xs text-slate-400 py-2">Bạn không nợ ai. Rất tuyệt vời!</div>
        ) : (
          <div className="space-y-2 text-xs">
            {topCreditors.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                  {formatCurrency(p.totalIOwe ?? 0, 'VND', language)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
