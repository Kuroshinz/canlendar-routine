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
  onDeleteTransaction: (id: string) => void;
  onUpdateBudget: (patch: Partial<BudgetSettings>) => void;
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
  onDeleteTransaction,
  onUpdateBudget,
}) => {
  const today = formatDateString(new Date());

  const [monthPrefix, setMonthPrefix] = useState(() => monthPrefixOf(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<FinanceCategoryId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);

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

    onAddTransaction({
      title: formTitle.trim(),
      amount,
      type: formType,
      category: formCategory,
      date: formDate || today,
      note: formNote.trim() || undefined,
    });

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

  const budgetBannerClass =
    budgetStatus.level === 'over'
      ? 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
      : budgetStatus.level === 'warning'
        ? 'border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
        : 'border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';

  const summaryCards = [
    {
      label: lang === 'vi' ? 'Số dư tổng' : 'Total balance',
      value: formatMoney(allTime.balance, budget.currency),
      hint: lang === 'vi' ? 'Tất cả giao dịch' : 'All transactions',
      icon: Wallet,
      cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
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
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 select-none">
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
              ? 'Theo dõi thu chi, hạn mức ngân sách và dòng tiền theo tháng.'
              : 'Track income, spending, budgets and monthly cash flow.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => {
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
              className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.cls}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
                  {card.label}
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                  {card.value}
                </div>
                <div className="text-[10px] text-gray-400 truncate">{card.hint}</div>
              </div>
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

      {/* Quick add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {lang === 'vi' ? 'Thêm nhanh khoản thu / chi' : 'Quick add income / expense'}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
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
            />

            <input
              type="number"
              min={0}
              step={1000}
              className="md:col-span-2 text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder={lang === 'vi' ? 'Số tiền' : 'Amount'}
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
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
              className="md:col-span-9 text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder={lang === 'vi' ? 'Ghi chú (không bắt buộc)' : 'Note (optional)'}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
            />

            <button
              type="submit"
              className="md:col-span-3 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {lang === 'vi' ? 'Lưu giao dịch' : 'Save transaction'}
            </button>
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
          </div>

          {visibleTransactions.length === 0 ? (
            <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
              <Wallet className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400">
                {lang === 'vi' ? 'Chưa có giao dịch nào trong tháng này.' : 'No transactions in this month.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
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
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1 rounded-lg text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label={lang === 'vi' ? 'Xóa giao dịch' : 'Delete transaction'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: charts */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4">
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

          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4">
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
    </div>
  );
};
