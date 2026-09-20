import React, { useState, useMemo } from 'react';
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit, 
    Wallet, 
    Calendar,
    ChevronLeft,
    ChevronRight,
    Receipt,
    ShoppingBag,
    Droplets,
    Zap,
    Wifi,
    Building2,
    Tag,
    X,
    Filter,
    ArrowUpRight,
    PieChart
} from 'lucide-react';
import { Expense, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import AddExpenseModal from './AddExpenseModal';
import Header from './Header';
import ConfirmationModal from './ConfirmationModal';

interface ExpensesProps {
    companySettings?: CompanySettings | null;
    expenses: Expense[];
    onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    onUpdateExpense: (expense: Expense) => Promise<void>;
    onDeleteExpense: (id: string | string[]) => Promise<void>;
}

const Expenses: React.FC<ExpensesProps> = ({ 
    companySettings,
    expenses, 
    onAddExpense, 
    onUpdateExpense, 
    onDeleteExpense 
}) => {
    const { t, isRTL, language } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Date filtering state
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const categories = [
        { 
            id: 'Achats', 
            label: language === 'fr' ? 'Achats' : language === 'ar' ? 'مشتريات' : 'Purchases', 
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-700 dark:text-emerald-400',
            border: 'border-emerald-200',
            badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: ShoppingBag 
        },
        { 
            id: 'Water', 
            label: t('expWater'), 
            bg: 'bg-sky-500/10',
            text: 'text-sky-700 dark:text-sky-400',
            border: 'border-sky-200',
            badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
            icon: Droplets 
        },
        { 
            id: 'Electricity', 
            label: t('expElectricity'), 
            bg: 'bg-amber-500/10',
            text: 'text-amber-700 dark:text-amber-400',
            border: 'border-amber-200',
            badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: Zap 
        },
        { 
            id: 'Internet', 
            label: t('expInternet'), 
            bg: 'bg-indigo-500/10',
            text: 'text-indigo-700 dark:text-indigo-400',
            border: 'border-indigo-200',
            badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            icon: Wifi 
        },
        { 
            id: 'Rent', 
            label: t('expRent'), 
            bg: 'bg-purple-500/10',
            text: 'text-purple-700 dark:text-purple-400',
            border: 'border-purple-200',
            badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
            icon: Building2 
        },
        { 
            id: 'Other', 
            label: t('expOther'), 
            bg: 'bg-slate-500/10',
            text: 'text-slate-700 dark:text-slate-400',
            border: 'border-slate-200',
            badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
            icon: Tag 
        }
    ];

    const getCategoryConfig = (catId: string) => {
        return categories.find(c => c.id === catId) || {
            id: catId,
            label: catId,
            bg: 'bg-slate-500/10',
            text: 'text-slate-700',
            border: 'border-slate-200',
            badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
            icon: Tag
        };
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            if (!expense.date) return false;
            let expenseDate: Date;
            if (typeof expense.date === 'string' && expense.date.length === 10 && expense.date.includes('-')) {
                const [year, month, day] = expense.date.split('-').map(Number);
                expenseDate = new Date(year, month - 1, day, 12, 0, 0, 0);
            } else {
                expenseDate = new Date(expense.date);
            }
            const matchesDate = expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
            
            const searchStr = `${expense.description} ${expense.category}`.toLowerCase();
            const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
            
            return matchesDate && matchesSearch;
        });
    }, [expenses, selectedMonth, selectedYear, searchTerm]);

    const totalMonthly = useMemo(() => {
        return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    }, [filteredExpenses]);

    const categorySummary = useMemo(() => {
        const summary: Record<string, number> = {};
        filteredExpenses.forEach(exp => {
            summary[exp.category] = (summary[exp.category] || 0) + exp.amount;
        });
        return summary;
    }, [filteredExpenses]);

    const itemsPerPage = 8;
    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
    const paginatedExpenses = filteredExpenses.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

    // Reset pagination when date or search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [selectedMonth, selectedYear, searchTerm]);

    const handlePrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentMonthLabel = `${t(monthNames[selectedMonth].toLowerCase() as any)} ${selectedYear}`;
    const currency = companySettings?.defaultCurrencyCode || 'MAD';

    return (
        <div className="space-y-6">
            <Header title={t('expenses')}>
                <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary px-3.5 py-2.5"
                >
                    <Plus className="h-4 w-4" />
                    <span>{t('addExpense')}</span>
                </button>
            </Header>

            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Total Expense Hero Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/10 border border-slate-700/50 relative overflow-hidden flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {t('totalMonthlyExpenses')}
                                </span>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                    <h2 className="text-3xl font-extrabold tracking-tight text-white">
                                        {totalMonthly.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h2>
                                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                                        {currency}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/70 shadow-inner">
                            <button 
                                onClick={handlePrevMonth} 
                                className="p-2 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-lg transition-all"
                                title="Mois précédent"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2 px-3 py-1">
                                <Calendar className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-bold text-slate-100 min-w-[130px] text-center">
                                    {currentMonthLabel}
                                </span>
                            </div>
                            <button 
                                onClick={handleNextMonth} 
                                className="p-2 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-lg transition-all"
                                title="Mois suivant"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400 relative z-10">
                        <div className="flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-emerald-400" />
                            <span>{filteredExpenses.length} {filteredExpenses.length > 1 ? 'dépenses enregistrées' : 'dépense enregistrée'} ce mois</span>
                        </div>
                        <span className="text-slate-400 font-medium">{currentMonthLabel}</span>
                    </div>
                </motion.div>

                {/* Quick Info / Quick Action Box */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card-base p-6 flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Aperçu rapide
                            </span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                {selectedYear}
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4">
                            Suivez et catégorisez toutes vos charges opérationnelles pour optimiser la rentabilité de votre entreprise.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-secondary w-full justify-center"
                    >
                        <Plus size={16} className="text-emerald-600" />
                        <span>Saisir une nouvelle dépense</span>
                    </button>
                </motion.div>
            </div>

            {/* Category Breakdown Cards */}
            <div>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Répartition par catégorie
                    </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {categories.map((cat, idx) => {
                        const Icon = cat.icon;
                        const catAmount = categorySummary[cat.id] || 0;
                        const percentage = totalMonthly > 0 ? Math.round((catAmount / totalMonthly) * 100) : 0;

                        return (
                            <motion.div 
                                key={cat.id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * idx }}
                                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`p-2 rounded-xl ${cat.bg} ${cat.text}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                        {percentage}%
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-slate-600 block truncate mb-1">
                                    {cat.label}
                                </span>
                                <p className="text-base font-extrabold text-slate-900 tracking-tight">
                                    {catAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] font-semibold text-slate-400">{currency}</span>
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Main Table Section */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                
                {/* Search & Filter Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Liste des dépenses
                            </h3>
                            <p className="text-xs text-slate-500">
                                {filteredExpenses.length} résultat{filteredExpenses.length !== 1 ? 's' : ''} trouvé{filteredExpenses.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none rtl:right-0 rtl:pr-3.5 rtl:left-auto">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="search"
                            placeholder={t('search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none ${isRTL ? 'pr-10' : 'pl-10'}`}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">
                                    {t('date')}
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">
                                    {t('category')}
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">
                                    {t('description')}
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    {t('amount')}
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    {t('actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            <AnimatePresence mode="popLayout">
                                {paginatedExpenses.length > 0 ? (
                                    paginatedExpenses.map((expense) => {
                                        const catConfig = getCategoryConfig(expense.category);
                                        const CatIcon = catConfig.icon;

                                        return (
                                            <motion.tr 
                                                key={expense.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="hover:bg-slate-50/80 transition-colors group"
                                            >
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-800">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                        <span>
                                                            {new Date(expense.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${catConfig.badgeBg}`}>
                                                        <CatIcon className="w-3.5 h-3.5" />
                                                        <span>{catConfig.label}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-700 font-medium max-w-xs truncate">
                                                    {expense.description}
                                                    {expense.reference && (
                                                        <span className="block text-xs font-normal text-slate-400 mt-0.5">
                                                            Réf: {expense.reference}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-extrabold text-slate-900 text-right">
                                                    {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400">{currency}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button 
                                                            onClick={() => setEditingExpense(expense)}
                                                            className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                                            title={t('edit')}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setExpenseToDelete(expense.id);
                                                                setIsConfirmOpen(true);
                                                            }}
                                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                            title={t('delete')}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                                                    <Receipt className="w-8 h-8" />
                                                </div>
                                                <h4 className="text-base font-bold text-slate-800 mb-1">
                                                    {t('noExpensesFound')}
                                                </h4>
                                                <p className="text-xs text-slate-500 mb-6">
                                                    {t('firstExpensePrompt')}
                                                </p>
                                                <button
                                                    onClick={() => setIsAddModalOpen(true)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>{t('addExpense')}</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            Affichage <span className="font-bold text-slate-700">{(validCurrentPage - 1) * itemsPerPage + 1}</span> à <span className="font-bold text-slate-700">{Math.min(validCurrentPage * itemsPerPage, filteredExpenses.length)}</span> sur <span className="font-bold text-slate-700">{filteredExpenses.length}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={validCurrentPage === 1}
                                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm">
                                {validCurrentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={validCurrentPage === totalPages}
                                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddExpenseModal 
                isOpen={isAddModalOpen || !!editingExpense}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingExpense(null);
                }}
                onSave={async (data) => {
                    if (editingExpense) {
                        await onUpdateExpense({ ...editingExpense, ...data });
                    } else {
                        await onAddExpense(data);
                    }
                    setIsAddModalOpen(false);
                    setEditingExpense(null);
                }}
                editingExpense={editingExpense}
            />

            <ConfirmationModal
                isOpen={isConfirmOpen}
                title={t('confirmDelete')}
                message="Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible."
                onConfirm={() => {
                    if (expenseToDelete) {
                        onDeleteExpense(expenseToDelete);
                    }
                    setIsConfirmOpen(false);
                    setExpenseToDelete(null);
                }}
                onClose={() => {
                    setIsConfirmOpen(false);
                    setExpenseToDelete(null);
                }}
            />
        </div>
    );
};

export default Expenses;
