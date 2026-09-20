
import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
    Calendar, TrendingUp, TrendingDown, DollarSign, 
    CreditCard, ShoppingBag, ArrowUpRight, ArrowDownRight, Filter, PieChart as PieIcon, Activity,
    ArrowRightLeft, UserCheck, Truck, BarChart2, User, Target, Info, FileText, ChevronLeft, ChevronRight, Package
} from 'lucide-react';
import { Invoice, Payment, PurchaseOrder, Product, PurchaseOrderStatus, InvoiceStatus, CreditNote, CreditNoteStatus, Expense, SalaryPayment, StockMovement } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface StatisticsProps {
    invoices: Invoice[];
    payments: Payment[];
    purchaseOrders: PurchaseOrder[];
    products: Product[];
    expenses: Expense[];
    stockMovements: StockMovement[];
    companySettings?: any;
    creditNotes?: CreditNote[];
    salaryPayments?: SalaryPayment[];
}

type DateRangeType = 'today' | 'week' | 'month' | 'year' | 'custom';

const Statistics: React.FC<StatisticsProps> = ({ invoices, payments, purchaseOrders, products, expenses = [], stockMovements = [], companySettings, creditNotes = [], salaryPayments = [] }) => {
    const { t, isRTL, language } = useLanguage();
    
    const [rangeType, setRangeType] = useState<DateRangeType>('month');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [useTTC, setUseTTC] = useState<boolean>(true);
    
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [productPerformancePage, setProductPerformancePage] = useState<number>(1);

    const getDatesFromRange = (type: DateRangeType, customStart?: string, customEnd?: string) => {
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        switch (type) {
            case 'today': break;
            case 'week':
                const day = start.getDay();
                const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
                start.setDate(diff);
                break;
            case 'month': start.setDate(1); break;
            case 'year': start.setMonth(0, 1); break;
            case 'custom':
                if (customStart) start.setTime(new Date(customStart).getTime());
                if (customEnd) end.setTime(new Date(customEnd).getTime());
                end.setHours(23, 59, 59, 999);
                break;
        }
        return { start, end };
    };

    const currencyLocale = language === 'ar' ? 'ar-MA' : (language === 'es' ? 'es-ES' : 'fr-FR');
    const formatMoney = (amount: number) => amount.toLocaleString(currencyLocale, { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 });

    const cleanHtml = (html: string) => {
        if (!html) return '';
        // Remove tags
        let text = html.replace(/<[^>]*>/g, '');
        // Decode common entities
        const entities: { [key: string]: string } = {
            '&nbsp;': ' ',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'"
        };
        return text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match] || match).trim();
    };

    const { currentMetrics, previousMetrics, evolutionData, productPerformance, financeBreakdown, clientsList } = useMemo(() => {
        const { start, end } = getDatesFromRange(rangeType, startDate, endDate);
        const duration = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - duration);

        const isInRange = (dateStr: string, s: Date, e: Date) => {
            if (!dateStr) return false;
            let d: Date;
            if (typeof dateStr === 'string' && dateStr.length === 10 && dateStr.includes('-')) {
                const [year, month, day] = dateStr.split('-').map(Number);
                d = new Date(year, month - 1, day, 12, 0, 0, 0);
            } else {
                d = new Date(dateStr);
            }
            return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
        };

        const clientsMap = new Map<string, string>();
        invoices.forEach(inv => clientsMap.set(inv.clientId, inv.clientName));
        const clientsList = Array.from(clientsMap.entries()).map(([id, name]) => ({ id, name }));

        const calculateFinancials = (s: Date, e: Date) => {
            // Cash-based revenue: Sum of payments actually received
            const periodPayments = payments.filter(p => isInRange(p.date, s, e));
            const receivedRevenue = periodPayments.reduce((sum, p) => sum + p.amount, 0);
            
            // Revenue: Sum of invoices issued (Excluding Draft & Pending)
            const periodInvoices = invoices.filter(inv => 
                inv.status !== InvoiceStatus.Draft && 
                inv.status !== InvoiceStatus.Pending && 
                isInRange(inv.date, s, e)
            );
            
            // Helper to get invoice amount (HT or TTC)
            const getInvAmount = (inv: Invoice) => {
                if (useTTC) return inv.amount || 0;
                
                // If subTotal is available, use it minus global discount
                if (inv.subTotal !== undefined && inv.subTotal > 0) {
                    const discount = (inv.discountType === 'percentage' ? (inv.subTotal * (inv.discountValue || 0) / 100) : (inv.discountValue || 0));
                    return inv.subTotal - discount;
                }
                
                // Fallback: estimate HT from TTC assuming 20% VAT if no subtotal stored
                return (inv.amount || 0) / 1.2;
            };

            const billedRevenue = periodInvoices.reduce((sum, inv) => {
                const invTotal = getInvAmount(inv);
                return sum + invTotal;
            }, 0);
            
            // Only count Paid invoices for profit calculation as requested
            const paidInvoices = periodInvoices.filter(inv => inv.status === InvoiceStatus.Paid);
            const paidRevenue = paidInvoices.reduce((sum, inv) => sum + getInvAmount(inv), 0);

            // Calculate Total Purchase Orders Volume for the period
            const periodPOs = purchaseOrders.filter(po => 
                (po.amountPaid >= po.totalAmount && po.totalAmount > 0) && 
                isInRange(po.date, s, e)
            );
            const totalPOs = periodPOs.reduce((sum, po) => sum + (useTTC ? (po.totalAmount || 0) : (po.subTotal || 0)), 0);

            // Cost of goods sold (COGS): Theoretical purchase cost of items in PAID invoices only
            let totalCogs = 0;
            const paidInvoicesInPeriod = periodInvoices.filter(inv => inv.status === InvoiceStatus.Paid);
            
            paidInvoicesInPeriod.forEach(inv => {
                inv.lineItems.forEach(item => {
                    const productDef = products.find(p => p.id === item.productId);
                    const purchasePrice = productDef?.purchasePrice || (item as any).purchasePrice || 0;
                    totalCogs += item.quantity * purchasePrice;
                });
            });

            // Total Inventory Value (Global, not range dependent usually, but here we can show current)
            const inventoryValue = products.reduce((sum, p) => sum + ((p.stockQuantity || 0) * (p.purchasePrice || 0)), 0);

            const periodCreditNotes = creditNotes.filter(cn => (cn.status === CreditNoteStatus.Validated || cn.status === CreditNoteStatus.Refunded) && isInRange(cn.date, s, e));
            const totalCreditNotes = periodCreditNotes.reduce((sum, cn) => sum + (useTTC ? cn.amount : (cn.amount / 1.2)), 0); // Approx HT if not stored
            
            const periodExpenses = expenses.filter(exp => isInRange(exp.date, s, e));
            const periodSalaryPayments = salaryPayments.filter(sp => sp.status === 'Paid' && isInRange(sp.paymentDate, s, e));
            
            // Operational expenses include all expenses created in the Expenses module except those linked to purchase orders
            const otherExpenses = periodExpenses.filter(exp => !exp.purchaseOrderId);
            
            const totalOperationalExpenses = otherExpenses.reduce((sum, exp) => sum + exp.amount, 0) + periodSalaryPayments.reduce((sum, sp) => sum + Number(sp.amount), 0);

            const finalReceived = receivedRevenue; // Payments are always total received
            const finalBilled = billedRevenue - totalCreditNotes;
            
            return { 
                revenue: finalReceived,        // Used for "Recettes Encaissées"
                billedRevenue: finalBilled,    // Used for "CA Facturé"
                expenses: totalCogs,           // Used for "Coût d'Achats" - Now back to COGS based on Paid Invoices
                operationalExpenses: totalOperationalExpenses,
                inventoryValue,                // Used for "Valeur Stock"
                profit: finalBilled - totalCogs - totalOperationalExpenses   // Profit = Billed Revenue - COGS - Operating Expenses
            };
        };

        const current = calculateFinancials(start, end);
        const previous = calculateFinancials(prevStart, prevEnd);

        // Client revenue breakdown based on real payments
        const clientRevenueMap = new Map<string, number>();
        payments.filter(p => isInRange(p.date, start, end)).forEach(p => {
            clientRevenueMap.set(p.clientName, (clientRevenueMap.get(p.clientName) || 0) + p.amount);
        });

        const supplierChargeMap = new Map<string, number>();
        purchaseOrders.filter(po => 
            (po.status === PurchaseOrderStatus.Paid || po.amountPaid > 0) && 
            isInRange(po.date, start, end)
        ).forEach(po => {
            const amount = useTTC ? po.totalAmount : po.subTotal;
            supplierChargeMap.set(po.supplierName, (supplierChargeMap.get(po.supplierName) || 0) + amount);
        });

        const financeBreakdown = {
            topClients: Array.from(clientRevenueMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
            topSuppliers: Array.from(supplierChargeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
        };

        const chartDataMap = new Map<string, { date: string, revenue: number, expense: number, profit: number }>();
        payments.filter(p => isInRange(p.date, start, end)).forEach(p => {
            if (!chartDataMap.has(p.date)) chartDataMap.set(p.date, { date: p.date, revenue: 0, expense: 0, profit: 0 });
            chartDataMap.get(p.date)!.revenue += p.amount;
        });

        expenses.filter(e => isInRange(e.date, start, end)).forEach(e => {
            if (!chartDataMap.has(e.date)) chartDataMap.set(e.date, { date: e.date, revenue: 0, expense: 0, profit: 0 });
            chartDataMap.get(e.date)!.expense += e.amount;
        });

        salaryPayments.filter(sp => sp.status === 'Paid' && isInRange(sp.paymentDate, start, end)).forEach(sp => {
            if (!chartDataMap.has(sp.paymentDate)) chartDataMap.set(sp.paymentDate, { date: sp.paymentDate, revenue: 0, expense: 0, profit: 0 });
            chartDataMap.get(sp.paymentDate)!.expense += Number(sp.amount);
        });

        // Global product performance
        const productStats = new Map<string, { id: string, name: string, qty: number, revenue: number, cost: number }>();
        
        invoices.filter(inv => 
            inv.status !== InvoiceStatus.Draft && 
            inv.status !== InvoiceStatus.Pending && 
            isInRange(inv.date, start, end)
        ).forEach(inv => {
            inv.lineItems.forEach(item => {
                if (item.productId) {
                    const productDef = products.find(p => p.id === item.productId);
                    const prodName = productDef ? productDef.name : item.name;

                    if (!productStats.has(item.productId)) productStats.set(item.productId, { id: item.productId, name: prodName, qty: 0, revenue: 0, cost: 0 });
                    const stat = productStats.get(item.productId)!;
                    stat.qty += item.quantity;
                    
                    const lineUnitPrice = useTTC ? (item.unitPrice * (1 + (item.vat || 0) / 100)) : item.unitPrice;
                    const lineTotal = item.quantity * lineUnitPrice;
                    stat.revenue += lineTotal;

                    const purchasePrice = productDef?.purchasePrice || (item as any).purchasePrice || 0;
                    stat.cost += (item.quantity * purchasePrice);
                }
            });
        });

        // Subtract Credit Notes from performance
        creditNotes.filter(cn => 
            (cn.status === CreditNoteStatus.Validated || cn.status === CreditNoteStatus.Refunded) && 
            isInRange(cn.date, start, end)
        ).forEach(cn => {
            cn.lineItems.forEach(item => {
                if (item.productId) {
                    if (!productStats.has(item.productId)) {
                        const productDef = products.find(p => p.id === item.productId);
                        const prodName = productDef ? productDef.name : item.name;
                        productStats.set(item.productId, { id: item.productId, name: prodName, qty: 0, revenue: 0, cost: 0 });
                    }
                    const stat = productStats.get(item.productId)!;
                    stat.qty -= item.quantity;
                    
                    const lineUnitPrice = useTTC ? (item.unitPrice * (1 + (item.vat || 0) / 100)) : item.unitPrice;
                    const lineTotal = item.quantity * lineUnitPrice;
                    stat.revenue -= lineTotal;

                    const productDef = products.find(p => p.id === item.productId);
                    const purchasePrice = productDef?.purchasePrice || (item as any).purchasePrice || 0;
                    stat.cost -= (item.quantity * purchasePrice);
                }
            });
        });

        const productPerformance = Array.from(productStats.values()).map(p => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 })).sort((a, b) => b.revenue - a.revenue);

        return { currentMetrics: current, previousMetrics: previous, evolutionData: Array.from(chartDataMap.values()).sort((a, b) => a.date.localeCompare(b.date)), productPerformance, financeBreakdown, clientsList };
    }, [invoices, payments, purchaseOrders, products, creditNotes, rangeType, startDate, endDate, useTTC]);

    // Client Profitability Calculation - Now fully Cash-Based
    const clientProfitability = useMemo(() => {
        if (!selectedClientId) return null;

        const clientInvoices = invoices.filter(inv => 
            inv.clientId === selectedClientId && 
            inv.status !== InvoiceStatus.Draft &&
            inv.status !== InvoiceStatus.Pending
        );
        const clientPayments = payments.filter(p => p.clientId === selectedClientId);
        
        // Total cash actually in hand
        const totalEncaisse = clientPayments.reduce((sum, p) => sum + p.amount, 0);
        
        let totalCoutAchat = 0;
        const productsBought = new Map<string, { name: string, qty: number, cost: number, revenue: number }>();

        clientInvoices.forEach(inv => {
            inv.lineItems.forEach(item => {
                if (item.productId) {
                    const productDef = products.find(p => p.id === item.productId);
                    const purchasePrice = productDef?.purchasePrice || (item as any).purchasePrice || 0;
                    
                    const lineUnitPrice = useTTC ? (item.unitPrice * (1 + (item.vat || 0) / 100)) : item.unitPrice;
                    const lineCost = item.quantity * purchasePrice;
                    const lineBilledRevenue = item.quantity * lineUnitPrice;
                    
                    totalCoutAchat += lineCost;

                    if (!productsBought.has(item.productId)) {
                        const prodName = productDef ? productDef.name : item.name;
                        productsBought.set(item.productId, { name: prodName, qty: 0, cost: 0, revenue: 0 });
                    }
                    const pData = productsBought.get(item.productId)!;
                    pData.qty += item.quantity;
                    pData.cost += lineCost;
                    pData.revenue += lineBilledRevenue; // This now reflects billed amount (HT or TTC)
                }
            });
        });

        const totalEncaisseReal = Array.from(productsBought.values()).reduce((sum, p) => sum + p.revenue, 0);

        return {
            clientName: clientsList.find(c => c.id === selectedClientId)?.name || '',
            totalEncaisse: totalEncaisseReal,
            totalCoutAchat,
            profitNette: totalEncaisseReal - totalCoutAchat,
            marginPercent: totalEncaisseReal > 0 ? ((totalEncaisseReal - totalCoutAchat) / totalEncaisseReal) * 100 : 0,
            products: Array.from(productsBought.values()).sort((a, b) => b.revenue - a.revenue)
        };
    }, [selectedClientId, invoices, payments, products, clientsList, useTTC]);

    const categoryProfitability = useMemo(() => {
        const { start, end } = getDatesFromRange(rangeType, startDate, endDate);
        const isInRange = (dateStr: string, s: Date, e: Date) => {
            if (!dateStr) return false;
            let d: Date;
            if (typeof dateStr === 'string' && dateStr.length === 10 && dateStr.includes('-')) {
                const [year, month, day] = dateStr.split('-').map(Number);
                d = new Date(year, month - 1, day, 12, 0, 0, 0);
            } else {
                d = new Date(dateStr);
            }
            const time = d.getTime();
            return time >= Math.min(s.getTime(), e.getTime()) && time <= Math.max(s.getTime(), e.getTime());
        };

        const revenueByCategory = new Map<string, { category: string, qty: number, cost: number, revenue: number }>();

        const filteredInvoices = invoices.filter(inv => 
            inv.status !== InvoiceStatus.Draft && 
            inv.status !== InvoiceStatus.Pending && 
            isInRange(inv.date, start, end)
        );

        filteredInvoices.forEach(inv => {
            const paymentRatio = inv.amount > 0 ? (inv.amountPaid / inv.amount) : 0;

            inv.lineItems.forEach(item => {
                const pid = item.productId;
                if (pid) {
                    const productDef = products.find(p => p.id === pid);
                    let category = productDef?.category?.trim() || 'Non catégorisé';
                    if (category === '') category = 'Non catégorisé';
                    const purchasePrice = productDef?.purchasePrice || (item as any).purchasePrice || 0;
                    
                    const lineUnitPrice = useTTC ? (item.unitPrice * (1 + (item.vat || 0) / 100)) : item.unitPrice;
                    const lineCost = item.quantity * purchasePrice;
                    const lineBilledRevenue = item.quantity * lineUnitPrice;
                    
                    if (!revenueByCategory.has(category)) {
                        revenueByCategory.set(category, { category, qty: 0, cost: 0, revenue: 0 });
                    }
                    const cData = revenueByCategory.get(category)!;
                    cData.qty += item.quantity;
                    cData.cost += lineCost;
                    cData.revenue += (lineBilledRevenue * paymentRatio); // Real cash collected
                }
            });
        });

        return Array.from(revenueByCategory.values())
            .map(c => ({
                ...c,
                profit: c.revenue - c.cost,
                marginPercent: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0
            }))
            .filter(c => c.revenue > 0 || c.cost > 0)
            .sort((a, b) => b.profit - a.profit);
    }, [invoices, products, rangeType, startDate, endDate, useTTC]);

    const filteredCategoryProfitability = useMemo(() => {
        if (!selectedCategory) return [];
        if (selectedCategory === 'all') return categoryProfitability;
        return categoryProfitability.filter(p => p.category === selectedCategory);
    }, [categoryProfitability, selectedCategory]);

    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const itemsPerPage = 7;
    const totalPages = Math.ceil(productPerformance.length / itemsPerPage);
    const currentPage = Math.min(productPerformancePage, totalPages || 1);
    const paginatedProductPerformance = productPerformance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* Header Section */}
            <div className="relative bg-slate-900 rounded-2xl md:rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                            <Activity className="text-emerald-400" /> {t('financialAnalysis')}
                        </h2>
                        <p className="text-slate-400 mt-1 md:mt-2 text-sm md:text-base">Suivi réel basé sur les encaissements (Cash-Flow)</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/10 p-1 rounded-xl md:rounded-2xl flex flex-col sm:flex-row gap-2 shadow-lg w-full lg:w-auto">
                        <div className="flex bg-slate-800/50 rounded-lg md:rounded-xl p-1">
                            <button
                                onClick={() => setUseTTC(false)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${!useTTC ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                HT
                            </button>
                            <button
                                onClick={() => setUseTTC(true)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${useTTC ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                TTC
                            </button>
                        </div>

                        <div className="flex bg-slate-800/50 rounded-lg md:rounded-xl p-1 overflow-x-auto no-scrollbar">
                            {(['today', 'week', 'month', 'year'] as DateRangeType[]).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => { setRangeType(type); setStartDate(''); setEndDate(''); }}
                                    className={`px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none ${
                                        rangeType === type && !startDate 
                                        ? 'bg-emerald-500 text-white shadow-md' 
                                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {type === 'today' ? t('today').split(' ')[0] : type === 'week' ? t('periodWeek') : type === 'month' ? t('periodMonth') : t('periodYear')}
                                </button>
                            ))}
                            <button onClick={() => setRangeType('custom')} className={`px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none ${rangeType === 'custom' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                                {t('customRange')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Custom Date Range Picker - Appears when custom is selected */}
                {rangeType === 'custom' && (
                    <div className="mt-6 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Date Début</label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-slate-800/80 border-slate-700 text-white text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-2 h-10 min-w-[140px]"
                            />
                        </div>
                        <div className="flex items-center pt-5">
                            <ChevronRight className="text-slate-600" size={16} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Date Fin</label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-slate-800/80 border-slate-700 text-white text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-2 h-10 min-w-[140px]"
                            />
                        </div>
                        <div className="flex items-end pt-5 ml-auto sm:ml-0">
                            <button 
                                onClick={() => {
                                    // Today's date as default if empty
                                    if (!startDate) setStartDate(new Date().toISOString().split('T')[0]);
                                    if (!endDate) setEndDate(new Date().toISOString().split('T')[0]);
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg text-xs transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                Appliquer
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
                <div className="card-base p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
                        {(() => {
                            const growth = calculateGrowth(currentMetrics.billedRevenue, previousMetrics.billedRevenue);
                            return <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${growth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{growth >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}{Math.abs(growth).toFixed(0)}%</span>;
                        })()}
                    </div>
                    <p className="text-slate-500 text-[11px] md:text-xs font-bold uppercase tracking-wider">Ventes Facturées</p>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">{formatMoney(Math.max(0, currentMetrics.billedRevenue))}</h3>
                </div>

                <div className="card-base p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><TrendingDown size={20} /></div>
                        {(() => {
                            const growth = calculateGrowth(currentMetrics.expenses, previousMetrics.expenses);
                            return <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${growth <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{growth > 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}{Math.abs(growth).toFixed(0)}%</span>;
                        })()}
                    </div>
                    <p className="text-slate-500 text-[11px] md:text-xs font-bold uppercase tracking-wider">Coût d'Achats</p>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">{formatMoney(currentMetrics.expenses)}</h3>
                </div>

                <div className="card-base p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><DollarSign size={20} /></div>
                        {(() => {
                            const growth = calculateGrowth(currentMetrics.operationalExpenses, previousMetrics.operationalExpenses);
                            return <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${growth <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{growth > 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}{Math.abs(growth).toFixed(0)}%</span>;
                        })()}
                    </div>
                    <p className="text-slate-500 text-[11px] md:text-xs font-bold uppercase tracking-wider">Charges / Dépenses</p>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">{formatMoney(currentMetrics.operationalExpenses)}</h3>
                </div>

                <div className="card-base p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Package size={20} /></div>
                    </div>
                    <p className="text-slate-500 text-[11px] md:text-xs font-bold uppercase tracking-wider">Valeur du Stock</p>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">{formatMoney(currentMetrics.inventoryValue)}</h3>
                    {/* Decorative bar for stock value */}
                    <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full w-[70%]" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/10 rounded-2xl p-5 shadow-sm border-2 border-emerald-500/20 hover:border-emerald-500 transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-sm shadow-emerald-500/40"><TrendingUp size={20} /></div>
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/20">Marge: {currentMetrics.billedRevenue > 0 ? ((Math.max(0, currentMetrics.profit) / currentMetrics.billedRevenue) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <p className="text-emerald-700 text-[11px] md:text-xs font-bold uppercase tracking-wider">Bénéfice Net</p>
                    <h3 className="text-xl md:text-2xl font-black text-emerald-900 mt-1">{formatMoney(Math.max(0, currentMetrics.profit))}</h3>
                </div>
            </div>

            {/* SECTION: CLIENT PROFITABILITY ANALYSIS */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Target size={20} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-none">Rentabilité par Client</h3>
                            <p className="text-xs text-slate-400 mt-1">Calcul basé sur les paiements reçus</p>
                        </div>
                    </div>
                    <div className="w-full md:w-72">
                        <select 
                            value={selectedClientId} 
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            className="block w-full rounded-xl border-slate-200 bg-slate-50/50 focus:border-emerald-500 focus:ring-emerald-500 text-sm h-11"
                        >
                            <option value="">-- Sélectionner un client --</option>
                            {clientsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                {clientProfitability ? (
                    <div className="p-6 md:p-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Encaissé</p>
                                    <p className="text-2xl font-black text-slate-900">{formatMoney(clientProfitability.totalEncaisse)}</p>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full" style={{ width: '100%' }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coût Réel</p>
                                    <p className="text-2xl font-black text-slate-900">{formatMoney(clientProfitability.totalCoutAchat)}</p>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                        <div className="bg-rose-400 h-full" style={{ width: `${Math.min(100, (clientProfitability.totalCoutAchat / Math.max(1, clientProfitability.totalEncaisse)) * 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className={`p-5 rounded-2xl border flex flex-col justify-between ${clientProfitability.profitNette >= 0 ? 'bg-emerald-50 border-emerald-100/50' : 'bg-rose-50 border-rose-100/50'}`}>
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${clientProfitability.profitNette >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Marge Nette (Cash)</p>
                                    <p className={`text-2xl font-black ${clientProfitability.profitNette >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>{formatMoney(clientProfitability.profitNette)}</p>
                                </div>
                                <div className="mt-4 text-[10px] font-bold opacity-60">
                                    Rentabilité: {clientProfitability.marginPercent.toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-50 rounded-2xl overflow-hidden">
                            {/* Mobile Card View for Client Profitability */}
                            <div className="md:hidden divide-y divide-slate-50">
                                {clientProfitability.products.map((p, idx) => (
                                    <div key={idx} className="p-4 space-y-2 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{p.name}</div>
                                            <div className="text-xs font-medium text-slate-500">Qté: {p.qty}</div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                                            <div>
                                                <p className="text-slate-400 uppercase font-bold text-[9px]">CA</p>
                                                <p className="text-slate-900 font-bold">{formatMoney(p.revenue)}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 uppercase font-bold text-[9px]">Coût</p>
                                                <p className="text-slate-900 font-bold">{formatMoney(p.cost)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-slate-400 uppercase font-bold text-[9px]">Marge</p>
                                                <p className={`font-black ${p.revenue - p.cost >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(p.revenue - p.cost)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View for Client Profitability */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-50">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produit</th>
                                            <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qté</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">CA Facturé</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Coût</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Marge</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-50">
                                        {clientProfitability.products.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                                    {cleanHtml(p.name)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-center text-slate-600 font-medium">{p.qty}</td>
                                                <td className="px-6 py-4 text-sm text-right text-slate-900 font-bold">{formatMoney(p.revenue)}</td>
                                                <td className="px-6 py-4 text-sm text-right text-slate-500">{formatMoney(p.cost)}</td>
                                                <td className={`px-6 py-4 text-sm text-right font-black ${p.revenue - p.cost >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(p.revenue - p.cost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="px-8 py-20 text-center bg-slate-50/30 rounded-b-3xl">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-2xl mb-6 transform rotate-3">
                            <User size={32} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-base font-bold text-slate-900">Sélectionnez un client</h4>
                        <p className="text-sm text-slate-400 mt-2 max-w-[280px] mx-auto">Choisissez un client dans la liste déroulante ci-dessus pour voir son profil de rentabilité.</p>
                    </div>
                )}
            </div>

            {/* SECTION: CATEGORY PROFITABILITY ANALYSIS */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><PieIcon size={20} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-none">Par Catégorie</h3>
                            <p className="text-xs text-slate-400 mt-1">Bénéfices nets encaissés par catégorie</p>
                        </div>
                    </div>
                    <div className="w-full md:w-72">
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="block w-full rounded-xl border-slate-200 bg-slate-50/50 focus:border-indigo-500 focus:ring-indigo-500 text-sm h-11"
                        >
                            <option value="">-- Toutes les catégories --</option>
                            <option value="all">Tout afficher</option>
                            {categoryProfitability.map(p => (
                                <option key={p.category} value={p.category}>{p.category}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedCategory ? (
                    <div className="p-0 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-50">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catégorie</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Ventes</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Chiffre d'Affaires</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Coût Achat</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Net</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Marge %</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {filteredCategoryProfitability.length > 0 ? (
                                        filteredCategoryProfitability.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900">{p.category}</td>
                                                <td className="px-6 py-4 text-sm text-center text-slate-600 font-medium">{p.qty}</td>
                                                <td className="px-6 py-4 text-sm text-right text-emerald-600 font-bold">{formatMoney(p.revenue)}</td>
                                                <td className="px-6 py-4 text-sm text-right text-slate-500">{formatMoney(p.cost)}</td>
                                                <td className={`px-6 py-4 text-sm text-right font-black ${p.revenue - p.cost >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{formatMoney(p.revenue - p.cost)}</td>
                                                <td className="px-6 py-4 text-sm text-right text-slate-400 font-mono">{p.marginPercent.toFixed(1)}%</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-300 text-sm italic">Aucune donnée trouvée.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="px-8 py-20 text-center bg-slate-50/30 rounded-b-3xl">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-2xl mb-6 transform -rotate-3">
                            <PieIcon size={32} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-base font-bold text-slate-900">Sélectionnez une catégorie</h4>
                        <p className="text-sm text-slate-400 mt-2 max-w-[280px] mx-auto">Analysez les marges et profits générés par segment de produits pour optimiser votre catalogue.</p>
                    </div>
                )}
            </div>

            {/* Global Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-6 md:mb-8 flex items-center justify-between">
                        Évolution des Recettes
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                            <TrendingUp size={10} /> {t('financialAnalysis')}
                        </span>
                    </h3>
                    <div className="h-64 md:h-80 w-full">
                        {evolutionData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={evolutionData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{fontSize: 9}} axisLine={false} tickLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString(currencyLocale, { day: '2-digit', month: '2-digit' })} />
                                    <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                                    <Area type="monotone" dataKey="revenue" name="Encaissé" stroke="#10b981" strokeWidth={2} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">{t('noDataPeriod')}</div>}
                    </div>
                </div>

                <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-6 md:mb-8 flex items-center justify-between">
                        Performance par Produit
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50 rounded-lg">TOP 5</span>
                    </h3>
                    <div className="h-64 md:h-80 w-full">
                         {productPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productPerformance.slice(0, 5)} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        width={100} 
                                        tick={{fontSize: 10, fontWeight: 600, fill: '#64748b'}} 
                                        axisLine={false} 
                                        tickLine={false}
                                        tickFormatter={(val) => {
                                            const clean = cleanHtml(val);
                                            return clean.length > 15 ? clean.substring(0, 15) + '...' : clean;
                                        }}
                                    />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                        formatter={(value: number, name: string, props: any) => {
                                            const cleanName = cleanHtml(props.payload.name);
                                            return [<span className="font-bold text-slate-900">{formatMoney(value)}</span>, <span className="text-xs text-slate-500">{cleanName}</span>];
                                        }} 
                                    />
                                    <Bar 
                                        dataKey="revenue" 
                                        name="Revenu Encaissé" 
                                        radius={[0, 10, 10, 0]} 
                                        barSize={24}
                                        background={{ fill: '#f8fafc', radius: 10 }}
                                    >
                                        {productPerformance.slice(0, 5).map((_, index) => (
                                            <Cell 
                                                key={index} 
                                                fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} 
                                                fillOpacity={0.8}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         ) : <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">{t('noSalesPeriod')}</div>}
                    </div>
                </div>
            </div>

            {/* Global Detailed Table */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 md:px-8 py-4 md:py-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-base md:text-lg font-bold text-slate-900">Détail Rentabilité Réelle par Produit</h3>
                </div>
                
                {/* Mobile Card View for Global Product Performance */}
                <div className="md:hidden divide-y divide-slate-100">
                    {paginatedProductPerformance.length > 0 ? (
                        paginatedProductPerformance.map((p) => (
                            <div key={p.id} className="p-4 space-y-2 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                                        {cleanHtml(p.name)}
                                    </div>
                                    <div className="text-xs font-medium text-slate-500">Qté: {p.qty}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[11px]">
                                    <div>
                                        <p className="text-slate-400 uppercase font-bold text-[9px]">Encaissé</p>
                                        <p className="text-emerald-600 font-bold">{formatMoney(p.revenue)}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 uppercase font-bold text-[9px]">Coût</p>
                                        <p className="text-slate-500 font-bold">{formatMoney(p.cost)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-400 uppercase font-bold text-[9px]">Marge</p>
                                        <p className={`font-black ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(p.profit)}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('noDataSelectedPeriod')}</div>
                    )}
                </div>

                {/* Desktop Table View for Global Product Performance */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 md:px-8 py-3 md:py-4 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider text-left">{t('pProduct')}</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Qté</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">CA Facturé</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Coût Achat</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Marge</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedProductPerformance.length > 0 ? (
                                paginatedProductPerformance.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 md:px-8 py-3 md:py-4 text-xs md:text-sm font-medium text-slate-900 truncate max-w-[120px] md:max-w-none">
                                            {cleanHtml(p.name)}
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-center text-slate-600">{p.qty}</td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-right text-emerald-600 font-bold">{formatMoney(p.revenue)}</td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-right text-slate-500">{formatMoney(p.cost)}</td>
                                        <td className={`px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-right ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(p.profit)}</td>
                                    </tr>
                                ))
                            ) : <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">{t('noDataSelectedPeriod')}</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 md:px-8 py-4 border-t border-slate-100 bg-white">
                        <p className="text-xs text-slate-500">
                            Affichage <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-bold">{Math.min(currentPage * itemsPerPage, productPerformance.length)}</span> sur <span className="font-bold">{productPerformance.length}</span> produits
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setProductPerformancePage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded bg-slate-50 text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setProductPerformancePage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded bg-slate-50 text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Statistics;
