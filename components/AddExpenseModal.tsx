import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    Save, 
    Receipt, 
    ShoppingBag, 
    Droplets, 
    Zap, 
    Wifi, 
    Building2, 
    Tag,
    Check,
    Calendar,
    DollarSign,
    FileText
} from 'lucide-react';
import { Expense } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: Omit<Expense, 'id'>) => Promise<void>;
    editingExpense: Expense | null;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    editingExpense 
}) => {
    const { t, isRTL, language } = useLanguage();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
        category: 'Other',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
    });

    useEffect(() => {
        if (editingExpense) {
            setFormData({
                category: editingExpense.category,
                description: editingExpense.description,
                amount: editingExpense.amount,
                date: editingExpense.date,
                reference: editingExpense.reference || '',
                notes: editingExpense.notes || ''
            });
        } else {
            setFormData({
                category: 'Other',
                description: '',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                reference: '',
                notes: ''
            });
        }
    }, [editingExpense, isOpen]);

    const categories = [
        { id: 'Achats', label: language === 'fr' ? 'Achats' : language === 'ar' ? 'مشتريات' : 'Purchases', icon: ShoppingBag },
        { id: 'Water', label: t('expWater'), icon: Droplets },
        { id: 'Electricity', label: t('expElectricity'), icon: Zap },
        { id: 'Internet', label: t('expInternet'), icon: Wifi },
        { id: 'Rent', label: t('expRent'), icon: Building2 },
        { id: 'Other', label: t('expOther'), icon: Tag }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || formData.amount <= 0) return;
        
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Failed to save expense:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200" aria-modal="true">
            {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
            
            <div 
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <Receipt size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                {editingExpense ? t('editExpense') : t('addExpense')}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {language === 'fr' ? 'Enregistrer une sortie ou charge d\'exploitation' : 'Record an operational expense'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form id="expenseForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    
                    {/* Category Grid */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                            {t('category')}
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                const isSelected = formData.category === cat.id;

                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            const currentCatLabel = categories.find(c => c.id === formData.category)?.label;
                                            const shouldUpdateDescription = !formData.description || formData.description === currentCatLabel;
                                            setFormData({ 
                                                ...formData, 
                                                category: cat.id,
                                                description: shouldUpdateDescription ? cat.label : formData.description
                                            });
                                        }}
                                        className={`p-3 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5 relative ${
                                            isSelected 
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {isSelected && (
                                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            </span>
                                        )}
                                        <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        <span className="truncate w-full text-center">{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            {t('description')} <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 rtl:right-0 rtl:pr-3.5 rtl:left-auto">
                                <FileText size={15} />
                            </div>
                            <input 
                                required
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className={`w-full ${isRTL ? 'pr-10' : 'pl-10'}`}
                                placeholder={t('descriptionPlaceholder')}
                            />
                        </div>
                    </div>

                    {/* Amount & Date row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                {t('amount')} <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <input 
                                    required
                                    type="number"
                                    step="0.01"
                                    value={formData.amount || ''}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                    className="w-full font-semibold"
                                    placeholder="0.00"
                                />
                                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                                    MAD
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                {t('date')} <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                required
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer / Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="submit"
                        form="expenseForm"
                        disabled={isSaving}
                        className="btn-primary"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        <span>{t('save')}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddExpenseModal;
