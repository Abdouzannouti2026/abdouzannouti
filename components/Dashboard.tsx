
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Invoice, InvoiceStatus, Client, Product, CompanySettings, CreditNote, CreditNoteStatus, Expense, StockMovement } from '../types';
import { Users, Package, FileText, AlertCircle, AlertTriangle, DollarSign, Archive, CheckCircle, ArrowRight, UserPlus, ChevronRight, TrendingUp, TrendingDown, CalendarDays, Filter, Clock, UserCheck, Layers, BarChart3, Receipt, Users2, Box, ShieldAlert, Wallet, Store } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
    invoices: Invoice[];
    clients: Client[];
    products: Product[];
    companySettings?: CompanySettings | null;
    creditNotes?: CreditNote[];
    expenses?: Expense[];
    stockMovements?: StockMovement[];
}

const StatCard: React.FC<{
    item: { name: string; stat: string | number; icon: React.ElementType; color: string; iconColor: string; desc: string };
}> = ({ item }) => (
    <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100/50 shadow-sm hover:shadow-md transition-all flex items-center md:flex-col md:items-start gap-4 md:gap-0 active:scale-[0.98] md:active:scale-100 w-full">
        <div className={`flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl ${item.color.replace('bg-', 'bg-').replace('-500', '-50')} md:mb-4 flex-shrink-0`}>
            <item.icon className={`h-6 w-6 md:h-7 md:w-7 ${item.iconColor}`} />
        </div>
        <div className="flex-1 md:text-left min-w-0">
            <p className="text-xs md:text-sm font-medium text-slate-500 mb-0.5 md:mb-1 truncate">{item.name}</p>
            <p className="text-xl md:text-3xl font-bold text-slate-900 mb-0.5 md:mb-2 truncate">{item.stat}</p>
            <p className="text-[10px] md:text-xs text-slate-400 line-clamp-1">{item.desc}</p>
        </div>
    </div>
);

