
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Quote, QuoteStatus } from '../types';
import { X } from 'lucide-react';

interface ChangeStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newStatus: QuoteStatus) => void;
    quote: Quote | null;
}

const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({ isOpen, onClose, onSave, quote }) => {
    const [newStatus, setNewStatus] = useState<QuoteStatus>(QuoteStatus.Draft);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (quote) {
            setNewStatus(quote.status);
        }
    }, [quote]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(newStatus);
        handleClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
            <div className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-200 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Changer le statut</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Modifier le statut du devis #{quote?.id}.</p>
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-4">
                        <div>
                            <label htmlFor="status" className="block text-xs font-semibold text-slate-700 mb-1.5">Nouveau statut</label>
                            <select
                                id="status"
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as QuoteStatus)}
                                className="w-full"
                            >
                                {Object.values(QuoteStatus).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 p-4 bg-slate-50/50 border-t border-slate-100">
                        <button type="button" onClick={handleClose} className="btn-secondary">
                            Annuler
                        </button>
                        <button type="submit" className="btn-primary">
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ChangeStatusModal;
