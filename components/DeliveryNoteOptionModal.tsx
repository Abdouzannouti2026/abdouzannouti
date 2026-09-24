
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Calculator } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DeliveryNoteOptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (showPrices: boolean) => void;
}

const DeliveryNoteOptionModal: React.FC<DeliveryNoteOptionModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { t, isRTL } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
            <div className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 transition-all duration-200 ease-in-out flex flex-col overflow-hidden ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header */}
                <div className={`flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{t('documentFormat')}</h3>
                            <p className="text-xs text-slate-500">{t('chooseFormatNote')}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body Options */}
                <div className="p-6 space-y-3">
                    <button 
                        onClick={() => onConfirm(false)}
                        className={`w-full flex items-center p-4 border border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-xs transition-all group bg-white text-left ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                    >
                        <div className={`p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors ${isRTL ? 'ml-4' : 'mr-4'}`}>
                            <FileText size={22} />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">{t('noteWithoutPrice')}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{t('qtyDesignationOnly')}</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => onConfirm(true)}
                        className={`w-full flex items-center p-4 border border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-xs transition-all group bg-white text-left ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                    >
                        <div className={`p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors ${isRTL ? 'ml-4' : 'mr-4'}`}>
                            <Calculator size={22} />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">{t('noteWithPrice')}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{t('includesUnitPrices')}</div>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button type="button" onClick={handleClose} className="btn-secondary w-full sm:w-auto">
                        {t('cancel')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeliveryNoteOptionModal;
