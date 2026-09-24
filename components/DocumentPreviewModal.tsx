
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer, Loader2, Receipt } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { generateDocumentHTML, generatePDF, printDocument, printThermalTicket, generatePDFBlob, DocumentType, DocumentData } from '../services/pdfService';
import { Client, Supplier, CompanySettings } from '../types';
import ThermalTicketModal from './ThermalTicketModal';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: DocumentType;
    doc: DocumentData;
    settings: CompanySettings | null;
    recipient: Client | Supplier | undefined;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ 
    isOpen, 
    onClose, 
    type, 
    doc, 
    settings, 
    recipient 
}) => {
    const { t, isRTL, language } = useLanguage();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const [isVisible, setIsVisible] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);
    const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [preGeneratedBlob, setPreGeneratedBlob] = useState<Blob | null>(null);
    const [scale, setScale] = useState(1);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            setIsMobile(width < 640);
            
            if (width < 640 && wrapperRef.current) {
                // Calculate scale based on container width
                // 210mm is roughly 794px at 96dpi
                const targetWidth = width - 32; // padding
                const contentWidth = 794; 
                const newScale = targetWidth / contentWidth;
                setScale(Math.max(newScale, 0.2));
            } else {
                setScale(1);
            }
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const effectiveRecipient: Client | Supplier = recipient || {
        id: (doc as any)?.clientId || (doc as any)?.supplierId || 'client-comptoir',
        name: (doc as any)?.clientName || (doc as any)?.supplierName || (language === 'ar' ? 'زبون كونتوار' : 'Client Comptoir'),
        clientCode: (doc as any)?.clientCode || 'POS-001',
        type: 'Particulier',
        email: (doc as any)?.clientEmail || '',
        phone: (doc as any)?.clientPhone || '',
        address: (doc as any)?.clientAddress || 'Vente directe au comptoir',
        ice: (doc as any)?.clientIce || ''
    } as Client;

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            try {
                const html = generateDocumentHTML(type, doc, settings, effectiveRecipient);
                setHtmlContent(html);
                
                // Pre-generate blob for faster sharing/downloading
                if (!isGeneratingBackground) {
                    setIsGeneratingBackground(true);
                    setTimeout(async () => {
                        try {
                            const blob = await generatePDFBlob(type, doc, settings, effectiveRecipient);
                            setPreGeneratedBlob(blob);
                        } catch (err) {
                            console.error("Background PDF generation failed:", err);
                        } finally {
                            setIsGeneratingBackground(false);
                        }
                    }, 500);
                }
            } catch (error) {
                console.error("Error generating preview:", error);
            }
        } else {
            setIsVisible(false);
            setPreGeneratedBlob(null);
            setIsGeneratingBackground(false);
        }
    }, [isOpen, type, doc, settings, recipient]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleDownload = async () => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        try {
            if (preGeneratedBlob) {
                const url = URL.createObjectURL(preGeneratedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type.toLowerCase().replace(/\s+/g, '_')}_${doc.documentId || doc.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                await generatePDF(type, doc, settings, effectiveRecipient);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handlePrint = async () => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        try {
            await printDocument(type, doc, settings, effectiveRecipient);
        } finally {
            setIsActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
            
            <div className={`relative w-full max-w-5xl h-[90vh] flex flex-col bg-slate-100 rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transition-all duration-300 ease-out transform ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header */}
                <div className={`flex items-center justify-between p-5 bg-white border-b border-slate-100 gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex flex-col truncate ${isRTL ? 'text-right' : ''}`}>
                        <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
                            {type === 'Facture' ? (language === 'ar' ? 'وصل' : 'Bon') : type} #{doc.documentId || doc.id}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium truncate">
                            {effectiveRecipient.name}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleDownload}
                            disabled={isActionLoading}
                            className="hidden sm:inline-flex btn-primary"
                        >
                            {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            <span>{isActionLoading ? (language === 'fr' ? 'Téléchargement...' : 'Downloading...') : t('download')}</span>
                        </button>
                        
                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

                        <button 
                            onClick={handlePrint}
                            disabled={isActionLoading}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                            title={t('print')}
                        >
                            <Printer size={18} />
                        </button>

                        <button 
                            onClick={() => setIsThermalModalOpen(true)}
                            disabled={isActionLoading}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                            title={language === 'ar' ? 'تذكرة كيس (80مم / 58مم)' : 'Ticket Caisse (80mm / 58mm)'}
                        >
                            <Receipt size={18} />
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-1"></div>

                        <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Preview Content */}
                <div ref={wrapperRef} className="flex-1 overflow-auto p-2 sm:p-8 bg-slate-200/50 flex flex-col items-center">
                    <div 
                        className="w-full flex justify-center items-start"
                        style={{ height: isMobile ? `calc(297mm * ${scale} + 40px)` : 'auto' }}
                    >
                        <div 
                            ref={previewContainerRef}
                            className="bg-white shadow-2xl origin-top transition-transform duration-300 transform-gpu mb-8"
                            style={{ 
                                width: '210mm', 
                                minHeight: '297mm',
                                transform: `scale(${scale})`,
                                marginTop: isMobile ? '10px' : '20px'
                            }}
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    </div>
                </div>

                {/* Mobile Footer Action */}
                <div className="sm:hidden p-4 bg-white border-t border-slate-200">
                    <button 
                        onClick={handleDownload}
                        disabled={isActionLoading}
                        className="w-full btn-primary justify-center"
                    >
                         {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                         <span>{isActionLoading ? (language === 'fr' ? 'Téléchargement...' : 'Downloading...') : t('download')}</span>
                    </button>
                </div>
            </div>

            {/* Custom Styles override for preview */}
            {isThermalModalOpen && (
                <ThermalTicketModal
                    isOpen={isThermalModalOpen}
                    onClose={() => setIsThermalModalOpen(false)}
                    document={doc}
                    settings={settings}
                    recipient={effectiveRecipient}
                />
            )}

            <style>{`
                #pdf-container {
                    background: white;
                    padding: 0;
                    margin: 0;
                    width: 210mm;
                }
                .page-container {
                    box-shadow: none !important;
                    margin-bottom: 20px !important;
                    border: 1px solid #e2e8f0 !important;
                    background: white !important;
                }
                
                @media (max-width: 640px) {
                    /* Adjusting container for the scaled content on mobile */
                    .preview-wrapper {
                        height: fit-content;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default DocumentPreviewModal;
