
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import AddSupplierModal from './AddSupplierModal';
import ImportSuppliersModal from './ImportSuppliersModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Pencil, Trash2, Building2, User, Search, ChevronLeft, ChevronRight, Upload, Landmark, AlertCircle, Clock, CheckCircle2, Wallet, ArrowUpRight } from 'lucide-react';
import { Supplier, PurchaseOrder, PurchaseOrderStatus, Expense, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SuppliersProps {
    companySettings?: CompanySettings | null;
    suppliers: Supplier[];
    purchaseOrders: PurchaseOrder[];
    onUpdatePurchaseOrder: (order: PurchaseOrder) => void;
    onAddExpense: (expense: Omit<Expense, 'id'>) => void;
    onAddSupplier: (supplier: Omit<Supplier, 'id' | 'supplierCode'>) => void;
    onUpdateSupplier: (supplier: Supplier) => void;
    onDeleteSupplier: (supplierId: string) => void;
    onDeleteSuppliers: (supplierIds: string[]) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ 
    suppliers, purchaseOrders, onUpdatePurchaseOrder, onAddExpense, onAddSupplier, onUpdateSupplier, onDeleteSupplier, onDeleteSuppliers, companySettings }) => {
    const { t, isRTL, language } = useLanguage();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'list' | 'credit'>('list');
    const [selectedSupplierForCredit, setSelectedSupplierForCredit] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [supplierIdToDelete, setSupplierIdToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const [paymentModalOrder, setPaymentModalOrder] = useState<PurchaseOrder | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredSuppliers = suppliers.filter(supplier => {
        const term = searchTerm.toLowerCase();
        return (
            (supplier.name?.toLowerCase() || '').includes(term) ||
            (supplier.company?.toLowerCase() || '').includes(term) ||
            (supplier.email?.toLowerCase() || '').includes(term) ||
            (supplier.phone?.toLowerCase() || '').includes(term) ||
            (supplier.supplierCode?.toLowerCase() || '').includes(term) ||
            (supplier.ice?.toLowerCase() || '').includes(term)
        );
    });

    // Reset to first page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Handle navigation from other sections
    useEffect(() => {
        if (location.state && (location.state as any).tab === 'credit') {
            setActiveTab('credit');
            if ((location.state as any).supplierId) {
                setSelectedSupplierForCredit((location.state as any).supplierId);
            }
        }
    }, [location.state]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSuppliers = filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);

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

    const handleAddClick = () => {
        setSupplierToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (supplier: Supplier) => {
        setSupplierToEdit(supplier);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (supplierId: string) => {
        setSupplierIdToDelete(supplierId);
        setIsConfirmOpen(true);
    };

    const confirmDeletion = () => {
        if (supplierIdToDelete) {
            onDeleteSupplier(supplierIdToDelete);
        }
        setIsConfirmOpen(false);
        setSupplierIdToDelete(null);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedSupplierIds(filteredSuppliers.map(s => s.id));
        } else {
            setSelectedSupplierIds([]);
        }
    };

    const handleSelectSupplier = (supplierId: string) => {
        setSelectedSupplierIds(prev =>
            prev.includes(supplierId)
                ? prev.filter(id => id !== supplierId)
                : [...prev, supplierId]
        );
    };

    const handleBulkDelete = () => {
        if (selectedSupplierIds.length > 0) {
            setIsBulkConfirmOpen(true);
        }
    };

    const confirmBulkDeletion = () => {
        onDeleteSuppliers(selectedSupplierIds);
        setSelectedSupplierIds([]);
        setIsBulkConfirmOpen(false);
    };

    const handleSaveSupplier = (supplierData: Omit<Supplier, 'id' | 'supplierCode'>, id?: string) => {
        if (id) {
            const existingSupplier = suppliers.find(s => s.id === id);
            if (existingSupplier) {
                onUpdateSupplier({ ...existingSupplier, ...supplierData });
            }
        } else {
            onAddSupplier(supplierData);
        }
        setIsModalOpen(false);
    };

    // Credit Calculations
    const supplierDebts = useMemo(() => {
        const debts: Record<string, { total: number, paid: number, balance: number, overdue: number, count: number, hasUnpaid: boolean, hasPartial: boolean, status: 'unpaid' | 'partial' | 'paid' }> = {};
        
        purchaseOrders.forEach(order => {
            if (order.status === PurchaseOrderStatus.Cancelled) return;
            
            if (!debts[order.supplierId]) {
                debts[order.supplierId] = { total: 0, paid: 0, balance: 0, overdue: 0, count: 0, hasUnpaid: false, hasPartial: false, status: 'paid' };
            }
            
            const total = Number(order.totalAmount) || 0;
            const paid = Number(order.amountPaid) || 0;
            const balance = total - paid;
            
            debts[order.supplierId].total += total;
            debts[order.supplierId].paid += paid;
            debts[order.supplierId].balance += balance;
            debts[order.supplierId].count += 1;
            
            if (balance > 0.01) {
                if (paid > 0.01) {
                    debts[order.supplierId].hasPartial = true;
                } else {
                    debts[order.supplierId].hasUnpaid = true;
                }
            }
            
            if (balance > 0.01 && order.dueDate && new Date(order.dueDate) < new Date()) {
                debts[order.supplierId].overdue += balance;
            }
        });

        // After gathering all totals, determine a display status for each supplier
        Object.keys(debts).forEach(id => {
            const d = debts[id];
            if (d.balance > 0.01) {
                if (d.hasUnpaid && !d.hasPartial) {
                    d.status = 'unpaid';
                } else if (d.hasPartial && !d.hasUnpaid) {
                    d.status = 'partial';
                } else {
                    // Mix of both - default to partial as it shows some payment activity
                    d.status = 'partial';
                }
            } else {
                d.status = 'paid';
            }
        });
        
        return debts;
    }, [purchaseOrders]);

    const totalDebt = Object.values(supplierDebts).reduce((acc, d: any) => acc + d.balance, 0);
    const totalOverdue = Object.values(supplierDebts).reduce((acc, d: any) => acc + d.overdue, 0);

    const [creditFilter, setCreditFilter] = useState<'all' | 'unpaid' | 'partial'>('all');

    const filteredSupplierDebts = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return suppliers.filter(s => {
            const debt = supplierDebts[s.id];
            if (!debt || debt.balance <= 0.01) return false;
            
            const matchesSearch = (
                (s.name?.toLowerCase() || '').includes(term) ||
                (s.company?.toLowerCase() || '').includes(term) ||
                (s.supplierCode?.toLowerCase() || '').includes(term)
            );
            if (!matchesSearch) return false;

            if (creditFilter === 'all') return true;
            if (creditFilter === 'unpaid') return debt.hasUnpaid;
            if (creditFilter === 'partial') return debt.hasPartial;
            return true;
        });
    }, [suppliers, supplierDebts, creditFilter, searchTerm]);

    return (
        <div className="space-y-6">
            <Header title={t('suppliers')}>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setIsImportOpen(true)}
                        className="btn-secondary px-3.5 py-2.5"
                    >
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('import')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleAddClick}
                        className="btn-primary px-3.5 py-2.5"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('addSupplier')}</span>
                        <span className="sm:hidden">{t('add')}</span>
                    </button>
                </div>
            </Header>

            {/* Debt Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-base p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                        <Landmark size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{language === 'fr' ? 'Dette Totale' : 'Total Debt'}</p>
                        <p className="text-xl font-bold text-slate-900 mt-0.5">
                            {totalDebt.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400">{companySettings?.defaultCurrencyCode || 'MAD'}</span>
                        </p>
                    </div>
                </div>
                <div className="card-base p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                        <AlertCircle size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{language === 'fr' ? 'Dette en Retard' : 'Overdue Debt'}</p>
                        <p className="text-xl font-bold text-rose-600 mt-0.5">
                            {totalOverdue.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-rose-300">{companySettings?.defaultCurrencyCode || 'MAD'}</span>
                        </p>
                    </div>
                </div>
                <div className="card-base p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                        <Clock size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{language === 'fr' ? 'Fournisseurs avec Crédit' : 'Suppliers with Credit'}</p>
                        <p className="text-xl font-bold text-slate-900 mt-0.5">
                            {Object.values(supplierDebts).filter((d: any) => d.balance > 0).length} <span className="text-xs font-semibold text-slate-400">{t('suppliers')}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit border border-slate-200/60">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all ${
                        activeTab === 'list' 
                        ? 'bg-white text-emerald-700 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    {t('suppliers')}
                </button>
                <button
                    onClick={() => setActiveTab('credit')}
                    className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all ${
                        activeTab === 'credit' 
                        ? 'bg-white text-emerald-700 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    {language === 'fr' ? 'Crédit Fournisseur' : 'Supplier Credit'}
                </button>
            </div>

            {activeTab === 'list' ? (
                <>
                    <ImportSuppliersModal
                        isOpen={isImportOpen}
                        onClose={() => setIsImportOpen(false)}
                        onImport={(importedSuppliers) => {
                            importedSuppliers.forEach(supplier => onAddSupplier(supplier));
                        }}
                    />

                    <AddSupplierModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveSupplier}
                        supplierToEdit={supplierToEdit}
                    />

                    <ConfirmationModal
                        isOpen={isConfirmOpen}
                        onClose={() => setIsConfirmOpen(false)}
                        onConfirm={confirmDeletion}
                    />

                    <ConfirmationModal
                        isOpen={isBulkConfirmOpen}
                        onClose={() => setIsBulkConfirmOpen(false)}
                        onConfirm={confirmBulkDeletion}
                        title={t('confirmBulkDelete')}
                        message={t('confirmBulkDeleteMessage', { count: selectedSupplierIds.length })}
                    />

                    <div className="table-wrapper">
                 <div className="p-4 border-b border-slate-200/80 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-80">
                                <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'}`}>
                                   <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('search')}
                                    className={`block w-full rounded-xl border-slate-200 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'pr-10' : 'pl-10'}`}
                                />
                            </div>
                            <div className="md:hidden flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                                <input
                                    type="checkbox"
                                    checked={selectedSupplierIds.length === filteredSuppliers.length && filteredSuppliers.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-semibold text-slate-600">{t('selectAll')}</span>
                            </div>
                        </div>
                        {selectedSupplierIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 border border-rose-200/80 hover:bg-rose-100 transition-all"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{t('deleteSelected')} ({selectedSupplierIds.length})</span>
                            </button>
                        )}
                    </div>
                 </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr>
                                <th scope="col" className="table-th px-6 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedSupplierIds.length === filteredSuppliers.length && filteredSuppliers.length > 0}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                </th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('code')}</th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('supplier')} / {t('company')}</th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact')}</th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('coordinates')}</th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('type')}</th>
                                <th scope="col" className="table-th px-6 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedSuppliers.length > 0 ? (
                                paginatedSuppliers.map((supplier) => {
                                    const isCompany = supplier.type === 'Entreprise' || (!supplier.type && supplier.company);

                                    return (
                                    <tr key={supplier.id} className={`hover:bg-slate-50/80 transition-colors duration-150 ${selectedSupplierIds.includes(supplier.id) ? 'bg-emerald-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedSupplierIds.includes(supplier.id)}
                                                onChange={() => handleSelectSupplier(supplier.id)}
                                                className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-mono text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{supplier.supplierCode}</td>
                                        <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${isCompany ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                    {isCompany ? <Building2 size={16} /> : <User size={16} />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {isCompany ? supplier.company : supplier.name}
                                                    </div>
                                                    {supplierDebts[supplier.id]?.balance > 0 && (
                                                        <div className={`mt-1 inline-flex items-center gap-1 w-fit text-[10px] font-bold px-2 py-0.5 rounded-md ${supplierDebts[supplier.id].status === 'partial' ? 'bg-amber-50 text-amber-700 border border-amber-200/80' : 'bg-rose-50 text-rose-700 border border-rose-200/80'}`}>
                                                            <Wallet size={11} />
                                                            {supplierDebts[supplier.id].balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} {companySettings?.defaultCurrencyCode || 'MAD'} 
                                                            <span className="opacity-75 ml-0.5">({supplierDebts[supplier.id].status === 'partial' ? (language === 'fr' ? 'Avance' : 'Adv.') : (language === 'fr' ? 'Non payé' : 'Unpaid')})</span>
                                                        </div>
                                                    )}
                                                    {isCompany && supplier.ice && (
                                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{t('ice')}: {supplier.ice}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {isCompany ? supplier.name : '-'}
                                        </td>
                                        <td className={`px-6 py-4 text-sm text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div>{supplier.email}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{supplier.phone}</div>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={isCompany ? 'badge-info' : 'badge-success'}>
                                                {isCompany ? t('enterprise') : t('individual')}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                            <div className={`flex items-center justify-end gap-1.5 ${isRTL ? 'space-x-reverse' : ''}`}>
                                                {supplierDebts[supplier.id]?.balance > 0 && (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedSupplierForCredit(supplier.id);
                                                            setActiveTab('credit');
                                                        }} 
                                                        className="text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200/80 flex items-center gap-1 text-[11px] font-semibold transition-all"
                                                        title={language === 'fr' ? 'Voir le crédit' : 'View Credit'}
                                                    >
                                                        <ArrowUpRight size={13} />
                                                        {language === 'fr' ? 'Crédit' : 'Credit'}
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleEditClick(supplier)} 
                                                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title={t('edit')}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(supplier.id)} 
                                                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title={t('delete')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                     <td colSpan={7} className="text-center py-16 px-6">
                                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3.5">
                                                <Building2 className="h-7 w-7" strokeWidth={1.5} />
                                            </div>
                                            <h3 className="text-base font-bold text-slate-800">
                                                {searchTerm ? t('noFinancialData') : t('noSuppliers')}
                                            </h3>
                                            {!searchTerm && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {t('firstSupplierPrompt')}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {paginatedSuppliers.length > 0 ? (
                        paginatedSuppliers.map((supplier) => {
                            const isCompany = supplier.type === 'Entreprise' || (!supplier.type && supplier.company);
                            return (
                                <div key={supplier.id} className={`p-4 hover:bg-slate-50/80 transition-colors ${selectedSupplierIds.includes(supplier.id) ? 'bg-emerald-50/40' : ''}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSupplierIds.includes(supplier.id)}
                                                    onChange={() => handleSelectSupplier(supplier.id)}
                                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${isCompany ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                    {isCompany ? <Building2 size={18} /> : <User size={18} />}
                                                </div>
                                            </div>
                                            <div className={`${isRTL ? 'mr-3' : 'ml-3'} min-w-0`}>
                                                <div className="text-sm font-bold text-slate-900 truncate">
                                                    {isCompany ? supplier.company : supplier.name}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">{supplier.supplierCode}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {supplierDebts[supplier.id]?.balance > 0 && (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedSupplierForCredit(supplier.id);
                                                        setActiveTab('credit');
                                                    }} 
                                                    className="p-1.5 text-amber-700 bg-amber-50 rounded-lg text-xs font-semibold"
                                                >
                                                    <ArrowUpRight size={15} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleEditClick(supplier)} 
                                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(supplier.id)} 
                                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 pt-1">
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-slate-500">{t('type')}</span>
                                            <span className={isCompany ? 'badge-info' : 'badge-success'}>
                                                {isCompany ? t('enterprise') : t('individual')}
                                            </span>
                                        </div>
                                        {supplierDebts[supplier.id]?.balance > 0 && (
                                            <div className="flex justify-between text-xs items-center">
                                                <span className="text-slate-500">{language === 'fr' ? 'Dette' : 'Debt'}</span>
                                                <span className={`font-bold px-2 py-0.5 rounded-md ${supplierDebts[supplier.id].status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                                    {supplierDebts[supplier.id].balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} {companySettings?.defaultCurrencyCode || 'MAD'}
                                                </span>
                                            </div>
                                        )}
                                        {supplier.email && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">{t('email')}</span>
                                                <span className="text-slate-800 font-medium truncate max-w-[180px]">{supplier.email}</span>
                                            </div>
                                        )}
                                        {supplier.phone && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">{t('phone')}</span>
                                                <span className="text-slate-800 font-medium">{supplier.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 px-4">
                            <Building2 className="h-12 w-12 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
                            <h3 className="text-base font-bold text-slate-800">
                                {searchTerm ? t('noFinancialData') : t('noSuppliers')}
                            </h3>
                        </div>
                    )}
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-200/80">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="btn-secondary px-3 py-1.5 text-xs"
                            >
                                {isRTL ? 'التالي' : 'Précédent'}
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="btn-secondary px-3 py-1.5 text-xs"
                            >
                                {isRTL ? 'السابق' : 'Suivant'}
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs text-slate-500">
                                    Affichage de <span className="font-semibold text-slate-800">{startIndex + 1}</span> à <span className="font-semibold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredSuppliers.length)}</span> sur <span className="font-semibold text-slate-800">{filteredSuppliers.length}</span> fournisseurs
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {getPageNumbers().map((page, i) => (
                                    <React.Fragment key={i}>
                                        {page === '...' ? (
                                            <span className="px-3 py-1.5 text-xs text-slate-400 font-medium">
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => setCurrentPage(page as number)}
                                                className={`min-w-[34px] h-[34px] flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${currentPage === page ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {page}
                                            </button>
                                        )}
                                    </React.Fragment>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                </div>
                </>
            ) : (
                <div className="space-y-6">
                    {!selectedSupplierForCredit ? (
                        <div className="space-y-4">
                            {/* Credit Filters */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                <button 
                                    onClick={() => setCreditFilter('all')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${creditFilter === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {language === 'fr' ? 'Tous les crédits' : 'All Credits'}
                                </button>
                                <button 
                                    onClick={() => setCreditFilter('unpaid')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${creditFilter === 'unpaid' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {language === 'fr' ? 'Non payés' : 'Not Paid'}
                                </button>
                                <button 
                                    onClick={() => setCreditFilter('partial')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${creditFilter === 'partial' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {language === 'fr' ? 'Partiels (Avances)' : 'Partials (Adv.)'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredSupplierDebts.map(supplier => {
                                    const debt = supplierDebts[supplier.id];
                                    const supplierName = supplier.company || supplier.name;
                                    
                                    return (
                                        <button
                                            key={supplier.id}
                                            onClick={() => setSelectedSupplierForCredit(supplier.id)}
                                            className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-emerald-500 transition-all hover:shadow-md group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowUpRight size={20} className="text-emerald-500" />
                                            </div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`p-2 rounded-lg ${supplier.type === 'Entreprise' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {supplier.type === 'Entreprise' ? <Building2 size={24} /> : <User size={24} />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h4 className="font-bold text-slate-900 truncate">{supplierName}</h4>
                                                    <p className="text-[10px] text-slate-400 font-mono italic">{supplier.supplierCode}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span>{language === 'fr' ? 'Solde à régler' : 'Balance'}</span>
                                                    <span className={`px-2 py-0.5 rounded-full ${debt.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                        {debt.status === 'partial' ? (language === 'fr' ? 'Partiel' : 'Partial') : (language === 'fr' ? 'Impayé' : 'Unpaid')}
                                                    </span>
                                                </div>
                                                <p className="text-2xl font-black text-slate-900 leading-none">
                                                    {debt.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter ml-1">{companySettings?.defaultCurrencyCode || 'MAD'}</span>
                                                </p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                                <span>{debt.count} {language === 'fr' ? 'Commande(s)' : 'Order(s)'}</span>
                                                <span className="text-emerald-600 group-hover:translate-x-1 transition-transform">{language === 'fr' ? 'Gérer le crédit' : 'Manage Credit'} →</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {filteredSupplierDebts.length === 0 && (
                                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-4">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {searchTerm ? (language === 'fr' ? 'Aucun résultat trouvé' : 'No results found') : (language === 'fr' ? 'Aucune dette en cours' : 'No outstanding debts')}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                                        {searchTerm ? (language === 'fr' ? 'Essayez avec un autre nom de fournisseur.' : 'Try with another supplier name.') : (language === 'fr' ? 'Toutes vos factures fournisseurs sont réglées. Bon travail !' : 'All your supplier invoices are settled. Good job!')}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Detailed View for Selected Supplier */}
                            {(() => {
                                const supplier = suppliers.find(s => s.id === selectedSupplierForCredit);
                                if (!supplier) return null;
                                
                                const debt = supplierDebts[supplier.id] || { total: 0, paid: 0, balance: 0, overdue: 0, count: 0, status: 'paid', hasUnpaid: false, hasPartial: false };
                                const supplierName = supplier.company || supplier.name;

                                return (
                                    <div className="space-y-6">
                                        {/* Back Button & Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <button 
                                                onClick={() => setSelectedSupplierForCredit(null)}
                                                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors group"
                                            >
                                                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                                {language === 'fr' ? 'Retour vers la liste' : 'Back to list'}
                                            </button>
                                            
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl ${supplier.type === 'Entreprise' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {supplier.type === 'Entreprise' ? <Building2 size={24} /> : <User size={24} />}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900">{supplierName}</h3>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('supplier')}: {supplier.supplierCode}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Order List Column */}
                                            <div className="lg:col-span-2 space-y-4">
                                                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                                                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                                            <Clock size={18} className="text-emerald-500" />
                                                            {language === 'fr' ? 'Factures en attente de règlement' : 'Pending Invoices'}
                                                        </h4>
                                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                {purchaseOrders.filter(po => po.supplierId === supplier.id && (po.totalAmount - po.amountPaid) > 0.01).length} {language === 'fr' ? 'Doc' : 'Doc'}
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                                        {purchaseOrders.filter(po => po.supplierId === supplier.id && (po.totalAmount - po.amountPaid) > 0.01).map(order => {
                                                            const poBalance = order.totalAmount - (order.amountPaid || 0);
                                                            const isOverdue = order.dueDate && new Date(order.dueDate) < new Date();
                                                            const isPartial = (order.amountPaid || 0) > 0.01;
                                                            
                                                            return (
                                                                <div key={order.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                            <Landmark size={20} />
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-sm font-bold text-slate-900">BC #{order.documentId || 'N/A'}</p>
                                                                                {isPartial && (
                                                                                    <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200">
                                                                                        {language === 'fr' ? 'Payé Partiellement' : 'Partially Paid'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-3 mt-1">
                                                                                <p className="text-[10px] text-slate-500 font-medium">
                                                                                    {order.date ? `${language === 'fr' ? 'Date' : 'Date'}: ${new Date(order.date).toLocaleDateString()}` : ''}
                                                                                </p>
                                                                                {order.dueDate && (
                                                                                    <p className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                                                                        {language === 'fr' ? 'À régler le' : 'Due'}: {new Date(order.dueDate).toLocaleDateString()}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-6 justify-between sm:justify-end">
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{language === 'fr' ? 'Rete à payer' : 'To Pay'}</p>
                                                                            <p className={`text-lg font-black ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                                                                                {poBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px]">{companySettings?.defaultCurrencyCode || 'MAD'}</span>
                                                                            </p>
                                                                        </div>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setPaymentModalOrder(order);
                                                                                setPaymentAmount(poBalance.toString());
                                                                            }}
                                                                            className="h-10 px-4 bg-emerald-600 text-white rounded-xl font-bold text-[13px] hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2 shrink-0"
                                                                        >
                                                                            <CheckCircle2 size={16} />
                                                                            {language === 'fr' ? 'Régler ce montant' : 'Settle Amount'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Summary Column */}
                                            <div className="space-y-4">
                                                <div className="bg-emerald-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden text-left">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                                    <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest relative z-10">{language === 'fr' ? 'Dette Totale' : 'Total Balance'}</p>
                                                    <h3 className="text-4xl font-black mt-2 relative z-10 leading-none">
                                                        {debt.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        <span className="text-lg font-bold text-emerald-400 ml-1">{companySettings?.defaultCurrencyCode || 'MAD'}</span>
                                                    </h3>
                                                    
                                                    <div className="mt-8 space-y-3 relative z-10">
                                                        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight">
                                                            <span className="text-emerald-300">{language === 'fr' ? 'Total Commandé' : 'Total Ordered'}</span>
                                                            <span className="text-white bg-white/10 px-2 py-0.5 rounded-lg">{debt.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} {companySettings?.defaultCurrencyCode || 'MAD'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight">
                                                            <span className="text-emerald-300">{language === 'fr' ? 'Reste à Régler' : 'To Settle'}</span>
                                                            <span className={`${debt.balance > 0.01 ? 'text-red-400' : 'text-emerald-400'} bg-white/10 px-2 py-0.5 rounded-lg`}>
                                                                {debt.balance > 0.01 ? '-' : ''}{debt.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} {companySettings?.defaultCurrencyCode || 'MAD'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}
            {/* Payment Modal */}
            {paymentModalOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900">
                                {language === 'fr' ? 'Régler le paiement' : 'Settle Payment'}
                            </h3>
                            <button 
                                onClick={() => setPaymentModalOrder(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <Plus className="rotate-45" size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'fr' ? 'Référence' : 'Reference'}</p>
                                <p className="text-sm font-black text-slate-900">BC #{paymentModalOrder.documentId || paymentModalOrder.id}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{language === 'fr' ? 'Montant du règlement' : 'Payment Amount'}</p>
                                <div className="relative">
                                    <input 
                                        autoFocus
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className={`w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-black focus:border-emerald-500 focus:ring-0 transition-all font-mono ${isRTL ? 'text-left pl-14 pr-4' : 'text-right pr-14 pl-4'}`}
                                    />
                                    <div className={`absolute inset-y-0 flex items-center pointer-events-none ${isRTL ? 'left-5' : 'right-5'}`}>
                                        <span className="text-sm font-bold text-slate-400 uppercase">{companySettings?.defaultCurrencyCode || 'MAD'}</span>
                                    </div>
                                </div>
                                <p className="mt-2 text-[10px] font-medium text-slate-500">
                                    {language === 'fr' ? 'Le montant sera ajouté au total déjà réglé pour ce bon de commande.' : 'The amount will be added to the total already settled for this purchase order.'}
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setPaymentModalOrder(null)}
                                    className="flex-1 h-12 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                                >
                                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                                </button>
                                <button 
                                    onClick={() => {
                                        const amount = parseFloat(paymentAmount);
                                        if (!isNaN(amount) && amount > 0) {
                                            // Handle PO update
                                            onUpdatePurchaseOrder({
                                                ...paymentModalOrder,
                                                amountPaid: (paymentModalOrder.amountPaid || 0) + amount
                                            });

                                            // Record as specialized expense for Statistics
                                            const supplier = suppliers.find(s => s.id === paymentModalOrder.supplierId);
                                            const supplierName = supplier ? (supplier.company || supplier.name) : 'Fournisseur';
                                            
                                            onAddExpense({
                                                date: new Date().toISOString().split('T')[0],
                                                description: `${language === 'fr' ? 'Paiement BC' : 'PO Payment'} #${paymentModalOrder.documentId || paymentModalOrder.id} - ${supplierName}`,
                                                amount: amount,
                                                category: 'Achats', // This matches our Statistics filtering
                                                purchaseOrderId: paymentModalOrder.id
                                            });

                                            setPaymentModalOrder(null);
                                            setPaymentAmount('');
                                        }
                                    }}
                                    className="flex-2 h-12 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} />
                                    {language === 'fr' ? 'Valider le paiement' : 'Valider le paiement'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
