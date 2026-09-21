
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Header from './Header';
import { CreditCard, FileText, CheckCircle, Download, Plus, Loader2, Pencil, Printer, MoreVertical, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight, Search, Eye, Receipt } from 'lucide-react';
import { Invoice, InvoiceStatus, Payment, Client, Product, CompanySettings, PurchaseOrder } from '../types';
import CreateInvoiceModal from './CreateInvoiceModal';
import ConfirmationModal from './ConfirmationModal';
import InvoiceReportModal from './InvoiceReportModal';
import ThermalTicketModal from './ThermalTicketModal';
import { generatePDF, printDocument, printThermalTicket } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';
import DocumentPreviewModal from './DocumentPreviewModal';

const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
        case InvoiceStatus.Paid:
            return 'badge-success';
        case InvoiceStatus.Pending:
            return 'badge-warning';
        case InvoiceStatus.Overdue:
            return 'badge-danger';
        case InvoiceStatus.Partial:
            return 'badge-info';
        case InvoiceStatus.Draft:
        default:
            return 'badge-neutral';
    }
};

interface InvoicesProps {
    invoices: Invoice[];
    onUpdateInvoiceStatus: (invoiceId: string, newStatus: InvoiceStatus) => void;
    onAddPayment: (payment: Omit<Payment, 'id'>) => void;
    onCreateInvoice?: (invoice: any) => Promise<any> | void;
    onUpdateInvoice?: (invoice: any, id: string) => Promise<any> | void;
    onDeleteInvoice?: (id: string) => Promise<void> | void;
    onCreateCreditNote?: (invoiceId: string) => void;
    clients?: Client[];
    products?: Product[];
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, onUpdateInvoiceStatus, onAddPayment, onCreateInvoice, onUpdateInvoice, onDeleteInvoice, onCreateCreditNote, clients = [], products = [], companySettings, generateDocumentId }) => {
    const { t, isRTL, language } = useLanguage();
    const location = useLocation();
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire'>('Virement');
    const [checkNumber, setCheckNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [prefilledPO, setPrefilledPO] = useState<string | undefined>(undefined);
    const [prefilledOrder, setPrefilledOrder] = useState<PurchaseOrder | undefined>(undefined);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);
    const [selectedInvoiceForThermal, setSelectedInvoiceForThermal] = useState<Invoice | null>(null);

    useEffect(() => {
        if (location.state && (location.state as any).prefilledOrder) {
            setPrefilledOrder((location.state as any).prefilledOrder);
            setIsCreateModalOpen(true);
            window.history.replaceState({}, document.title);
        } else if (location.state && (location.state as any).prefilledPO) {
            setPrefilledPO((location.state as any).prefilledPO);
            setIsCreateModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

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
    const filteredInvoices = invoices.filter(invoice => {
        const term = searchTerm.toLowerCase();
        return (
            (invoice.documentId || invoice.id).toLowerCase().includes(term) ||
            (invoice.clientName || '').toLowerCase().includes(term)
        );
    });
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

    // Reset page if search results or data change
    useEffect(() => {
        setCurrentPage(1);
    }, [invoices.length, searchTerm, itemsPerPage]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceIdToDelete, setInvoiceIdToDelete] = useState<string | null>(null);
    const [isSharingDoc, setIsSharingDoc] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedDocForPreview, setSelectedDocForPreview] = useState<any>(null);
    const [selectedRecipientForPreview, setSelectedRecipientForPreview] = useState<any>(null);

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
            const menuHeight = 320; 
            const menuWidth = 208; // w-52 is 13rem = 208px
            
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

    const openPaymentModal = (invoice: Invoice) => {
        setSelectedInvoiceForPayment(invoice);
        setPaymentAmount(invoice.amount - (invoice.amountPaid || 0));
    };

    const handleEditClick = (invoice: Invoice) => {
        setInvoiceToEdit(invoice);
        setIsCreateModalOpen(true);
    };

    const handleCreateClick = () => {
        setInvoiceToEdit(null);
        setIsCreateModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setInvoiceIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (invoiceIdToDelete && onDeleteInvoice) {
            onDeleteInvoice(invoiceIdToDelete);
        }
        setIsDeleteModalOpen(false);
        setInvoiceIdToDelete(null);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoiceForPayment) return;
        
        onAddPayment({
            invoiceId: selectedInvoiceForPayment.id,
            invoiceNumber: selectedInvoiceForPayment.documentId || selectedInvoiceForPayment.id,
            clientId: selectedInvoiceForPayment.clientId,
            clientName: selectedInvoiceForPayment.clientName,
            date: new Date().toISOString().split('T')[0],
            amount: paymentAmount,
            method: paymentMethod,
            reference: paymentMethod === 'Chèque' ? checkNumber : undefined,
            bankName: paymentMethod === 'Chèque' ? bankName : undefined,
            notes: undefined
        });
        
        setSelectedInvoiceForPayment(null);
        setCheckNumber('');
        setBankName('');
    };

    const handleSaveInvoice = (invoiceData: any, id?: string) => {
        if (id && onUpdateInvoice) {
            return onUpdateInvoice(invoiceData, id);
        } else if (onCreateInvoice) {
            return onCreateInvoice(invoiceData);
        }
    };

    const getInvoiceRecipient = (inv?: Invoice | null): Client => {
        if (!inv) {
            return {
                id: 'client-comptoir',
                name: language === 'ar' ? 'زبون مباشر (كونتوار)' : 'Client Comptoir',
                clientCode: 'POS-001',
                type: 'Particulier',
                email: '',
                phone: '',
                address: 'Vente directe au comptoir'
            };
        }
        const found = clients.find(c => c.id === inv.clientId);
        if (found) return found;
        return {
            id: inv.clientId || 'client-comptoir',
            name: inv.clientName || (language === 'ar' ? 'زبون مباشر (كونتوار)' : 'Client Comptoir'),
            clientCode: 'POS-001',
            type: 'Particulier',
            email: '',
            phone: '',
            address: 'Vente directe au comptoir'
        };
    };

    const handleDownload = async (invoice: Invoice) => {
        setDownloadingId(invoice.id);
        try {
            const client = getInvoiceRecipient(invoice);
            await generatePDF('Facture', invoice, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    const handlePrint = (invoice: Invoice) => {
        try {
            const client = getInvoiceRecipient(invoice);
            printDocument('Facture', invoice, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleCreateCreditNote = (invoiceId: string) => {
        if(onCreateCreditNote) {
            onCreateCreditNote(invoiceId);
            setActiveMenuId(null);
        }
    };

    const activeInvoice = invoices.find(inv => inv.id === activeMenuId);
    const activeInvoiceRemaining = activeInvoice ? activeInvoice.amount - (activeInvoice.amountPaid || 0) : 0;
    const isDownloading = activeInvoice ? downloadingId === activeInvoice.id : false;

    return (
        <div>
            <Header title={t('invoices')}>
                <div className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                        type="button"
                        onClick={() => setIsReportModalOpen(true)}
                        className="btn-secondary px-3.5 py-2.5"
                    >
                        <Printer className="h-4 w-4 text-slate-500" />
                        <span className="hidden sm:inline">Rapport Global</span>
                        <span className="sm:hidden">Rapport</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateClick}
                        className="btn-primary px-3.5 py-2.5"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('newInvoice')}</span>
                        <span className="sm:hidden">{t('add')}</span>
                    </button>
                </div>
            </Header>
            
            <CreateInvoiceModal 
                isOpen={isCreateModalOpen}
                onClose={() => { setIsCreateModalOpen(false); setPrefilledOrder(undefined); setPrefilledPO(undefined); }}
                onSave={handleSaveInvoice}
                clients={clients}
                products={products}
                invoiceToEdit={invoiceToEdit}
                prefilledPO={prefilledPO}
                prefilledOrder={prefilledOrder}
                companySettings={companySettings}
                generateDocumentId={generateDocumentId}
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
            />

            {isPreviewModalOpen && selectedDocForPreview && (
                <DocumentPreviewModal
                    isOpen={isPreviewModalOpen}
                    onClose={() => {
                        setIsPreviewModalOpen(false);
                        setSelectedDocForPreview(null);
                        setSelectedRecipientForPreview(null);
                    }}
                    type="Facture"
                    doc={selectedDocForPreview}
                    settings={companySettings}
                    recipient={selectedRecipientForPreview}
                />
            )}

            {isThermalModalOpen && selectedInvoiceForThermal && (
                <ThermalTicketModal
                    isOpen={isThermalModalOpen}
                    onClose={() => {
                        setIsThermalModalOpen(false);
                        setSelectedInvoiceForThermal(null);
                    }}
                    document={selectedInvoiceForThermal}
                    settings={companySettings}
                    recipient={getInvoiceRecipient(selectedInvoiceForThermal)}
                />
            )}

            {selectedInvoiceForPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{t('paymentRecorded')}</h3>
                        <p className="text-sm text-gray-500 mb-4">{t('invoices')} {selectedInvoiceForPayment.documentId || selectedInvoiceForPayment.id}</p>
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('amount')}</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    max={selectedInvoiceForPayment.amount - (selectedInvoiceForPayment.amountPaid || 0)}
                                    value={paymentAmount} 
                                    onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">{t('remaining')} : {(selectedInvoiceForPayment.amount - (selectedInvoiceForPayment.amountPaid || 0)).toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('paymentMethod')}</label>
                                <select 
                                    value={paymentMethod} 
                                    onChange={e => setPaymentMethod(e.target.value as any)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option>Virement</option>
                                    <option>Chèque</option>
                                    <option>Espèces</option>
                                    <option>Carte Bancaire</option>
                                </select>
                            </div>
                            {paymentMethod === 'Chèque' && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-700 uppercase ml-1">
                                            {language === 'es' ? 'Nº de cheque' : (language === 'ar' ? 'رقم الشيك' : 'N° de chèque')}
                                        </label>
                                        <input 
                                            type="text"
                                            value={checkNumber}
                                            onChange={(e) => setCheckNumber(e.target.value)}
                                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-11"
                                            placeholder="Ex: CH-12345"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-700 uppercase ml-1">
                                            {language === 'es' ? 'Banco' : (language === 'ar' ? 'البنك' : 'Banque')}
                                        </label>
                                        <input 
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-11"
                                            placeholder="Ex: BMCE, Attijari..."
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setSelectedInvoiceForPayment(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">{t('cancel')}</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">{t('confirm')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card-base overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="relative">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'}`}>
                            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            placeholder={t('search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`block w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                        />
                    </div>
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>#</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('amount')}</th>
                                <th scope="col" className={`hidden lg:table-cell px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('remaining')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('status')}</th>
                                <th scope="col" className="relative px-6 py-3.5 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedInvoices.length > 0 ? (
                                paginatedInvoices.map((invoice) => {
                                    const remaining = invoice.amount - (invoice.amountPaid || 0);
                                    return (
                                    <tr key={invoice.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>{invoice.documentId || invoice.id}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(invoice.date).toLocaleDateString('fr-FR')}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-900 max-w-[160px] truncate ${isRTL ? 'text-right' : 'text-left'}`}>{invoice.clientName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-extrabold text-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>{invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</td>
                                        <td className={`hidden lg:table-cell whitespace-nowrap px-6 py-4 text-sm font-bold text-rose-600 ${isRTL ? 'text-right' : 'text-left'}`}>{remaining > 0 ? remaining.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' }) : '-'}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={getStatusBadge(invoice.status)}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium relative ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <button 
                                                onClick={(e) => toggleMenu(e, invoice.id)}
                                                className={`p-2 rounded-xl transition-all ${activeMenuId === invoice.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                                title={t('actions')}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 px-6">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText className="h-10 w-10 text-slate-300 mb-3" />
                                            <h3 className="text-sm font-bold text-slate-800">Aucune facture trouvée</h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 bg-slate-50/20 p-2">
                    {paginatedInvoices.length > 0 ? (
                        paginatedInvoices.map((invoice) => {
                            const remaining = invoice.amount - (invoice.amountPaid || 0);
                            return (
                                <div key={invoice.id} className="p-4 bg-white mb-2.5 rounded-2xl shadow-xs border border-slate-100 transition-all active:bg-slate-50">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-xs font-bold text-emerald-600">{invoice.documentId || invoice.id}</p>
                                                <span className={getStatusBadge(invoice.status)}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-900 truncate pr-2">{invoice.clientName}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => toggleMenu(e, invoice.id)}
                                            className={`p-2 rounded-xl transition-all border border-slate-100 shadow-xs ${activeMenuId === invoice.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:text-slate-700'}`}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex justify-between items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('amount')}</p>
                                            <p className="text-sm font-extrabold text-slate-900">
                                                {invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
                                            {remaining > 0 && (
                                                <p className="text-[11px] text-rose-600 font-bold">
                                                    {t('remaining')}: {remaining.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 px-4">
                            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-800">Aucune facture trouvée</h3>
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
                                    Affichage de <span className="font-bold text-slate-800">{startIndex + 1}</span> à <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredInvoices.length)}</span> sur <span className="font-bold text-slate-800">{filteredInvoices.length}</span> factures
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
            {activeMenuId && activeInvoice && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-56 rounded-2xl bg-white shadow-xl border border-slate-100/80 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left, transformOrigin: menuPosition.transformOrigin }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-0.5">
                        <button 
                            onClick={() => { handleEditClick(activeInvoice); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        {activeInvoice.status === InvoiceStatus.Draft && (
                             <button 
                                onClick={() => { onUpdateInvoiceStatus(activeInvoice.id, InvoiceStatus.Pending); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <CheckCircle size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('validate')}
                            </button>
                        )}

                        {activeInvoiceRemaining > 0 && (
                            <button 
                                onClick={() => { openPaymentModal(activeInvoice); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <CreditCard size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('paymentAmount')}
                            </button>
                        )}

                        {onCreateCreditNote && (
                            <button 
                                onClick={() => { handleCreateCreditNote(activeInvoice.id); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <ArrowLeftRight size={16} className={`text-purple-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('newCreditNote')}
                            </button>
                        )}
                        
                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={async () => {
                                const client = getInvoiceRecipient(activeInvoice);
                                setSelectedDocForPreview(activeInvoice);
                                setSelectedRecipientForPreview(client);
                                setIsPreviewModalOpen(true);
                                setActiveMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Eye size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('view')}
                        </button>

                        <button 
                            onClick={() => { handlePrint(activeInvoice); setActiveMenuId(null); }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Printer size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { 
                                setSelectedInvoiceForThermal(activeInvoice);
                                setIsThermalModalOpen(true);
                                setActiveMenuId(null); 
                            }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Receipt size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {language === 'ar' ? 'تذكرة كيس (80مم / 58مم)' : 'Ticket Caisse (80mm / 58mm)'}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeInvoice); setActiveMenuId(null); }} 
                            disabled={isDownloading}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handleDeleteClick(activeInvoice.id); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-rose-600 rounded-xl hover:bg-rose-50 transition-colors group"
                        >
                            <Trash2 size={16} className={`text-rose-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('delete')}
                        </button>
                    </div>
                </div>,
                document.body
            )}
            <InvoiceReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                invoices={invoices}
                clients={clients}
                companySettings={companySettings}
            />
        </div>
    );
};

export default Invoices;
