
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    title?: string;
    message?: string;
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, isLoading: externalLoading }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [internalLoading, setInternalLoading] = useState(false);
    const { t, language } = useLanguage();

    const isLoading = externalLoading || internalLoading;

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            setInternalLoading(false);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (isLoading) return;
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleConfirm = async () => {
        if (isLoading) return;
        
        try {
            setInternalLoading(true);
            const result = onConfirm();
            if (result instanceof Promise) {
                await result;
            }
            handleClose();
        } catch (error) {
            console.error("Confirmation action failed:", error);
            setInternalLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            {/* Backdrop: clicking outside is disabled to prevent accidental dismiss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"></div>
            <div className={`relative w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 transition-all duration-200 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} role="dialog" aria-labelledby="modal-title">
                <div className="sm:flex sm:items-start gap-4">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 sm:mx-0">
                        <AlertTriangle className={`h-6 w-6 text-rose-600 ${isLoading ? 'animate-pulse' : ''}`} aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-left flex-1">
                        <h3 className="text-lg font-bold text-slate-900" id="modal-title">
                            {title || t('confirmDelete')}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {message || t('confirmDeleteMessage')}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 sm:flex sm:flex-row-reverse gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="btn-danger w-full sm:w-auto px-4 py-2.5"
                    >
                        {isLoading && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isLoading ? (language === 'ar' ? 'جاري...' : 'Chargement...') : t('confirm')}
                    </button>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="btn-secondary w-full sm:w-auto px-4 py-2.5 mt-3 sm:mt-0"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
