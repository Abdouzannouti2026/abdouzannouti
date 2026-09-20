
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Search, Pencil, RefreshCw, Download, FileText, MoreVertical, Truck, Loader2, Printer, Trash2, ShoppingBag, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderStatus, Supplier, Product, CompanySettings } from '../types';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';

const statusBadgeClasses: { [key in PurchaseOrderStatus]: string } = {
    [PurchaseOrderStatus.Draft]: 'badge-neutral',
    [PurchaseOrderStatus.Sent]: 'badge-info',
    [PurchaseOrderStatus.Received]: 'badge-purple',
    [PurchaseOrderStatus.Paid]: 'badge-success',
    [PurchaseOrderStatus.Cancelled]: 'badge-danger',
};

const getPaymentStatus = (order: PurchaseOrder, language: string) => {
    const total = order.totalAmount || 0;
    const paid = order.amountPaid || 0;
    
    if (paid >= total && total > 0) return { label: language === 'fr' ? 'Payé' : 'Paid', className: 'badge-success' };
    if (paid > 0) return { label: language === 'fr' ? 'Partiel' : 'Partial', className: 'badge-warning' };
    return { label: language === 'fr' ? 'En attente' : 'Unpaid', className: 'badge-neutral' };
};

interface PurchaseOrdersProps {
    orders: PurchaseOrder[];
    suppliers: Supplier[];
    products: Product[];
    onAddOrder: (order: Omit<PurchaseOrder, 'id'>) => void;
    onUpdateOrder: (order: PurchaseOrder) => void;
    onUpdateStatus: (id: string, status: PurchaseOrderStatus) => void;
    onDeleteOrder?: (id: string) => void;
    onConvertToInvoice?: (order: PurchaseOrder) => void;
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ 
    orders, 
    suppliers,
    products,
    onAddOrder,
    onUpdateOrder,
    onUpdateStatus,
    onDeleteOrder,
    onConvertToInvoice,
    companySettings,
    generateDocumentId
}) => {
    const { t, isRTL, language } = useLanguage();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Responsive items per page
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const filteredOrders = orders.filter(order => {
        const term = searchTerm.toLowerCase();
        return (
            (order.documentId || order.id).toLowerCase().includes(term) ||
            (order.supplierName || '').toLowerCase().includes(term)
        );
    });
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [orders.length, searchTerm, itemsPerPage]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orderIdToDelete, setOrderIdToDelete] = useState<string | null>(null);

    // Menu Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{top: number, left: number, transformOrigin: string} | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if(activeMenuId) {
            document.addEventListener('click', handleClickOutside);
            window.addEventListener('scroll', handleClickOutside, true);
            window.addEventListener('resize', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleClickOutside, true);
            window.removeEventListener('resize', handleClickOutside);
        };
    }, [activeMenuId]);

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (activeMenuId === id) {
            setActiveMenuId(null);
            setMenuPosition(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const menuHeight = 300; 
            const menuWidth = 224; // w-56 is 14rem = 224px
            
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

            setActiveMenuId(id);
            setMenuPosition({ top, left: Math.max(10, left), transformOrigin });
        }
    };

    const handleCreateClick = () => {
        setOrderToEdit(null);
        setIsCreateModalOpen(true);
    };

    const handleEdit = (order: PurchaseOrder) => {
        setOrderToEdit(order);
        setIsCreateModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteClick = (id: string) => {
        setOrderIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (orderIdToDelete && onDeleteOrder) {
            onDeleteOrder(orderIdToDelete);
        }
        setIsDeleteModalOpen(false);
        setOrderIdToDelete(null);
    };

    const handleStatusChange = (id: string, newStatus: PurchaseOrderStatus) => {
        onUpdateStatus(id, newStatus);
        setActiveMenuId(null);
    };

    const handleDownload = async (order: PurchaseOrder) => {
        setDownloadingId(order.id);
        setActiveMenuId(null);
        try {
            const supplier = suppliers.find(s => s.id === order.supplierId);
            await generatePDF('Bon de Commande', order, companySettings || null, supplier);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    const handlePrint = (order: PurchaseOrder) => {
        setActiveMenuId(null);
        try {
            const supplier = suppliers.find(s => s.id === order.supplierId);
            printDocument('Bon de Commande', order, companySettings || null, supplier);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleSaveOrder = (orderData: Omit<PurchaseOrder, 'id'>, id?: string) => {
        if (id) {
             const original = orders.find(o => o.id === id);
             if(original) {
                 onUpdateOrder({
                     ...original,
                     ...orderData
                 });
             }
        } else {
            onAddOrder(orderData);
        }
    };

    const activeOrder = orders.find(o => o.id === activeMenuId);
    const isDownloading = activeOrder ? downloadingId === activeOrder.id : false;

    return (
        <div className="space-y-6">
            <Header title={t('purchaseOrders')}>
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="btn-primary px-3.5 py-2.5"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('newPurchaseOrder')}</span>
                    <span className="sm:hidden">{t('add')}</span>
                </button>
            </Header>

            <CreatePurchaseOrderModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveOrder}
                suppliers={suppliers}
                products={products}
                orderToEdit={orderToEdit}
                companySettings={companySettings}
                generateDocumentId={generateDocumentId}
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('confirmDelete')}
                message={t('confirmDeleteMessage')}
            />

            <div className="card-base overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="relative">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'}`}>
                            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('searchOrderPlaceholder')}
                            className={`block w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                        />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('orderNumber')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('supplier')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('expectedDelivery')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('amount')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('status')}</th>
                                <th scope="col" className="relative px-6 py-3.5 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedOrders.length > 0 ? (
                                paginatedOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>{order.documentId || order.id}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(order.date).toLocaleDateString('fr-FR')}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-900 max-w-[160px] truncate ${isRTL ? 'text-right' : 'text-left'}`}>{order.supplierName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString('fr-FR') : '-'}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-extrabold text-slate-900 ${isRTL ? 'text-left' : 'text-right'}`}>{order.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className={statusBadgeClasses[order.status] || 'badge-neutral'}>
                                                    {order.status}
                                                </span>
                                                <span className={getPaymentStatus(order, language).className}>
                                                    {getPaymentStatus(order, language).label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium relative ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <button 
                                                onClick={(e) => toggleMenu(e, order.id)}
                                                className={`p-2 rounded-xl transition-all ${activeMenuId === order.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                                title={t('actions')}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 px-6">
                                       <div className="flex flex-col items-center justify-center">
                                            <ShoppingBag className="h-10 w-10 text-slate-300 mb-3" />
                                            <h3 className="text-sm font-bold text-slate-800">{searchTerm ? t('noFinancialData') : t('noOrdersFound')}</h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 bg-slate-50/20 p-2">
                    {paginatedOrders.length > 0 ? (
                        paginatedOrders.map((order) => (
                            <div key={order.id} className="p-4 bg-white mb-2.5 rounded-2xl shadow-xs border border-slate-100 transition-all active:bg-slate-50">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-xs font-bold text-emerald-600">#{order.documentId || order.id}</p>
                                            <span className={statusBadgeClasses[order.status] || 'badge-neutral'}>
                                                {order.status}
                                            </span>
                                            <span className={getPaymentStatus(order, language).className}>
                                                {getPaymentStatus(order, language).label}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 truncate pr-2">{order.supplierName}</p>
                                    </div>
                                    <button 
                                        onClick={(e) => toggleMenu(e, order.id)}
                                        className={`p-2 rounded-xl transition-all border border-slate-100 shadow-xs ${activeMenuId === order.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:text-slate-700'}`}
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                                
                                <div className="flex justify-between items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('amount')}</p>
                                        <p className="text-sm font-extrabold text-slate-900">
                                            {order.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(order.date).toLocaleDateString('fr-FR')}</p>
                                        <p className="text-[11px] text-slate-500 font-medium">{order.expectedDate ? `${t('expectedDelivery')}: ${new Date(order.expectedDate).toLocaleDateString('fr-FR')}` : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 px-4">
                            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-800">{searchTerm ? t('noFinancialData') : t('noOrdersFound')}</h3>
                        </div>
                    )}
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-100">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="btn-secondary text-xs"
                            >
                                {isRTL ? 'التالي' : 'Précédent'}
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="btn-secondary text-xs ml-3"
                            >
                                {isRTL ? 'السابق' : 'Suivant'}
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Affichage de <span className="font-bold text-slate-800">{startIndex + 1}</span> à <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredOrders.length)}</span> sur <span className="font-bold text-slate-800">{filteredOrders.length}</span> commandes
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-xl shadow-xs -space-x-px overflow-hidden border border-slate-200" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-3 py-2 bg-white text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {getPageNumbers().map((page, i) => (
                                        <React.Fragment key={i}>
                                            {page === '...' ? (
                                                <span className="relative inline-flex items-center px-3.5 py-2 bg-white text-xs font-semibold text-slate-400 border-l border-slate-100">
                                                    ...
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => setCurrentPage(page as number)}
                                                    className={`relative inline-flex items-center px-3.5 py-2 text-xs font-bold transition-colors border-l border-slate-100 ${currentPage === page ? 'z-10 bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {page}
                                                </button>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-3 py-2 bg-white text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40 border-l border-slate-100"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Menu Dropdown via Portal */}
            {activeMenuId && activeOrder && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-56 rounded-2xl bg-white shadow-xl border border-slate-100/80 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left, transformOrigin: menuPosition.transformOrigin }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-0.5">
                        <button 
                            onClick={() => { handleEdit(activeOrder); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        {onConvertToInvoice && (
                            <button 
                                onClick={() => { onConvertToInvoice(activeOrder); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <FileText size={16} className={`text-blue-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('convertToInvoice')}
                            </button>
                        )}
                        
                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        {activeOrder.status === PurchaseOrderStatus.Draft && (
                            <button 
                                onClick={() => { handleStatusChange(activeOrder.id, PurchaseOrderStatus.Sent); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <RefreshCw size={16} className={`text-blue-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('markSent')}
                            </button>
                        )}
                        
                        {activeOrder.status === PurchaseOrderStatus.Sent && (
                             <button 
                                onClick={() => { handleStatusChange(activeOrder.id, PurchaseOrderStatus.Received); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <Truck size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('markReceived')}
                            </button>
                        )}

                        {(activeOrder.totalAmount - (activeOrder.amountPaid || 0)) > 0 && (
                            <button 
                                onClick={() => {
                                    navigate('/suppliers', { state: { supplierId: activeOrder.supplierId, tab: 'credit' } });
                                    setActiveMenuId(null);
                                }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <RefreshCw size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {language === 'fr' ? 'Régler le paiement' : 'Record Payment'}
                            </button>
                        )}

                        <div className="border-t border-slate-100 my-1 mx-2"></div>
                        
                        <button 
                            onClick={() => { handlePrint(activeOrder); setActiveMenuId(null); }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Printer size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeOrder); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handleDeleteClick(activeOrder.id); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-rose-600 rounded-xl hover:bg-rose-50 transition-colors group"
                        >
                            <Trash2 size={16} className={`text-rose-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('delete')}
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PurchaseOrders;