const ShortcutCard = ({ icon: Icon, label, desc, onClick, colorClass }: { icon: React.ElementType, label: string, desc: string, onClick: () => void, colorClass: string }) => {
    const { isRTL } = useLanguage();
    return (
        <button onClick={onClick} className="bg-white rounded-2xl md:rounded-3xl p-3.5 md:p-5 border border-slate-100/50 shadow-sm hover:shadow-md flex items-center gap-3.5 md:gap-5 text-left transition-all group w-full active:scale-[0.98]">
            <div className={`flex items-center justify-center h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl ${colorClass.replace('bg-', 'bg-').replace('-500', '-50')} flex-shrink-0`}>
                <Icon className={`h-5 w-5 md:h-6 md:w-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="font-bold text-slate-900 text-xs md:text-[15px] truncate">{label}</p>
                <p className="text-[10px] md:text-[13px] text-slate-500 line-clamp-1">{desc}</p>
            </div>
        </button>
    );
};

type ChartPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';

const Dashboard: React.FC<DashboardProps> = ({ invoices, clients, products, companySettings, creditNotes = [], expenses = [], stockMovements = [] }) => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('year');
    const [salesRankTab, setSalesRankTab] = useState<'top' | 'unsold'>('top');
    const [customStartDate, setCustomStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const todayDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-MA' : (language === 'en' ? 'en-US' : 'fr-FR'), { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const { totalRevenue, grossRevenue, creditNotesDeduction, unpaidInvoicesCount, unpaidAmount, monthlyExpenses } = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        let totalRevenue = 0;
        let unpaidInvoicesCount = 0;
        let unpaidAmount = 0;

        invoices.forEach(inv => {
            if (inv.status === InvoiceStatus.Paid) {
                totalRevenue += inv.amount;
            }
            if (inv.status === InvoiceStatus.Pending || (inv.status !== InvoiceStatus.Paid && new Date(inv.dueDate) < today)) {
                unpaidInvoicesCount++;
                unpaidAmount += (inv.amount - (inv.amountPaid || 0));
            }
        });

        const validatedCreditNotesAmount = creditNotes
            .filter(cn => cn.status === CreditNoteStatus.Validated || cn.status === CreditNoteStatus.Refunded)
            .reduce((sum, cn) => sum + cn.amount, 0);
        
        // Chiffre d'affaires net (Déduction des avoirs/retours)
        const netRevenue = Math.max(0, totalRevenue - validatedCreditNotesAmount);
        unpaidAmount = Math.max(0, unpaidAmount - validatedCreditNotesAmount);

        const monthlyExpenses = expenses
            .filter(exp => {
                if (!exp.date) return false;
                let expDate: Date;
                if (typeof exp.date === 'string' && exp.date.length === 10 && exp.date.includes('-')) {
                    const [year, month, day] = exp.date.split('-').map(Number);
                    expDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                } else {
                    expDate = new Date(exp.date);
                }
                return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear && !exp.purchaseOrderId;
            })
            .reduce((sum, exp) => sum + exp.amount, 0);

        return { totalRevenue: netRevenue, grossRevenue: totalRevenue, creditNotesDeduction: validatedCreditNotesAmount, unpaidInvoicesCount, unpaidAmount, monthlyExpenses };
    }, [invoices, creditNotes, expenses]);

    const stats = [
        { 
            name: t('totalRevenue'), 
            stat: totalRevenue.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-MA', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 }), 
            icon: DollarSign, 
            color: 'bg-emerald-500',
            iconColor: 'text-emerald-600',
            desc: creditNotesDeduction > 0 
                ? `${t('totalRevenueDesc')} (${language === 'ar' ? 'صافي بعد خصم الإرجاعات' : 'Net déduit des avoirs'}: -${creditNotesDeduction.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-MA', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 })})`
                : t('totalRevenueDesc')
        },
        { 
            name: t('expenses'), 
            stat: monthlyExpenses.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-MA', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 }), 
            icon: Wallet, 
            color: 'bg-rose-500',
            iconColor: 'text-rose-600',
            desc: t('totalMonthlyExpenses')
        },
        { 
            name: t('unpaidInvoices'), 
            stat: unpaidInvoicesCount, 
            icon: AlertCircle, 
            color: 'bg-orange-500',
            iconColor: 'text-orange-600',
            desc: `${t('remainingAmount')} : ${unpaidAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-MA', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 })}`
        },
        { 
            name: t('activeClients'), 
            stat: clients.length, 
            icon: Users, 
            color: 'bg-blue-500',
            iconColor: 'text-blue-600',
            desc: t('clientsDatabase')
        },
    ];

    const chartData = useMemo(() => {
        const today = new Date();
        let data: { name: string; fullDate?: string; Revenu: number }[] = [];

        const getPaidInvoices = (start: Date, end: Date) => {
            return invoices.filter(inv => {
                if (inv.status !== InvoiceStatus.Paid) return false;
                const d = new Date(inv.paymentDate || inv.date);
                return d >= start && d <= end;
            });
        };

        const getValidatedCreditNotes = (start: Date, end: Date) => {
            return creditNotes.filter(cn => {
                if (cn.status !== CreditNoteStatus.Validated && cn.status !== CreditNoteStatus.Refunded) return false;
                const d = new Date(cn.date);
                return d >= start && d <= end;
            });
        };

        if (chartPeriod === 'day') {
            const startOfDay = new Date(today.setHours(0,0,0,0));
            const endOfDay = new Date(today.setHours(23,59,59,999));
            const relevantInvoices = getPaidInvoices(startOfDay, endOfDay);
            const relevantCreditNotes = getValidatedCreditNotes(startOfDay, endOfDay);

            for (let i = 0; i <= 24; i += 4) {
                const label = `${i}h`;
                const amount = relevantInvoices.reduce((acc, inv) => {
                    const h = new Date(inv.paymentDate || inv.date).getHours();
                    return (h >= i && h < i + 4) ? acc + inv.amount : acc;
                }, 0);
                const cnAmount = relevantCreditNotes.reduce((acc, cn) => {
                    const h = new Date(cn.date).getHours();
                    return (h >= i && h < i + 4) ? acc + cn.amount : acc;
                }, 0);
                data.push({ name: label, Revenu: Math.max(0, amount - cnAmount) });
            }

        } else if (chartPeriod === 'week') {
            const curr = new Date();
            const first = curr.getDate() - curr.getDay() + 1; 
            const last = first + 6;
            
            const startOfWeek = new Date(curr.setDate(first));
            startOfWeek.setHours(0,0,0,0);
            const endOfWeek = new Date(curr.setDate(last));
            endOfWeek.setHours(23,59,59,999);

            const relevantInvoices = getPaidInvoices(startOfWeek, endOfWeek);
            const relevantCreditNotes = getValidatedCreditNotes(startOfWeek, endOfWeek);
            const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

            data = days.map((day, index) => {
                const amount = relevantInvoices.reduce((acc, inv) => {
                    let d = new Date(inv.paymentDate || inv.date).getDay();
                    let mappedIndex = d === 0 ? 6 : d - 1;
                    return mappedIndex === index ? acc + inv.amount : acc;
                }, 0);
                const cnAmount = relevantCreditNotes.reduce((acc, cn) => {
                    let d = new Date(cn.date).getDay();
                    let mappedIndex = d === 0 ? 6 : d - 1;
                    return mappedIndex === index ? acc + cn.amount : acc;
                }, 0);
                return { name: day, Revenu: Math.max(0, amount - cnAmount) };
            });

        } else if (chartPeriod === 'month') {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const relevantInvoices = getPaidInvoices(startOfMonth, endOfMonth);
            const relevantCreditNotes = getValidatedCreditNotes(startOfMonth, endOfMonth);
            const daysInMonth = endOfMonth.getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                const amount = relevantInvoices.reduce((acc, inv) => {
                    const d = new Date(inv.paymentDate || inv.date).getDate();
                    return d === i ? acc + inv.amount : acc;
                }, 0);
                const cnAmount = relevantCreditNotes.reduce((acc, cn) => {
                    const d = new Date(cn.date).getDate();
                    return d === i ? acc + cn.amount : acc;
                }, 0);
                data.push({ name: `${i}`, Revenu: Math.max(0, amount - cnAmount) });
            }

        } else if (chartPeriod === 'year') {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            const endOfYear = new Date(today.getFullYear(), 11, 31);
            const relevantInvoices = getPaidInvoices(startOfYear, endOfYear);
            const relevantCreditNotes = getValidatedCreditNotes(startOfYear, endOfYear);
            
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            data = months.map((month, index) => {
                const amount = relevantInvoices.reduce((acc, inv) => {
                    const m = new Date(inv.paymentDate || inv.date).getMonth();
                    return m === index ? acc + inv.amount : acc;
                }, 0);
                const cnAmount = relevantCreditNotes.reduce((acc, cn) => {
                    const m = new Date(cn.date).getMonth();
                    return m === index ? acc + cn.amount : acc;
                }, 0);
                return { name: month, Revenu: Math.max(0, amount - cnAmount) };
            });
        } else if (chartPeriod === 'custom') {
            const start = new Date(customStartDate);
            start.setHours(0,0,0,0);
            const end = new Date(customEndDate);
            end.setHours(23,59,59,999);
            
            const relevantInvoices = getPaidInvoices(start, end);
            const relevantCreditNotes = getValidatedCreditNotes(start, end);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: '2-digit' });
                const isoDate = d.toISOString().split('T')[0];
                
                const amount = relevantInvoices.reduce((acc, inv) => {
                    const invDate = new Date(inv.paymentDate || inv.date).toISOString().split('T')[0];
                    return invDate === isoDate ? acc + inv.amount : acc;
                }, 0);
                const cnAmount = relevantCreditNotes.reduce((acc, cn) => {
                    const cnDate = new Date(cn.date).toISOString().split('T')[0];
                    return cnDate === isoDate ? acc + cn.amount : acc;
                }, 0);
                
                data.push({ name: dateStr, fullDate: isoDate, Revenu: Math.max(0, amount - cnAmount) });
            }
        }

        return data;
    }, [invoices, creditNotes, chartPeriod, customStartDate, customEndDate, language]);

    const lowStockProducts = useMemo(() => {
        return products
            .filter(p => p.productType === 'Produit' && (p.stockQuantity || 0) <= (p.minStockAlert || 5))
            .sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0))
            .slice(0, 3);
    }, [products]);

    const { topProducts, unsoldProducts } = useMemo(() => {
        const salesMap: Record<string, number> = {};
        invoices.forEach(inv => {
            if (inv.status !== InvoiceStatus.Draft) {
                inv.lineItems?.forEach(item => {
                    if (item.productId) {
                        salesMap[item.productId] = (salesMap[item.productId] || 0) + (item.quantity || 1);
                    } else if (item.description) {
                        const matched = products.find(p => p.name.trim().toLowerCase() === item.description?.trim().toLowerCase());
                        if (matched) {
                            salesMap[matched.id] = (salesMap[matched.id] || 0) + (item.quantity || 1);
                        }
                    }
                });
            }
        });
        
        const top = Object.entries(salesMap)
            .map(([id, qty]) => {
                const product = products.find(p => p.id === id);
                return product ? { id: product.id, name: product.name, qty, stock: product.stockQuantity ?? 0 } : null;
            })
            .filter(Boolean)
            .sort((a, b) => (b?.qty || 0) - (a?.qty || 0))
            .slice(0, 5) as { id: string; name: string; qty: number; stock: number }[];

        // Produits qui n'ont jamais été vendus (0 vente dans les factures)
        const unsold = products
            .filter(p => (salesMap[p.id] || 0) === 0)
            .sort((a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0))
            .slice(0, 5)
            .map(p => ({
                id: p.id,
                name: p.name,
                qty: 0,
                stock: p.stockQuantity ?? 0,
                price: p.salePrice ?? 0
            }));

        return { topProducts: top, unsoldProducts: unsold };
    }, [invoices, products]);

    const recentInvoices = useMemo(() => {
        return [...invoices]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 4);
    }, [invoices]);

    const recentClients = useMemo(() => {
        return [...clients]
            .sort((a, b) => (b.clientCode || '').localeCompare(a.clientCode || ''))
            .slice(0, 4);
    }, [clients]);

    const welcomeName = companySettings?.companyName || 'Entrepreneur';

    return (
        <div className="space-y-6 md:space-y-8 animate-fadeIn pb-8 w-full max-w-full overflow-x-hidden">
            {/* Header Section - Emerald Theme */}
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-2xl md:rounded-[2rem] p-5 md:p-10 text-white relative overflow-hidden w-full shadow-lg">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="text-left w-full md:w-auto">
                        <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{t('welcome')}, {welcomeName} !</h1>
                        <p className="text-emerald-100/90 mt-1 md:mt-2 text-sm md:text-lg">{t('welcomeSubtitle')}</p>
                    </div>
                    
                    {/* Widget Date */}
                    <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10 flex items-center gap-3 md:gap-4 w-full md:w-auto md:min-w-[240px] justify-start">
                        <div className="bg-white/20 p-2 md:p-3 rounded-lg md:rounded-xl text-white">
                            <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] md:text-[10px] text-emerald-100 font-bold uppercase tracking-wider mb-0.5">{t('today')}</p>
                            <p className="text-sm md:text-base font-bold capitalize leading-none text-white">{todayDate}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full">
                {stats.map(item => <StatCard key={item.name} item={item} />)}
            </div>
            
            {/* Main Content Grid */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8 w-full">
                
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-3xl border border-slate-100/50 shadow-sm p-4 md:p-8 flex flex-col w-full overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
                        <h3 className="text-lg md:text-xl font-bold text-slate-900">{t('revenueEvolution')}</h3>
                        
                        {/* Période Selector */}
                        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 w-full sm:w-auto overflow-x-auto no-scrollbar">
                            {(['day', 'week', 'month', 'year'] as ChartPeriod[]).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setChartPeriod(p)}
                                    className={`px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-medium rounded-lg transition-all flex-1 sm:flex-none text-center whitespace-nowrap ${
                                        chartPeriod === p 
                                        ? 'bg-white text-slate-900 border border-slate-100 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {p === 'day' ? t('periodDay') : p === 'week' ? t('periodWeek') : p === 'month' ? t('periodMonth') : t('periodYear')}
                                </button>
                            ))}
                            <button
                                onClick={() => setChartPeriod('custom')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                                    chartPeriod === 'custom' 
                                    ? 'bg-white text-slate-900 border border-slate-100 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Filter size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Date Pickers */}
                    {chartPeriod === 'custom' && (
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 mb-4 animate-fadeIn">
                            <input 
                                type="date" 
                                value={customStartDate} 
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full sm:w-auto text-xs border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <span className="hidden sm:inline text-slate-400">-</span>
                            <input 
                                type="date" 
                                value={customEndDate} 
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full sm:w-auto text-xs border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    )}

                    <div className="flex-grow min-h-[300px] w-full">
                        {chartData.every(d => d.Revenu === 0) ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <div className="p-4 bg-slate-50 rounded-full mb-3">
                                    <Archive className="h-8 w-8" />
                                </div>
                                <p>{t('noFinancialData')}</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} interval="preserveStartEnd" />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                                        formatter={(value: number) => [`${value.toLocaleString('fr-FR')} ${companySettings?.defaultCurrencyCode || 'MAD'}`, 'Revenu']} 
                                    />
                                    <Area type="monotone" dataKey="Revenu" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Right Column: Actions, Stock Alerts, Top Products */}
                <div className="space-y-6 w-full">
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 px-1">{t('quickActions')}</h3>
                    <div className="grid grid-cols-1 gap-4 w-full">
                        <ShortcutCard 
                            icon={Store} 
                            label={t('pos') || 'Point de Vente'} 
                            desc={t('cashRegister') || 'Caisse enregistreuse & vente rapide'} 
                            colorClass="bg-emerald-500" 
                            onClick={() => navigate('/pos')} 
                        />
                        <ShortcutCard 
                            icon={FileText} 
                            label={t('newQuote')} 
                            desc={t('createProposal')} 
                            colorClass="bg-blue-500" 
                            onClick={() => navigate('/sales/quotes/new')} 
                        />
                        <ShortcutCard 
                            icon={UserPlus} 
                            label={t('addClient')} 
                            desc={t('saveContact')} 
                            colorClass="bg-purple-500" 
                            onClick={() => navigate('/clients')} 
                        />
                        <ShortcutCard 
                            icon={Package} 
                            label={t('newProduct')} 
                            desc={t('updateStock')} 
                            colorClass="bg-amber-500" 
                            onClick={() => navigate('/products/new')} 
                        />
                    </div>

                    {/* Alertes Stock */}
                    <div className="bg-red-50/80 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-red-100 mt-6 w-full shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm md:text-base font-bold text-red-800 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5"/> {t('stockAlerts')}
                            </h4>
                            <button onClick={() => navigate('/stock')} className="text-xs md:text-sm font-bold text-red-600 hover:text-red-700 transition-colors">{t('manage')}</button>
                        </div>
                        <div className="space-y-3 w-full">
                            {lowStockProducts.length > 0 ? (
                                lowStockProducts.map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-white p-3 md:p-3.5 rounded-xl md:rounded-2xl border border-red-100/50 w-full shadow-sm">
                                        <span className="text-xs md:text-sm font-medium text-slate-700 truncate flex-1 mr-2">{p.name}</span>
                                        <span className="text-[10px] md:text-xs font-bold text-red-600 bg-red-100/80 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg whitespace-nowrap">
                                            Reste: {p.stockQuantity}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs md:text-sm text-emerald-700 flex items-center gap-2 bg-emerald-50 p-3 rounded-xl md:rounded-2xl border border-emerald-100/50 w-full">
                                    <CheckCircle size={16}/> {t('stockOk')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Meilleurs Produits / Produits Non Vendus */}
                    <div className={`rounded-2xl md:rounded-3xl p-5 md:p-6 border transition-all w-full shadow-sm ${
                        salesRankTab === 'top' 
                            ? 'bg-amber-50/80 border-amber-100' 
                            : 'bg-rose-50/80 border-rose-100'
                    }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <h4 className={`text-sm md:text-base font-bold flex items-center gap-2 ${
                                salesRankTab === 'top' ? 'text-amber-900' : 'text-rose-900'
                            }`}>
                                {salesRankTab === 'top' ? (
                                    <>
                                        <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-amber-600"/> 
                                        {t('topSales')}
                                    </>
                                ) : (
                                    <>
                                        <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-rose-600"/> 
                                        {t('unsoldProducts')}
                                    </>
                                )}
                            </h4>

                            {/* Switcher Tabs */}
                            <div className="flex bg-white/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setSalesRankTab('top')}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                        salesRankTab === 'top'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <TrendingUp size={13} />
                                    <span>{t('topSales')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSalesRankTab('unsold')}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                        salesRankTab === 'unsold'
                                            ? 'bg-rose-500 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <TrendingDown size={13} />
                                    <span>{t('unsoldProducts')}</span>
                                    {unsoldProducts.length > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                            salesRankTab === 'unsold' ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {unsoldProducts.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {salesRankTab === 'top' ? (
                            <div className="space-y-3 w-full">
                                {topProducts.length > 0 ? (
                                    topProducts.map((p, idx) => (
                                        <div key={p.id || idx} className="flex justify-between items-center bg-white p-3 md:p-3.5 rounded-xl md:rounded-2xl border border-amber-100/60 w-full shadow-sm">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <span className="text-xs md:text-sm font-bold text-amber-600 w-4">{idx + 1}.</span>
                                                <span className="text-xs md:text-sm font-medium text-slate-700 truncate">{p?.name}</span>
                                            </div>
                                            <span className="text-[10px] md:text-xs font-semibold text-slate-600 bg-amber-100/70 px-2.5 py-1 rounded-lg whitespace-nowrap ml-2">
                                                {p?.qty} {t('sold')}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic bg-white p-3.5 rounded-xl border border-slate-100 text-center">
                                        {language === 'ar' ? 'لا توجد بيانات مبيعات بعد.' : 'Pas encore de données de vente.'}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3 w-full">
                                {unsoldProducts.length > 0 ? (
                                    unsoldProducts.map((p, idx) => (
                                        <div key={p.id || idx} className="flex justify-between items-center bg-white p-3 md:p-3.5 rounded-xl md:rounded-2xl border border-rose-100/60 w-full shadow-sm">
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs md:text-sm font-medium text-slate-800 truncate">{p.name}</p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {p.price.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-MA', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                <span className="text-[10px] md:text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                                    {t('zeroSales')}
                                                </span>
                                                <span className="text-[10px] md:text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                                    Stock: {p.stock}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs md:text-sm text-emerald-700 flex items-center gap-2 bg-emerald-50 p-3.5 rounded-xl md:rounded-2xl border border-emerald-100/60 w-full">
                                        <CheckCircle size={16} className="shrink-0"/>
                                        <span>{t('allProductsSold')}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity Lists */}
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8 w-full">
                 <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100/50 shadow-sm overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-base md:text-lg font-bold text-slate-900">{t('recentInvoices')}</h3>
                        <button onClick={() => navigate('/sales/invoices')} className="text-xs md:text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                            {t('seeAll')}
                        </button>
                    </div>
                    {recentInvoices.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                           {recentInvoices.map(invoice => (
                             <div key={invoice.id} className="p-4 md:p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                                        <FileText size={18} className="md:w-5 md:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 text-xs md:text-sm truncate">{invoice.clientName}</p>
                                        <p className="text-[10px] md:text-xs text-slate-500 font-mono truncate">{invoice.documentId || invoice.id}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <p className="font-bold text-slate-900 text-xs md:text-sm">{invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</p>
                                    <span className={`text-[9px] md:text-[10px] px-2 py-0.5 md:py-1 rounded-lg font-medium inline-block mt-1 ${
                                        invoice.status === InvoiceStatus.Paid ? 'bg-emerald-50 text-emerald-700' : 
                                        invoice.status === InvoiceStatus.Pending ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'
                                    }`}>
                                        {invoice.status}
                                    </span>
                                </div>
                             </div>
                           ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                            <FileText className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-sm">{t('noRecentInvoices')}</p>
                        </div>
                    )}
                 </div>

                 <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100/50 shadow-sm overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-base md:text-lg font-bold text-slate-900">{t('newClients')}</h3>
                        <button onClick={() => navigate('/clients')} className="text-xs md:text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                            {t('seeAll')}
                        </button>
                    </div>
                     {recentClients.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                           {recentClients.map(client => (
                             <div key={client.id} className="p-4 md:p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                        <Users size={18} className="md:w-5 md:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 text-xs md:text-sm truncate">{client.name}</p>
                                        {client.company && <p className="text-[10px] md:text-xs text-slate-500 truncate">{client.company}</p>}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <p className="text-[10px] md:text-xs text-slate-500 truncate max-w-[100px]">{client.email || 'Pas d\'email'}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                            <Users className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-sm">{t('noClients')}</p>
                        </div>
                    )}
                 </div>
            </div>

        </div>
    );
};

export default Dashboard;
