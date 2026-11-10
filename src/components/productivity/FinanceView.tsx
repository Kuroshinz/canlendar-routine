import React, { useMemo, useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Target,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Zap,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Pencil,
  RefreshCw,
  Check,
} from 'lucide-react';
import {
  BudgetSettings,
  FINANCE_CATEGORIES,
  FinanceCategoryId,
  Transaction,
  TransactionType,
} from '../../types/productivity';
import { BarChart, ProgressBar, StackedBar } from '../charts/SimpleCharts';
import {
  computeBudgetStatus,
  dailyCashFlow,
  expenseByCategory,
  filterTransactions,
  formatMoney,
  formatMoneyCompact,
  monthPrefixOf,
  summarizeFinance,
} from '../../utils/productivityUtils';
import { formatDateString } from '../../utils/calendarUtils';

interface FinanceViewProps {
  transactions: Transaction[];
  budget: BudgetSettings;
  lang: 'vi' | 'en';
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onUpdateTransaction?: (id: string, patch: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateBudget: (patch: Partial<BudgetSettings>) => void;
  onClearAllTransactions?: () => void;
  onSetRealStartingBalance?: (realBalance: number) => void;
}

const categoryMeta = (id: FinanceCategoryId) =>
  FINANCE_CATEGORIES.find((c) => c.id === id) || FINANCE_CATEGORIES[FINANCE_CATEGORIES.length - 1];

/** Shift a `YYYY-MM` prefix by `delta` months. */
const shiftMonth = (prefix: string, delta: number): string => {
  const [y, m] = prefix.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthPrefixOf(d);
};

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  budget,
  lang,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onUpdateBudget,
  onClearAllTransactions,
  onSetRealStartingBalance,
}) => {
  const today = formatDateString(new Date());

  const [monthPrefix, setMonthPrefix] = useState(() => monthPrefixOf(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<FinanceCategoryId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [quickBanner, setQuickBanner] = useState<string | null>(null);

  // Real Balance & Edit State
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [realBalanceDraft, setRealBalanceDraft] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [clearDemoConfirm, setClearDemoConfirm] = useState(false);

  const QUICK_EXPENSE_PRESETS = [
    { label: '☕ Cà phê (35k)', amount: 35000, category: 'food' as FinanceCategoryId, title: 'Cà phê sáng' },
    { label: '🍚 Cơm trưa (45k)', amount: 45000, category: 'food' as FinanceCategoryId, title: 'Cơm trưa văn phòng' },
    { label: '⛽ Đổ xăng (70k)', amount: 70000, category: 'transport' as FinanceCategoryId, title: 'Đổ xăng xe máy' },
    { label: '🛒 Siêu thị (150k)', amount: 150000, category: 'shopping' as FinanceCategoryId, title: 'Siêu thị nhu yếu phẩm' },
    { label: '🥤 Trà sữa (40k)', amount: 40000, category: 'food' as FinanceCategoryId, title: 'Trà sữa chiều' },
    { label: '🚗 Grab/Be (50k)', amount: 50000, category: 'transport' as FinanceCategoryId, title: 'Di chuyển Grab/Be' },
  ];

  const handleApplyQuickExpense = (p: typeof QUICK_EXPENSE_PRESETS[0]) => {
    onAddTransaction({
      title: p.title,
      amount: p.amount,
      type: 'expense',
      category: p.category,
      date: today,
      note: 'Ghi nhanh 1-chạm',
    });
    setQuickBanner(`Đã ghi nhận chi tiêu "${p.title}" (-${formatMoney(p.amount, budget.currency)})!`);
    setTimeout(() => setQuickBanner(null), 3500);
  };

  // --- Quick add form state
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<FinanceCategoryId>('food');
  const [formDate, setFormDate] = useState(today);
  const [formNote, setFormNote] = useState('');
  const [limitDraft, setLimitDraft] = useState(String(budget.monthlyLimit));

  const monthSummary = useMemo(() => summarizeFinance(transactions, monthPrefix), [transactions, monthPrefix]);
  const allTime = useMemo(() => summarizeFinance(transactions), [transactions]);
  const budgetStatus = useMemo(
    () => computeBudgetStatus(monthSummary.expense, budget.monthlyLimit),
    [monthSummary.expense, budget.monthlyLimit]
  );

  const realTotalBalance = useMemo(() => {
    return (budget.initialBalance || 0) + allTime.balance;
  }, [budget.initialBalance, allTime.balance]);

  const handleOpenBalanceModal = () => {
    setRealBalanceDraft(String(realTotalBalance));
    setShowBalanceModal(true);
  };

  const handleSaveRealBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(realBalanceDraft.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(target)) return;

    if (onSetRealStartingBalance) {
      onSetRealStartingBalance(target);
    } else {
      onUpdateBudget({ initialBalance: target - allTime.balance });
    }
    setShowBalanceModal(false);
    setQuickBanner(
      lang === 'vi'
        ? `Đã cập nhật số dư thực tế thành ${formatMoney(target, budget.currency)}!`
        : `Real balance updated to ${formatMoney(target, budget.currency)}!`
    );
    setTimeout(() => setQuickBanner(null), 3500);
  };

  const handleStartEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormTitle(tx.title);
    setFormAmount(String(tx.amount));
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormDate(tx.date);
    setFormNote(tx.note || '');
    setShowForm(true);
  };

  const handleConfirmClearDemo = () => {
    if (onClearAllTransactions) {
      onClearAllTransactions();
    }
    setClearDemoConfirm(false);
    setQuickBanner(
      lang === 'vi'
        ? 'Đã xóa toàn bộ dữ liệu mẫu! Sổ sách đã sẵn sàng cho dữ liệu thật của bạn.'
        : 'Demo data cleared! Ledger ready for your real data.'
    );
    setTimeout(() => setQuickBanner(null), 4000);
  };

  const burnRateAnalysis = useMemo(() => {
    const [y, m] = monthPrefix.split('-').map(Number);
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    const totalDaysInMonth = new Date(y, m, 0).getDate();
    const currentDay = isCurrentMonth ? now.getDate() : totalDaysInMonth;
    const daysRemaining = isCurrentMonth ? Math.max(1, totalDaysInMonth - currentDay + 1) : 1;

    const remainingBudget = Math.max(0, budget.monthlyLimit - monthSummary.expense);
    const safeDailySpend = Math.round(remainingBudget / daysRemaining);

    const actualDailyAverage = currentDay > 0 ? Math.round(monthSummary.expense / currentDay) : 0;
    const isOverPaced = actualDailyAverage * totalDaysInMonth > budget.monthlyLimit && budget.monthlyLimit > 0;

    return {
      totalDaysInMonth,
      currentDay,
      daysRemaining,
      remainingBudget,
      safeDailySpend,
      actualDailyAverage,
      isOverPaced,
    };
  }, [monthPrefix, budget.monthlyLimit, monthSummary.expense]);

  const categoryRows = useMemo(() => expenseByCategory(transactions, monthPrefix), [transactions, monthPrefix]);
  const cashFlow = useMemo(() => dailyCashFlow(transactions, monthPrefix), [transactions, monthPrefix]);
  const visibleTransactions = useMemo(
    () => filterTransactions(transactions, { monthPrefix, category: categoryFilter, query }),
    [transactions, monthPrefix, categoryFilter, query]
  );

  const categoryOptions = useMemo(
    () => FINANCE_CATEGORIES.filter((c) => c.type === 'both' || c.type === formType),
    [formType]
  );

  const monthLabel = useMemo(() => {
    const [y, m] = monthPrefix.split('-').map(Number);
    return lang === 'vi' ? `Tháng ${m}/${y}` : `${new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' })} ${y}`;
  }, [monthPrefix, lang]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formAmount.replace(/[^\d.]/g, ''));
    if (!formTitle.trim() || !Number.isFinite(amount) || amount <= 0) return;

    if (editingTransaction && onUpdateTransaction) {
      onUpdateTransaction(editingTransaction.id, {
        title: formTitle.trim(),
        amount,
        type: formType,
        category: formCategory,
        date: formDate || today,
        note: formNote.trim() || undefined,
      });
      setQuickBanner(
        lang === 'vi'
          ? `Đã cập nhật giao dịch "${formTitle.trim()}"!`
          : `Updated transaction "${formTitle.trim()}"!`
      );
      setTimeout(() => setQuickBanner(null), 3000);
    } else {
      onAddTransaction({
        title: formTitle.trim(),
        amount,
        type: formType,
        category: formCategory,
        date: formDate || today,
        note: formNote.trim() || undefined,
      });
    }

    setEditingTransaction(null);
    setFormTitle('');
    setFormAmount('');
    setFormNote('');
    setShowForm(false);
  };

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = Number(limitDraft.replace(/[^\d.]/g, ''));
    if (Number.isFinite(next) && next >= 0) {
      onUpdateBudget({ monthlyLimit: next });
    }
    setShowBudgetEditor(false);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Title', 'Type', 'Category', 'Amount', 'Currency', 'Note'];
    const rows = visibleTransactions.map((t) => [
      t.date,
      `"${t.title.replace(/"/g, '""')}"`,
      t.type,
      t.category,
      t.amount,
      budget.currency,
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financial-report-${monthPrefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const budgetBannerClass =
    budgetStatus.level === 'over'
      ? 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
      : budgetStatus.level === 'warning'
        ? 'border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
        : 'border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';

  const summaryCards = [
    {
      label: lang === 'vi' ? 'Số dư thực tế ví / bank' : 'Real Wallet / Bank Balance',
      value: formatMoney(realTotalBalance, budget.currency),
      hint:
        budget.initialBalance
          ? lang === 'vi'
            ? `Gốc: ${formatMoneyCompact(budget.initialBalance, budget.currency)} · Bấm để đổi`
            : `Base: ${formatMoneyCompact(budget.initialBalance, budget.currency)} · Tap to edit`
          : lang === 'vi'
          ? 'Chạm để đặt số dư thực ➔'
          : 'Tap to set real balance ➔',
      icon: Wallet,
      cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
      action: handleOpenBalanceModal,
    },
    {
      label: lang === 'vi' ? 'Thu nhập tháng' : 'Monthly income',
      value: formatMoney(monthSummary.income, budget.currency),
      hint: `${monthSummary.transactionCount} ${lang === 'vi' ? 'giao dịch' : 'transactions'}`,
      icon: TrendingUp,
      cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: lang === 'vi' ? 'Chi tiêu tháng' : 'Monthly expense',
      value: formatMoney(monthSummary.expense, budget.currency),
      hint: `${budgetStatus.percent}% ${lang === 'vi' ? 'hạn mức' : 'of budget'}`,
      icon: TrendingDown,
      cls: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
    },
    {
      label: lang === 'vi' ? 'Ngân sách còn lại' : 'Remaining budget',
      value: formatMoney(budgetStatus.remaining, budget.currency),
      hint:
        lang === 'vi'
          ? `Hạn mức ${formatMoneyCompact(budget.monthlyLimit, budget.currency)}`
          : `Limit ${formatMoneyCompact(budget.monthlyLimit, budget.currency)}`,
      icon: PiggyBank,
      cls: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-slate-900 p-4 md:p-6 lg:p-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {lang === 'vi' ? 'Quản Lý Tài Chính' : 'Money Manager'}
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {lang === 'vi'
              ? 'Theo dõi thu chi, số dư thực tế và hạn mức ngân sách theo tháng.'
              : 'Track income, spending, real wallet balance and monthly budget.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setMonthPrefix((p) => shiftMonth(p, -1))}
              className="px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#242931] text-gray-600 dark:text-gray-300 cursor-pointer"
              aria-label={lang === 'vi' ? 'Tháng trước' : 'Previous month'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-200 min-w-24 text-center">
              {monthLabel}
            </span>
            <button
              onClick={() => setMonthPrefix((p) => shiftMonth(p, 1))}
              className="px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#242931] text-gray-600 dark:text-gray-300 cursor-pointer"
              aria-label={lang === 'vi' ? 'Tháng sau' : 'Next month'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenBalanceModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title={lang === 'vi' ? 'Đặt số dư thực tế trong ví/tài khoản' : 'Set real bank balance'}
          >
            <Wallet className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Đặt số dư ví' : 'Set balance'}</span>
          </button>

          {transactions.length > 0 && onClearAllTransactions && (
            <button
              onClick={() => setClearDemoConfirm(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-gray-500 dark:text-gray-400 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title={lang === 'vi' ? 'Xóa toàn bộ dữ liệu mẫu ban đầu để bắt đầu sổ sách thực tế của bạn' : 'Clear demo data'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Xóa dữ liệu mẫu' : 'Clear demo'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingTransaction(null);
              setFormTitle('');
              setFormAmount('');
              setFormNote('');
              setFormType('expense');
              setFormCategory('food');
              setShowForm((v) => !v);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Thêm giao dịch' : 'Add transaction'}</span>
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              onClick={card.action}
              className={`bg-white dark:bg-[#131b2e] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 ${
                card.action
                  ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all group/card'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.cls}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate flex items-center gap-1">
                    <span>{card.label}</span>
                    {card.action && <Pencil className="w-2.5 h-2.5 text-blue-500 opacity-0 group-hover/card:opacity-100 transition-opacity" />}
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                    {card.value}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">{card.hint}</div>
                </div>
              </div>
              {card.action && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    card.action();
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 shrink-0 cursor-pointer"
                >
                  {lang === 'vi' ? 'Chỉnh' : 'Edit'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Budget warning / status */}
      <div className={`rounded-2xl border p-3.5 mb-6 ${budgetBannerClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            {budgetStatus.level === 'ok' ? (
              <Target className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold">
                {budgetStatus.level === 'over'
                  ? lang === 'vi'
                    ? `Đã vượt hạn mức ${formatMoney(Math.abs(budgetStatus.remaining), budget.currency)}`
                    : `Over budget by ${formatMoney(Math.abs(budgetStatus.remaining), budget.currency)}`
                  : budgetStatus.level === 'warning'
                    ? lang === 'vi'
                      ? 'Sắp chạm hạn mức chi tiêu tháng'
                      : 'Approaching this month’s spending limit'
                    : lang === 'vi'
                      ? 'Chi tiêu trong tầm kiểm soát'
                      : 'Spending is under control'}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {lang === 'vi'
                  ? `Đã chi ${formatMoney(monthSummary.expense, budget.currency)} / ${formatMoney(budget.monthlyLimit, budget.currency)}`
                  : `Spent ${formatMoney(monthSummary.expense, budget.currency)} of ${formatMoney(budget.monthlyLimit, budget.currency)}`}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setLimitDraft(String(budget.monthlyLimit));
              setShowBudgetEditor((v) => !v);
            }}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/70 dark:bg-black/30 border border-current/20 hover:bg-white dark:hover:bg-black/50 transition-colors cursor-pointer"
          >
            {lang === 'vi' ? 'Đặt hạn mức' : 'Set limit'}
          </button>
        </div>

        <div className="mt-3">
          <ProgressBar
            percent={budgetStatus.percent}
            color={
              budgetStatus.level === 'over' ? '#E11D48' : budgetStatus.level === 'warning' ? '#F59E0B' : '#059669'
            }
            height={8}
          />
        </div>

        {showBudgetEditor && (
          <form onSubmit={handleSaveLimit} className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={100000}
              value={limitDraft}
              onChange={(e) => setLimitDraft(e.target.value)}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder={lang === 'vi' ? 'Hạn mức tháng (VND)' : 'Monthly limit (VND)'}
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {lang === 'vi' ? 'Lưu' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setShowBudgetEditor(false)}
              className="px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-300 dark:border-gray-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* Quick Toast Banner */}
      {quickBanner && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{quickBanner}</span>
        </div>
      )}

      {/* Smart Safe Spending & Burn Rate Advisor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-2 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">
                {lang === 'vi' ? 'Hạn Mức Chi Tiêu An Toàn Mỗi Ngày' : 'Safe Daily Spending Allowance'}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {lang === 'vi' ? `Còn ${burnRateAnalysis.daysRemaining} ngày` : `${burnRateAnalysis.daysRemaining} days left`}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatMoney(burnRateAnalysis.safeDailySpend, budget.currency)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              /{lang === 'vi' ? 'ngày an toàn' : 'day safe'}
            </span>
          </div>

          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {lang === 'vi'
              ? `Nếu mỗi ngày chỉ chi tối đa mức này, bạn sẽ hoàn toàn không vượt ngân sách ${formatMoney(budget.monthlyLimit, budget.currency)} vào cuối tháng.`
              : `Spending up to this amount daily guarantees you stay within your ${formatMoney(budget.monthlyLimit, budget.currency)} monthly limit.`}
          </div>
        </div>

        <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
          burnRateAnalysis.isOverPaced
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
        }`}>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Flame className={`w-4 h-4 ${burnRateAnalysis.isOverPaced ? 'text-amber-500' : 'text-blue-500'}`} />
            <span className={burnRateAnalysis.isOverPaced ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}>
              {lang === 'vi' ? 'Tốc Độ Tiêu Dùng (Burn Rate)' : 'Monthly Burn Rate'}
            </span>
          </div>

          <div className="my-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {lang === 'vi' ? 'Trung bình thực tế:' : 'Actual daily avg:'}
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {formatMoney(burnRateAnalysis.actualDailyAverage, budget.currency)}
              <span className="text-xs font-normal text-gray-400">/{lang === 'vi' ? 'ngày' : 'day'}</span>
            </div>
          </div>

          <div className="text-[10px] font-medium leading-relaxed">
            {burnRateAnalysis.isOverPaced ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                ⚠️ {lang === 'vi' ? 'Đang tiêu nhanh hơn hạn mức dự kiến!' : 'Pacing faster than target limit!'}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                ✨ {lang === 'vi' ? 'Tiến độ tiêu dùng rất cân đối và ổn định.' : 'Healthy and sustainable pacing.'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick 1-Tap Expense Strip */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 mb-6 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'vi' ? 'Ghi Nhanh Chi Tiêu Thường Ngày (1-Chạm)' : 'Quick 1-Tap Frequent Expenses'}</span>
          </div>
          <span className="text-[10px] text-gray-400">
            {lang === 'vi' ? 'Bấm để ghi nhận tức thì vào hôm nay' : 'Tap to log instantly for today'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {QUICK_EXPENSE_PRESETS.map((preset) => (
            <button
              key={preset.title}
              onClick={() => handleApplyQuickExpense(preset)}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-slate-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer"
            >
              <span className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                {preset.label}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 font-mono">
                {formatMoneyCompact(preset.amount, budget.currency)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick add / edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 mb-6 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              {editingTransaction ? (
                <>
                  <Pencil className="w-3.5 h-3.5 text-blue-500" />
                  <span>{lang === 'vi' ? 'Chỉnh sửa giao dịch' : 'Edit transaction'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{lang === 'vi' ? 'Thêm nhanh khoản thu / chi' : 'Quick add income / expense'}</span>
                </>
              )}
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setShowForm(false);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242931] text-gray-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <div className="bg-gray-200/80 dark:bg-gray-800 p-1 rounded-xl flex text-xs font-semibold">
                {(['expense', 'income'] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFormType(t);
                      const first = FINANCE_CATEGORIES.find((c) => c.type === t || c.type === 'both');
                      setFormCategory(first ? first.id : 'other');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                      formType === t
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {t === 'expense' ? (
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                    )}
                    {t === 'expense' ? (lang === 'vi' ? 'Chi' : 'Expense') : lang === 'vi' ? 'Thu' : 'Income'}
                  </button>
                ))}
              </div>
            </div>

            <input
              className="md:col-span-3 text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder={lang === 'vi' ? 'Nội dung (VD: Cà phê sáng)' : 'Title (e.g. Morning coffee)'}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />

            <input
              type="number"
              min={0}
              step={1000}
              className="md:col-span-2 text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono"
              placeholder={lang === 'vi' ? 'Số tiền' : 'Amount'}
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              required
            />

            <select
              className="md:col-span-2 text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as FinanceCategoryId)}
            >
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'vi' ? c.nameVi : c.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="md:col-span-2 text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />

            <input
              className="md:col-span-8 text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder={lang === 'vi' ? 'Ghi chú (không bắt buộc)' : 'Note (optional)'}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
            />

            <div className="md:col-span-4 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-colors"
              >
                {editingTransaction
                  ? lang === 'vi'
                    ? 'Cập nhật'
                    : 'Update'
                  : lang === 'vi'
                  ? 'Lưu giao dịch'
                  : 'Save transaction'}
              </button>
              {editingTransaction && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTransaction(null);
                    setShowForm(false);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: history */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FinanceCategoryId | 'all')}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              <option value="all">{lang === 'vi' ? 'Mọi danh mục' : 'All categories'}</option>
              {FINANCE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'vi' ? c.nameVi : c.name}
                </option>
              ))}
            </select>

            <div className="flex-1 min-w-32 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={lang === 'vi' ? 'Tìm giao dịch...' : 'Search transactions...'}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={visibleTransactions.length === 0}
              title={lang === 'vi' ? 'Xuất danh sách giao dịch sang file CSV' : 'Export transactions to CSV'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-200 text-xs font-medium cursor-pointer shrink-0 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === 'vi' ? 'Xuất CSV' : 'Export'}</span>
            </button>
          </div>

          {visibleTransactions.length === 0 ? (
            <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
              <Wallet className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400">
                {lang === 'vi' ? 'Chưa có giao dịch nào trong tháng này.' : 'No transactions in this month.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {visibleTransactions.map((tx) => {
                const meta = categoryMeta(tx.category);
                const isIncome = tx.type === 'income';
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-gray-50 dark:hover:bg-[#242931]">
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                    >
                      {isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {tx.title}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {lang === 'vi' ? meta.nameVi : meta.name} · {tx.date}
                        {tx.note ? ` · ${tx.note}` : ''}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold font-mono shrink-0 ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '−'}
                      {formatMoney(tx.amount, budget.currency)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onUpdateTransaction && (
                        <button
                          onClick={() => handleStartEditTransaction(tx)}
                          className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors"
                          title={lang === 'vi' ? 'Sửa giao dịch' : 'Edit transaction'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                        title={lang === 'vi' ? 'Xóa giao dịch' : 'Delete transaction'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: charts */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              {lang === 'vi' ? 'Tỷ lệ chi tiêu theo danh mục' : 'Spending by category'}
            </h3>

            {categoryRows.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                {lang === 'vi' ? 'Chưa có khoản chi nào.' : 'No expenses yet.'}
              </p>
            ) : (
              <>
                <StackedBar
                  segments={categoryRows.map((row) => ({
                    value: row.amount,
                    color: categoryMeta(row.category).color,
                    label: lang === 'vi' ? categoryMeta(row.category).nameVi : categoryMeta(row.category).name,
                  }))}
                  height={12}
                />
                <div className="mt-3 space-y-1.5">
                  {categoryRows.slice(0, 6).map((row) => {
                    const meta = categoryMeta(row.category);
                    const pct = monthSummary.expense > 0 ? Math.round((row.amount / monthSummary.expense) * 100) : 0;
                    return (
                      <div key={row.category} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                        <span className="text-[11px] text-gray-600 dark:text-gray-300 flex-1 truncate">
                          {lang === 'vi' ? meta.nameVi : meta.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{pct}%</span>
                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 font-mono w-16 text-right">
                          {formatMoneyCompact(row.amount, budget.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              {lang === 'vi' ? 'Dòng tiền theo ngày' : 'Daily cash flow'}
            </h3>
            <BarChart
              data={cashFlow.map((row) => ({
                label: String(Number(row.date.slice(-2))),
                value: row.expense,
                color: row.income > 0 ? '#33B679' : '#E67C73',
              }))}
              height={120}
              formatValue={(v) => formatMoneyCompact(v, budget.currency)}
              emptyLabel={lang === 'vi' ? 'Chưa có dữ liệu' : 'No data'}
              highlightLast={0}
            />
            <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
              <span>
                {lang === 'vi' ? 'Chi' : 'Expense'}: {formatMoneyCompact(monthSummary.expense, budget.currency)}
              </span>
              <span>
                {lang === 'vi' ? 'Thu' : 'Income'}: {formatMoneyCompact(monthSummary.income, budget.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Set Real Balance Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#131b2e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {lang === 'vi' ? 'Thiết Lập Số Dư Thực Tế Ví / Tài Khoản' : 'Set Real Wallet / Bank Balance'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBalanceModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              {lang === 'vi'
                ? 'Nhập đúng số tiền bạn đang thực sự có trong ví hoặc tài khoản ngân hàng. Hệ thống sẽ căn chỉnh chuẩn xác để số dư hiển thị khớp 100% với đời thực của bạn.'
                : 'Enter the exact amount of money you currently have in your wallet/bank. The app will sync your balance to reflect your real-life net worth.'}
            </p>

            <form onSubmit={handleSaveRealBalance}>
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  {lang === 'vi' ? 'Số dư hiện có lúc này' : 'Current real balance'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={1000}
                    value={realBalanceDraft}
                    onChange={(e) => setRealBalanceDraft(e.target.value)}
                    className="w-full text-lg font-bold font-mono px-3 py-2.5 rounded-xl border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    placeholder="VD: 25000000"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    {budget.currency}
                  </span>
                </div>
                {Number(realBalanceDraft) > 0 && (
                  <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1 font-mono">
                    ≈ {formatMoney(Number(realBalanceDraft), budget.currency)}
                  </p>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="mb-4">
                <span className="text-[10px] text-gray-400 block mb-1">
                  {lang === 'vi' ? 'Chọn nhanh:' : 'Quick presets:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1000000, 5000000, 10000000, 20000000, 50000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRealBalanceDraft(String(val))}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                    >
                      {formatMoneyCompact(val, budget.currency)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBalanceModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === 'vi' ? 'Cập Nhật Số Dư' : 'Update Balance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Clear Demo Data Modal */}
      {clearDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#131b2e] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold">
                {lang === 'vi' ? 'Xóa Dữ Liệu Mẫu Để Dùng Thật?' : 'Clear Demo Data to Start Real?'}
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              {lang === 'vi'
                ? 'Thao tác này sẽ xóa tất cả các giao dịch mẫu ban đầu và giải phóng sổ sách. Bạn có thể nhập số dư thực tế và bắt đầu ghi nhận các khoản thu chi có thật của mình.'
                : 'This will delete all sample transactions so you can start clean with your real wallet balance and actual transactions.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setClearDemoConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                {lang === 'vi' ? 'Giữ lại' : 'Keep'}
              </button>
              <button
                type="button"
                onClick={handleConfirmClearDemo}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                {lang === 'vi' ? 'Xóa mẫu & Bắt đầu thật' : 'Clear & Start Real'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

