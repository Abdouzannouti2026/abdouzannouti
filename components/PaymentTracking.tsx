
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Header from './Header';
import { Invoice, Payment, InvoiceStatus, Client, CompanySettings } from '../types';
import { Search, CreditCard, AlertCircle, CheckCircle, PieChart, DollarSign, Users, X, MoreVertical, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PaymentTrackingProps {
    companySettings?: CompanySettings | null;
    invoices: Invoice[];
    payments: Payment[];
    onAddPayment: (payment: Omit<Payment, 'id'>) => void;
    clients: Client[];
}

const PaymentTracking: React.FC<PaymentTrackingProps> = ({ invoices, payments, onAddPayment, clients, companySettings }) => {
    const { t, isRTL, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'outstanding' | 'partial' | 'paid'>('outstanding');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset page when tab, search or client filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm, selectedClientId]);

    // Payment Modal State
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire'>('Virement');
    const [checkNumber, setCheckNumber] = useState('');
    const [bankName, setBankName] = useState('');

    // Action Menu State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{top: number, left: number, transformOrigin: string} | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if(activeMenuId) {
            document.addEventListener('click', handleClickOutside);
            window.addEventListener('scroll', handleClickOutside, true);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleClickOutside, true);
        };
    }, [activeMenuId]);

    const toggleMenu = (e: React.MouseEvent, invoice: Invoice) => {
        e.stopPropagation();
        if (activeMenuId === invoice.id) {
            setActiveMenuId(null);
            setMenuPosition(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const menuHeight = 160; 
            const menuWidth = 192; 
            
            let top: number;
            let transformOrigin: string;
            
            if (rect.bottom + menuHeight > viewportHeight) {
                top = rect.top + window.scrollY - menuHeight - 5;
                transformOrigin = isRTL ? 'bottom left' : 'bottom right';
            } else {
                top = rect.bottom + window.scrollY + 5;
                transformOrigin = isRTL ? 'top left' : 'top right';
            }

            let left: number;
            if (isRTL) {
                left = rect.left + window.scrollX;
            } else {
                left = rect.right + window.scrollX - menuWidth;
            }

            setActiveMenuId(invoice.id);
            setMenuPosition({ top, left: Math.max(10, left), transformOrigin });
        }
    };

    const stats = useMemo(() => {
        let totalPaid = 0;
        let totalRemaining = 0;
        let partialRemaining = 0;

        const targetInvoices = selectedClientId 
            ? invoices.filter(inv => inv.clientId === selectedClientId && inv.status !== InvoiceStatus.Draft)
            : invoices.filter(inv => inv.status !== InvoiceStatus.Draft);

        targetInvoices.forEach(inv => {
            const paid = inv.amountPaid || 0;
            const remaining = Math.max(0, inv.amount - paid);

            totalPaid += paid;
            totalRemaining += remaining;

            if (inv.status === InvoiceStatus.Partial) {
                partialRemaining += remaining;
            }
        });

        return { totalPaid, totalRemaining, partialRemaining };
    }, [invoices, selectedClientId]);

    const filteredInvoices = useMemo(() => {
        let filtered = invoices.filter(inv => inv.status !== InvoiceStatus.Draft);

        // Filter by Client
        if (selectedClientId) {
            filtered = filtered.filter(inv => inv.clientId === selectedClientId);
        }

        // Filter by Tab
        if (activeTab === 'outstanding') {
            filtered = filtered.filter(inv => 
                inv.status === InvoiceStatus.Pending || 
                inv.status === InvoiceStatus.Overdue || 
                inv.status === InvoiceStatus.Partial
            );
        } else if (activeTab === 'partial') {
            filtered = filtered.filter(inv => inv.status === InvoiceStatus.Partial);
        } else if (activeTab === 'paid') {
            filtered = filtered.filter(inv => inv.status === InvoiceStatus.Paid);
        }

        // Filter by Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(inv => 
                (inv.clientName || '').toLowerCase().includes(term) ||
                (inv.documentId || inv.id).toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [invoices, activeTab, searchTerm, selectedClientId]);

    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push('...');
            }
            
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    const handleOpenPayment = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        const remaining = invoice.amount - (invoice.amountPaid || 0);
        setPaymentAmount(remaining);
        setActiveMenuId(null);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        onAddPayment({
            invoiceId: selectedInvoice.id,
            invoiceNumber: selectedInvoice.documentId || selectedInvoice.id,
            clientId: selectedInvoice.clientId,
            clientName: selectedInvoice.clientName,
            date: new Date().toISOString().split('T')[0],
            amount: paymentAmount,
            method: paymentMethod,
            reference: paymentMethod === 'Chèque' ? checkNumber : undefined,
            bankName: paymentMethod === 'Chèque' ? bankName : undefined
        });

        setSelectedInvoice(null);
        setCheckNumber('');
        setBankName('');
    };

    const currencyCode = companySettings?.defaultCurrencyCode || 'MAD';
    const locale = language === 'es' ? 'es-ES' : (language === 'ar' ? 'ar-MA' : 'fr-FR');

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'} className="pb-20">
            <Header title={t('paymentTracking')} />

            {/* Selection Client et Barre de recherche */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 sm:gap-6 items-end">
                <div className="w-full md:w-1/3 space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                        <Users size={12} className="text-emerald-600 sm:w-[14px] sm:h-[14px]"/> {t('client')}
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedClientId} 
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-10 sm:h-12 transition-all appearance-none pr-10 rtl:pl-10 rtl:pr-3"
                        >
                            <option value="">{language === 'es' ? 'Todos los clientes' : 'Tous les clients'}</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.company || c.name}</option>
                            ))}
                        </select>
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center px-3 ${isRTL ? 'left-0' : 'right-0'}`}>
                            <ChevronDown size={14} className="text-slate-400 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-2/3 space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                        <Search size={12} className="text-emerald-600 sm:w-[14px] sm:h-[14px]"/> {t('search')}
                    </label>
                    <div className="relative">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-300" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('searchPaymentPlaceholder')}
                            className={`block w-full rounded-xl border-slate-200 bg-slate-50 py-2 sm:py-3 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm ${isRTL ? 'pr-9 sm:pr-10' : 'pl-9 sm:pl-10'}`}
                        />
                    </div>
                </div>
            </div>

            {/* KPI Cards Dynamiques par Client */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6">
                <div className="bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center sm:justify-between group hover:shadow-md transition-all text-center sm:text-left">
                    <div className={isRTL ? 'sm:text-right' : 'sm:text-left'}>
                        <p className="text-[9px] sm:text-sm font-bold text-slate-400 uppercase tracking-tight sm:tracking-wider">{t('totalCollected')}</p>
                        <p className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5">{stats.totalPaid.toLocaleString(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className={`p-2 sm:p-3 bg-emerald-50 rounded-xl text-emerald-600 hidden sm:flex ${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <CheckCircle size={20} className="sm:w-7 sm:h-7" />
                    </div>
                </div>

                <div className="bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center sm:justify-between group hover:shadow-md transition-all text-center sm:text-left">
                    <div className={isRTL ? 'sm:text-right' : 'sm:text-left'}>
                        <p className="text-[9px] sm:text-sm font-bold text-slate-400 uppercase tracking-tight sm:tracking-wider">{t('outstandingToRecover')}</p>
                        <p className="text-base sm:text-2xl font-black text-red-600 mt-0.5">
                            {stats.totalRemaining.toLocaleString(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div className={`p-2 sm:p-3 bg-red-50 rounded-xl text-red-600 hidden sm:flex ${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <AlertCircle size={20} className="sm:w-7 sm:h-7" />
                    </div>
                </div>

                <div className="bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-slate-100 col-span-2 lg:col-span-1 flex flex-col sm:flex-row items-center sm:justify-between group hover:shadow-md transition-all text-center sm:text-left">
                    <div className={isRTL ? 'sm:text-right' : 'sm:text-left'}>
                        <p className="text-[9px] sm:text-sm font-bold text-slate-400 uppercase tracking-tight sm:tracking-wider">{t('remainingOnPartial')}</p>
                        <p className="text-base sm:text-2xl font-black text-blue-600 mt-0.5">{stats.partialRemaining.toLocaleString(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className={`p-2 sm:p-3 bg-blue-50 rounded-xl text-blue-600 hidden sm:flex ${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <PieChart size={20} className="sm:w-7 sm:h-7" />
                    </div>
                </div>
            </div>

            {/* Onglets de filtrage par statut */}
            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                <div className={`flex rounded-xl bg-slate-200/50 p-1.5 min-w-max ${isRTL ? 'space-x-reverse' : 'space-x-1'}`}>
                    <button
                        onClick={() => setActiveTab('outstanding')}
                        className={`flex items-center gap-2 rounded-lg px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold leading-5 focus:outline-none transition-all ${
                            activeTab === 'outstanding'
                                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100'
                                : 'text-slate-500 hover:text-emerald-600'
                        }`}
                    >
                        <AlertCircle size={14} className="sm:w-4 sm:h-4" />
                        {t('outstandingBalances')}
                    </button>
                    <button
                        onClick={() => setActiveTab('partial')}
                        className={`flex items-center gap-2 rounded-lg px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold leading-5 focus:outline-none transition-all ${
                            activeTab === 'partial'
                                ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                                : 'text-slate-500 hover:text-blue-600'
                        }`}
                    >
                        <PieChart size={14} className="sm:w-4 sm:h-4" />
                        {t('partialPayments')}
                    </button>
                    <button
                        onClick={() => setActiveTab('paid')}
                        className={`flex items-center gap-2 rounded-lg px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold leading-5 focus:outline-none transition-all ${
                            activeTab === 'paid'
                                ? 'bg-white text-green-700 shadow-sm border border-green-100'
                                : 'text-slate-500 hover:text-green-600'
                        }`}
                    >
                        <CheckCircle size={14} className="sm:w-4 sm:h-4" />
                        {t('paidInvoices')}
                    </button>
                </div>
            </div>

            {/* Tableau des factures filtrées */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>{t('invoices')}</th>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-left' : 'text-right'}`}>{t('total')}</th>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-left' : 'text-right'}`}>{t('alreadyPaid')}</th>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-left' : 'text-right'}`}>{t('remaining')}</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-400">{t('status')}</th>
                                <th scope="col" className="relative px-6 py-4 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {paginatedInvoices.length > 0 ? (
                                paginatedInvoices.map(invoice => {
                                    const paid = invoice.amountPaid || 0;
                                    const remaining = invoice.amount - paid;
                                    
                                    return (
                                        <tr key={invoice.id} className="hover:bg-emerald-50/30 transition-colors group">
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {invoice.documentId || invoice.id}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {invoice.clientName}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-slate-600 ${isRTL ? 'text-left' : 'text-right'}`}>
                                                {invoice.amount.toLocaleString(locale, { style: 'currency', currency: currencyCode })}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-bold ${isRTL ? 'text-left' : 'text-right'}`}>
                                                {paid > 0 ? paid.toLocaleString(locale, { style: 'currency', currency: currencyCode }) : '-'}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-black ${isRTL ? 'text-left' : 'text-right'}`}>
                                                <span className={remaining > 0.01 ? 'text-red-600 bg-red-50 px-2 py-1 rounded-lg' : 'text-slate-400'}>
                                                    {remaining > 0.01 ? remaining.toLocaleString(locale, { style: 'currency', currency: currencyCode }) : '0.00'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                                    invoice.status === InvoiceStatus.Paid ? 'bg-green-100 text-green-700' :
                                                    invoice.status === InvoiceStatus.Partial ? 'bg-blue-100 text-blue-700' :
                                                    invoice.status === InvoiceStatus.Overdue ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                                                <button 
                                                    onClick={(e) => toggleMenu(e, invoice)}
                                                    className={`p-2 rounded-full transition-colors ${activeMenuId === invoice.id ? 'bg-slate-200 text-slate-900' : 'text-slate-300 hover:bg-slate-100 group-hover:text-slate-500'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <Search className="h-16 w-16 text-slate-100 mb-4" strokeWidth={1} />
                                            <p className="text-xl font-bold text-slate-800">{t('noFinancialData')}</p>
                                            <p className="text-sm text-slate-400 mt-1">Aucun document ne correspond à vos critères de filtrage.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 bg-slate-50/10 p-2">
                    {paginatedInvoices.length > 0 ? (
                        paginatedInvoices.map(invoice => {
                            const paid = invoice.amountPaid || 0;
                            const remaining = invoice.amount - paid;
                            
                            return (
                                <div key={invoice.id} className="p-4 bg-white mb-2 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-[0.99] group">
                                    <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="min-w-0 flex-1">
                                            <div className={`flex items-center gap-2 mb-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <p className="text-[10px] font-black text-emerald-600 tracking-tight">{invoice.documentId || invoice.id}</p>
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                    invoice.status === InvoiceStatus.Paid ? 'bg-green-100 text-green-700' :
                                                    invoice.status === InvoiceStatus.Partial ? 'bg-blue-100 text-blue-700' :
                                                    invoice.status === InvoiceStatus.Overdue ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                            <p className={`text-sm font-bold text-slate-900 truncate pr-2 ${isRTL ? 'text-right' : 'text-left'}`}>{invoice.clientName}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => toggleMenu(e, invoice)}
                                            className={`p-2 rounded-xl transition-all border border-slate-50 active:bg-slate-100 ${activeMenuId === invoice.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-300'}`}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                                        <div className={isRTL ? 'text-right' : 'text-left'}>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('total')}</p>
                                            <p className="text-[13px] font-black text-slate-800">
                                                {invoice.amount.toLocaleString(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className={isRTL ? 'text-left' : 'text-right'}>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('paid')}</p>
                                            <p className="text-[13px] font-black text-emerald-600">
                                                {paid.toLocaleString(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className={`col-span-2 pt-2 mt-1 border-t border-slate-200/50 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-none">{t('remaining')}</p>
                                            <p className={`text-sm font-black leading-none ${remaining > 0.01 ? 'text-red-600' : 'text-slate-300'}`}>
                                                {remaining.toLocaleString(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>

                                    {remaining > 0.01 && (
                                        <button 
                                            onClick={() => handleOpenPayment(invoice)}
                                            className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-100 active:scale-95 transition-all"
                                        >
                                            <CreditCard size={14} />
                                            <span>{t('collectPayment')}</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 px-4">
                            <Search className="h-10 w-10 text-slate-200 mx-auto mb-2" strokeWidth={1.5} />
                            <p className="text-sm font-bold text-slate-800">{t('noFinancialData')}</p>
                        </div>
                    )}
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-5 bg-white border-t border-slate-100">
                        <div className="flex-1 flex justify-between sm:hidden gap-3">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="flex-1 inline-flex items-center justify-center px-4 py-3 text-[10px] font-black rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all uppercase tracking-widest shadow-sm"
                            >
                                {isRTL ? 'التالي' : 'PRÉCÉDENT'}
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="flex-1 inline-flex items-center justify-center px-4 py-3 text-[10px] font-black rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all uppercase tracking-widest shadow-sm"
                            >
                                {isRTL ? 'السابق' : 'SUIVANT'}
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Affichage de <span className="font-bold text-emerald-600">{startIndex + 1}</span> à <span className="font-bold text-emerald-600">{Math.min(startIndex + itemsPerPage, filteredInvoices.length)}</span> sur <span className="font-bold text-emerald-600">{filteredInvoices.length}</span> documents
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px gap-1" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                                    >
                                        <ChevronDown size={18} className={isRTL ? '-rotate-90' : 'rotate-90'} />
                                    </button>
                                    {getPageNumbers().map((page, i) => (
                                        <React.Fragment key={i}>
                                            {page === '...' ? (
                                                <span className="relative inline-flex items-center px-4 py-2 text-xs font-bold text-slate-300">
                                                    ...
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => setCurrentPage(page as number)}
                                                    className={`relative inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                                        currentPage === page 
                                                            ? 'z-10 bg-emerald-600 text-white shadow-lg shadow-emerald-200 active:scale-95' 
                                                            : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-emerald-600 border border-transparent'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                                    >
                                        <ChevronDown size={18} className={isRTL ? 'rotate-90' : '-rotate-90'} />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Menu Dropdown via Portal avec positionnement intelligent */}
            {activeMenuId && filteredInvoices.find(inv => inv.id === activeMenuId) && menuPosition && createPortal(
                <div 
                    className="absolute z-[9999] w-48 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-10 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ 
                        top: menuPosition.top, 
                        left: menuPosition.left,
                        transformOrigin: menuPosition.transformOrigin
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1.5">
                        {(() => {
                            const inv = filteredInvoices.find(i => i.id === activeMenuId);
                            const remaining = inv ? inv.amount - (inv.amountPaid || 0) : 0;
                            
                            return (
                                <>
                                    {remaining > 0.1 ? (
                                        <button 
                                            onClick={() => handleOpenPayment(inv!)}
                                            className="flex w-full items-center px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                                        >
                                            <CreditCard size={16} className={`${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('collectPayment')}
                                        </button>
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-slate-400 flex items-center font-medium italic">
                                            <CheckCircle size={16} className={`${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('pdfSettled')}
                                        </div>
                                    )}
                                    
                                    <div className="border-t border-slate-100 my-1"></div>
                                    
                                    <button 
                                        onClick={() => { setActiveMenuId(null); }}
                                        className="flex w-full items-center px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <DollarSign size={16} className={`${isRTL ? 'ml-3' : 'mr-3'}`} /> {language === 'es' ? 'Ver detalles' : 'Détails financiers'}
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de règlement */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                                <CreditCard className="text-emerald-600 sm:w-6 sm:h-6" size={20} /> {t('recordPayment')}
                            </h3>
                            <button onClick={() => setSelectedInvoice(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"><X size={20} /></button>
                        </div>

                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl mb-6 sm:mb-8 text-xs sm:text-sm border border-slate-100 shadow-inner">
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-400 font-black uppercase text-[9px] sm:text-[10px] tracking-widest">{t('invoices')}</span>
                                <span className="font-bold text-slate-900">#{selectedInvoice.documentId || selectedInvoice.id}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-400 font-black uppercase text-[9px] sm:text-[10px] tracking-widest">{t('client')}</span>
                                <span className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]">{selectedInvoice.clientName}</span>
                            </div>
                            <div className="h-px bg-slate-200/60 my-3 sm:my-4"></div>
                            <div className="flex justify-between items-center font-black">
                                <span className="text-red-500 uppercase text-[9px] sm:text-[10px] tracking-widest">{t('remaining')}</span>
                                <span className="text-lg sm:text-xl text-red-600">{(selectedInvoice.amount - (selectedInvoice.amountPaid || 0)).toLocaleString(locale, { style: 'currency', currency: currencyCode })}</span>
                            </div>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-4 sm:space-y-6">
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="block text-xs sm:text-sm font-black text-slate-700 ml-1">{t('amount')} ({currencyCode})</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        max={selectedInvoice.amount - (selectedInvoice.amountPaid || 0)}
                                        value={paymentAmount} 
                                        onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                        className={`block w-full rounded-2xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-black text-xl sm:text-2xl h-14 sm:h-16 ${isRTL ? 'pl-16 pr-4' : 'pl-4 pr-16'}`}
                                    />
                                    <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'left-0 pl-4' : 'right-0 pr-4'}`}>
                                        <span className="text-slate-300 font-black text-[10px] sm:text-xs">{currencyCode}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="block text-xs sm:text-sm font-black text-slate-700 ml-1">{t('paymentMode')}</label>
                                <select 
                                    value={paymentMethod} 
                                    onChange={e => setPaymentMethod(e.target.value as any)}
                                    className="block w-full rounded-2xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 h-12 sm:h-14 font-bold text-slate-700 text-sm sm:text-base"
                                >
                                    <option value="Virement">{language === 'es' ? 'Transferencia' : (language === 'ar' ? 'تحويل' : 'Virement')}</option>
                                    <option value="Chèque">{language === 'es' ? 'Cheque' : (language === 'ar' ? 'شيك' : 'Chèque')}</option>
                                    <option value="Espèces">{language === 'es' ? 'Efectivo' : (language === 'ar' ? 'نقدا' : 'Espèces')}</option>
                                    <option value="Carte Bancaire">{language === 'es' ? 'Tarjeta' : (language === 'ar' ? 'بطاقة' : 'Carte Bancaire')}</option>
                                </select>
                            </div>

                            {paymentMethod === 'Chèque' && (
                                <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="block text-[10px] sm:text-sm font-black text-slate-700 ml-1">
                                            {language === 'es' ? 'Nº de cheque' : (language === 'ar' ? 'رقم الشيك' : 'N° de chèque')}
                                        </label>
                                        <input 
                                            type="text"
                                            value={checkNumber}
                                            onChange={(e) => setCheckNumber(e.target.value)}
                                            className="block w-full rounded-2xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 h-10 sm:h-12 px-4 text-xs sm:text-sm font-bold"
                                            placeholder="Ex: CH-12345"
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="block text-[10px] sm:text-sm font-black text-slate-700 ml-1">
                                            {language === 'es' ? 'Banco' : (language === 'ar' ? 'البنك' : 'Banque')}
                                        </label>
                                        <input 
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className="block w-full rounded-2xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 h-10 sm:h-12 px-4 text-xs sm:text-sm font-bold"
                                            placeholder="Ex: BMCE, Attijari..."
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-10">
                                <button type="button" onClick={() => setSelectedInvoice(null)} className="flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest order-2 sm:order-1">{t('cancel')}</button>
                                <button type="submit" className="flex-[2] py-3 sm:py-4 text-xs sm:text-sm font-black text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-500/30 transition-all transform active:scale-95 uppercase tracking-widest order-1 sm:order-2">{t('confirm')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentTracking;
