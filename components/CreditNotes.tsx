
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Header from './Header';
import { FileText, Download, Plus, Pencil, Printer, MoreVertical, Trash2, CheckCircle, RefreshCw, Loader2, ChevronLeft, ChevronRight, Search, Eye, RotateCcw } from 'lucide-react';
import { CreditNote, CreditNoteStatus, Client, Product, CompanySettings, Invoice } from '../types';
import CreateCreditNoteModal from './CreateCreditNoteModal';
import ConfirmationModal from './ConfirmationModal';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';
import DocumentPreviewModal from './DocumentPreviewModal';

const statusBadgeClasses: { [key in CreditNoteStatus]: string } = {
    [CreditNoteStatus.Draft]: 'badge-neutral',
    [CreditNoteStatus.Validated]: 'badge-purple',
    [CreditNoteStatus.Refunded]: 'badge-success',
};

interface CreditNotesProps {
    creditNotes: CreditNote[];
    onUpdateCreditNoteStatus: (id: string, newStatus: CreditNoteStatus) => void;
    onCreateCreditNote: (note: Omit<CreditNote, 'id'>) => void;
    onUpdateCreditNote: (note: CreditNote) => void;
    onDeleteCreditNote: (id: string) => void;
    clients?: Client[];
    products?: Product[];
    invoices?: Invoice[];
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const CreditNotes: React.FC<CreditNotesProps> = ({ 
    creditNotes, 
    onUpdateCreditNoteStatus, 
    onCreateCreditNote, 
    onUpdateCreditNote, 
    onDeleteCreditNote, 
    clients = [], 
    products = [],
    invoices = [],
    companySettings,
    generateDocumentId
}) => {
    const { t, isRTL } = useLanguage();
    const location = useLocation();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [prefilledInvoice, setPrefilledInvoice] = useState<Invoice | null>(null);
    const [creditNoteToEdit, setCreditNoteToEdit] = useState<CreditNote | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (location.state && (location.state as any).prefilledInvoice) {
            setPrefilledInvoice((location.state as any).prefilledInvoice);
            setCreditNoteToEdit(null);
            setIsCreateModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

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
    const filteredNotes = creditNotes.filter(note => {
        const term = searchTerm.toLowerCase();
        return (
            (note.documentId || note.id).toLowerCase().includes(term) ||
            (note.clientName || '').toLowerCase().includes(term) ||
            (note.invoiceId || '').toLowerCase().includes(term)
        );
    });
    const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedNotes = filteredNotes.slice(startIndex, startIndex + itemsPerPage);

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
    }, [creditNotes.length, searchTerm, itemsPerPage]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
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
            const menuHeight = 260; 
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

    const handleEditClick = (note: CreditNote) => {
        setCreditNoteToEdit(note);
        setIsCreateModalOpen(true);
    };

    const handleCreateClick = () => {
        setCreditNoteToEdit(null);
        setIsCreateModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (idToDelete) {
            onDeleteCreditNote(idToDelete);
        }
        setIsDeleteModalOpen(false);
        setIdToDelete(null);
    };

    const handleSave = (data: any, id?: string) => {
        if (id) {
            onUpdateCreditNote({ ...data, id });
        } else {
            onCreateCreditNote(data);
        }
    };

    const handleDownload = async (note: CreditNote) => {
        setDownloadingId(note.id);
        setActiveMenuId(null);
        try {
            const client = clients.find(c => c.id === note.clientId);
            await generatePDF('Avoir', note, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    const handlePrint = (note: CreditNote) => {
        setActiveMenuId(null);
        try {
            const client = clients.find(c => c.id === note.clientId);
            printDocument('Avoir', note, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const getStatusLabel = (status: CreditNoteStatus) => {
        switch(status) {
            case CreditNoteStatus.Draft: return t('statusManual');
            case CreditNoteStatus.Validated: return t('statusValidated');
            case CreditNoteStatus.Refunded: return t('statusRefunded');
            default: return status;
        }
    };

    const activeNote = creditNotes.find(n => n.id === activeMenuId);
    const isDownloading = activeNote ? downloadingId === activeNote.id : false;

    return (
        <div className="space-y-6">
            <Header title={t('creditNotes')}>
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="btn-primary px-3.5 py-2.5"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('newCreditNote')}</span>
                    <span className="sm:hidden">{t('add')}</span>
                </button>
            </Header>
            
            <CreateCreditNoteModal 
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setPrefilledInvoice(null);
                    setCreditNoteToEdit(null);
                }}
                onSave={handleSave}
                clients={clients}
                products={products}
                invoices={invoices}
                prefilledInvoice={prefilledInvoice}
                creditNoteToEdit={creditNoteToEdit}
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
                    type="Avoir"
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
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('creditNoteNumber')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('invoiceReference')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('amount')}</th>
                                <th scope="col" className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('status')}</th>
                                <th scope="col" className="relative px-6 py-3.5 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedNotes.length > 0 ? (
                                paginatedNotes.map((note) => (
                                    <tr key={note.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>{note.documentId || note.id}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(note.date).toLocaleDateString('fr-FR')}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-900 max-w-[160px] truncate ${isRTL ? 'text-right' : 'text-left'}`}>{note.clientName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{note.invoiceId || '-'}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-extrabold text-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>{note.amount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={statusBadgeClasses[note.status] || 'badge-neutral'}>
                                                    {getStatusLabel(note.status)}
                                                </span>
                                                {note.returnToStock !== false && (
                                                    <span 
                                                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                                            note.status === CreditNoteStatus.Validated || note.status === CreditNoteStatus.Refunded
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                        }`}
                                                        title={note.status === CreditNoteStatus.Validated || note.status === CreditNoteStatus.Refunded ? 'Articles réintégrés au stock' : 'Sera réintégré lors de la validation'}
                                                    >
                                                        <RotateCcw className="w-2.5 h-2.5" />
                                                        {note.status === CreditNoteStatus.Validated || note.status === CreditNoteStatus.Refunded
                                                            ? (isRTL ? 'مخزون مسترجع' : 'Stock réintégré')
                                                            : (isRTL ? 'في الانتظار' : 'Stock en attente')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium relative ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <button 
                                                onClick={(e) => toggleMenu(e, note.id)}
                                                className={`p-2 rounded-xl transition-all ${activeMenuId === note.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
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
                                            <FileText className="h-10 w-10 text-slate-300 mb-3" />
                                            <h3 className="text-sm font-bold text-slate-800">Aucun avoir trouvé</h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 bg-slate-50/20 p-2">
                    {paginatedNotes.length > 0 ? (
                        paginatedNotes.map((note) => (
                            <div key={note.id} className="p-4 bg-white mb-2.5 rounded-2xl shadow-xs border border-slate-100 transition-all active:bg-slate-50">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <p className="text-xs font-bold text-emerald-600">#{note.documentId || note.id}</p>
                                            <span className={statusBadgeClasses[note.status] || 'badge-neutral'}>
                                                {getStatusLabel(note.status)}
                                            </span>
                                            {note.returnToStock !== false && (
                                                <span 
                                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                                        note.status === CreditNoteStatus.Validated || note.status === CreditNoteStatus.Refunded
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                    }`}
                                                >
                                                    <RotateCcw className="w-2.5 h-2.5" />
                                                    {note.status === CreditNoteStatus.Validated || note.status === CreditNoteStatus.Refunded
                                                        ? (isRTL ? 'مخزون مسترجع' : 'Stock')
                                                        : (isRTL ? 'انتظار' : 'En attente')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 truncate pr-2">{note.clientName}</p>
                                    </div>
                                    <button 
                                        onClick={(e) => toggleMenu(e, note.id)}
                                        className={`p-2 rounded-xl transition-all border border-slate-100 shadow-xs ${activeMenuId === note.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:text-slate-700'}`}
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                                
                                <div className="flex justify-between items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('amount')}</p>
                                        <p className="text-sm font-extrabold text-slate-900">
                                            {note.amount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(note.date).toLocaleDateString('fr-FR')}</p>
                                        <p className="text-[11px] text-slate-500 font-medium">{note.invoiceId ? `Ref: ${note.invoiceId}` : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 px-4">
                            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-800">Aucun avoir trouvé</h3>
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
                                    Affichage de <span className="font-bold text-slate-800">{startIndex + 1}</span> à <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredNotes.length)}</span> sur <span className="font-bold text-slate-800">{filteredNotes.length}</span> avoirs
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
            {activeMenuId && activeNote && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-56 rounded-2xl bg-white shadow-xl border border-slate-100/80 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left, transformOrigin: menuPosition.transformOrigin }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-0.5">
                        <button 
                            onClick={() => { handleEditClick(activeNote); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        {activeNote.status === CreditNoteStatus.Draft && (
                             <button 
                                onClick={() => { onUpdateCreditNoteStatus(activeNote.id, CreditNoteStatus.Validated); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <CheckCircle size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('validate')}
                            </button>
                        )}

                        {activeNote.status === CreditNoteStatus.Validated && (
                             <button 
                                onClick={() => { onUpdateCreditNoteStatus(activeNote.id, CreditNoteStatus.Refunded); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <RefreshCw size={16} className={`text-blue-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('markRefunded')}
                            </button>
                        )}
                        
                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={async () => {
                                const client = clients.find(c => c.id === activeNote.clientId);
                                setSelectedDocForPreview(activeNote);
                                setSelectedRecipientForPreview(client);
                                setIsPreviewModalOpen(true);
                                setActiveMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Eye size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('view')}
                        </button>

                        <button 
                            onClick={() => { handlePrint(activeNote); setActiveMenuId(null); }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Printer size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeNote); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handleDeleteClick(activeNote.id); setActiveMenuId(null); }} 
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

export default CreditNotes;
