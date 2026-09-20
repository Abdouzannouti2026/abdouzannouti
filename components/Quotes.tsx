
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import ChangeStatusModal from './ChangeStatusModal';
import CreateQuoteModal from './CreateQuoteModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Search, Pencil, RefreshCw, Download, FileText, MoreVertical, CheckCircle, Loader2, Printer, Trash2, ChevronLeft, ChevronRight, MessageSquare, Eye } from 'lucide-react';
import { Quote, QuoteStatus, Client, Product, CompanySettings } from '../types';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';
import { shareDocument } from '../services/shareService';
import DocumentPreviewModal from './DocumentPreviewModal';

const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
        case QuoteStatus.Approved:
            return 'badge-success';
        case QuoteStatus.Sent:
        case QuoteStatus.Created:
            return 'badge-info';
        case QuoteStatus.Rejected:
            return 'badge-danger';
        case QuoteStatus.Converted:
            return 'badge-purple';
        case QuoteStatus.Draft:
        default:
            return 'badge-neutral';
    }
};

interface QuotesProps {
    quotes: Quote[];
    onUpdateQuoteStatus: (quoteId: string, newStatus: QuoteStatus) => void;
    onCreateInvoice: (quoteId: string) => Promise<void> | void;
    onAddQuote: (quote: Omit<Quote, 'id' | 'amount'>) => void;
    onUpdateQuote: (quote: Quote) => void;
    onDeleteQuote?: (id: string) => void;
    clients?: Client[];
    products?: Product[];
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const Quotes: React.FC<QuotesProps> = ({ 
    quotes, 
    onUpdateQuoteStatus, 
    onCreateInvoice,
    onAddQuote,
    onUpdateQuote,
    onDeleteQuote,
    clients = [],
    products = [],
    companySettings,
    generateDocumentId
}) => {
    const navigate = useNavigate();
    const { t, isRTL } = useLanguage();
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [quoteToUpdate, setQuoteToUpdate] = useState<Quote | null>(null);
    const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);
    const [convertingId, setConvertingId] = useState<string | null>(null);
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
    const filteredQuotes = quotes.filter(quote => {
        const term = searchTerm.toLowerCase();
        return (
            (quote.documentId || quote.id).toLowerCase().includes(term) ||
            (quote.clientName || '').toLowerCase().includes(term)
        );
    });
    const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedQuotes = filteredQuotes.slice(startIndex, startIndex + itemsPerPage);

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
    }, [quotes.length, searchTerm, itemsPerPage]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [quoteIdToDelete, setQuoteIdToDelete] = useState<string | null>(null);
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
            const menuHeight = 300; 
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

    const handleOpenStatusModal = (quote: Quote) => {
        setQuoteToUpdate(quote);
        setIsStatusModalOpen(true);
        setActiveMenuId(null);
    };

    const handleSaveStatus = (newStatus: QuoteStatus) => {
        if (quoteToUpdate) {
            onUpdateQuoteStatus(quoteToUpdate.id, newStatus);
        }
        setIsStatusModalOpen(false);
        setQuoteToUpdate(null);
    };

    const handleDeleteClick = (id: string) => {
        setQuoteIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (quoteIdToDelete && onDeleteQuote) {
            onDeleteQuote(quoteIdToDelete);
        }
        setIsDeleteModalOpen(false);
        setQuoteIdToDelete(null);
    };

    const handleDownload = async (quote: Quote) => {
        setDownloadingId(quote.id);
        setActiveMenuId(null);
        try {
            const client = clients.find(c => c.id === quote.clientId);
            await generatePDF('Devis', quote, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    const handlePrint = (quote: Quote) => {
        setActiveMenuId(null);
        try {
            const client = clients.find(c => c.id === quote.clientId);
            printDocument('Devis', quote, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        }
    };
    
    const handleConvert = async (quoteId: string) => {
        if (!convertingId) {
            setConvertingId(quoteId);
            try {
                await onCreateInvoice(quoteId);
            } catch (error) {
                console.error("Erreur conversion", error);
            } finally {
                setConvertingId(null);
                setActiveMenuId(null);
            }
        }
    };

    const handleEdit = (quote: Quote) => {
        setQuoteToEdit(quote);
        setIsCreateModalOpen(true);
        setActiveMenuId(null);
    };

    const handleCreateClick = () => {
        setQuoteToEdit(null);
        setIsCreateModalOpen(true);
    };

    const handleSaveQuote = (quoteData: any, id?: string) => {
        if (id && onUpdateQuote) {
             const original = quotes.find(q => q.id === id);
             if(original) {
                 const { totalAmount, ...cleanQuoteData } = quoteData;
                 onUpdateQuote({
                     ...original,
                     ...cleanQuoteData,
                     amount: quoteData.amount || (quoteData.subTotal + quoteData.vatAmount)
                 });
             }
        } else {
            onAddQuote(quoteData);
        }
        setIsCreateModalOpen(false);
    };

    const activeQuote = quotes.find(q => q.id === activeMenuId);
    const isConverting = activeQuote ? convertingId === activeQuote.id : false;
    const isDownloading = activeQuote ? downloadingId === activeQuote.id : false;

    return (
        <div className="space-y-6">
            <Header title={t('quotes')}>
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="btn-primary px-3.5 py-2.5"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('newQuote')}</span>
                    <span className="sm:hidden">{t('add')}</span>
                </button>
            </Header>

            <ChangeStatusModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSave={handleSaveStatus}
                quote={quoteToUpdate}
            />

            <CreateQuoteModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveQuote}
                clients={clients}
                products={products}
                quoteToEdit={quoteToEdit}
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
                    type="Devis"
                    doc={selectedDocForPreview}
                    settings={companySettings}
                    recipient={selectedRecipientForPreview}
                />
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
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('status')}</th>
                                <th scope="col" className="relative px-6 py-3.5 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedQuotes.length > 0 ? (
                                paginatedQuotes.map((quote) => (
                                    <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>{quote.documentId || quote.id}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(quote.date).toLocaleDateString('fr-FR')}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-900 max-w-[160px] truncate ${isRTL ? 'text-right' : 'text-left'}`}>{quote.clientName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-extrabold text-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>{quote.amount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={getStatusBadge(quote.status)}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium relative ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <button 
                                                onClick={(e) => toggleMenu(e, quote.id)}
                                                className={`p-2 rounded-xl transition-all ${activeMenuId === quote.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                                title={t('actions')}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 px-6">
                                       <div className="flex flex-col items-center justify-center">
                                            <FileText className="h-10 w-10 text-slate-300 mb-3" />
                                            <h3 className="text-sm font-bold text-slate-800">Aucun devis trouvé</h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 bg-slate-50/20 p-2">
                    {paginatedQuotes.length > 0 ? (
                        paginatedQuotes.map((quote) => (
                            <div key={quote.id} className="p-4 bg-white mb-2.5 rounded-2xl shadow-xs border border-slate-100 transition-all active:bg-slate-50">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-xs font-bold text-emerald-600">{quote.documentId || quote.id}</p>
                                            <span className={getStatusBadge(quote.status)}>
                                                {quote.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 truncate pr-2">{quote.clientName}</p>
                                    </div>
                                    <button 
                                        onClick={(e) => toggleMenu(e, quote.id)}
                                        className={`p-2 rounded-xl transition-all border border-slate-100 shadow-xs ${activeMenuId === quote.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:text-slate-700'}`}
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                                <div className="flex justify-between items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('amount')}</p>
                                        <p className="text-sm font-extrabold text-slate-900">
                                            {quote.amount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(quote.date).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 px-4">
                            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-800">Aucun devis trouvé</h3>
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
                                    Affichage de <span className="font-bold text-slate-800">{startIndex + 1}</span> à <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredQuotes.length)}</span> sur <span className="font-bold text-slate-800">{filteredQuotes.length}</span> devis
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
            {activeMenuId && activeQuote && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-56 rounded-2xl bg-white shadow-xl border border-slate-100/80 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left, transformOrigin: menuPosition.transformOrigin }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-0.5">
                        <button 
                            onClick={() => { handleEdit(activeQuote); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        <button 
                            onClick={() => { handleOpenStatusModal(activeQuote); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <RefreshCw size={16} className={`text-blue-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('update')}
                        </button>
                        
                        {activeQuote.status !== QuoteStatus.Converted && (
                             <button 
                                onClick={() => { handleConvert(activeQuote.id); setActiveMenuId(null); }} 
                                disabled={isConverting}
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                            >
                                {isConverting ? (
                                    <Loader2 size={16} className={`animate-spin text-purple-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                                ) : (
                                    <CheckCircle size={16} className={`text-purple-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                                )}
                                {t('convert')}
                            </button>
                        )}
                        
                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={async () => {
                                const client = clients.find(c => c.id === activeQuote.clientId);
                                setSelectedDocForPreview(activeQuote);
                                setSelectedRecipientForPreview(client);
                                setIsPreviewModalOpen(true);
                                setActiveMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Eye size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('view')}
                        </button>

                        <button 
                            onClick={() => { handlePrint(activeQuote); setActiveMenuId(null); }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Printer size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeQuote); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <button 
                            onClick={async () => {
                                const client = clients.find(c => c.id === activeQuote.clientId);
                                setSelectedDocForPreview(activeQuote);
                                setSelectedRecipientForPreview(client);
                                setIsPreviewModalOpen(true);
                                setActiveMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <MessageSquare size={16} className={`text-emerald-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('sendWhatsApp')}
                        </button>

                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handleDeleteClick(activeQuote.id); setActiveMenuId(null); }} 
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

export default Quotes;
