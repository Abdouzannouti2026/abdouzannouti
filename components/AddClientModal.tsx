
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Client } from '../types';
import { X, User, Building2, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (client: Omit<Client, 'id' | 'clientCode'>, id?: string) => void;
    clientToEdit: Client | null;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onSave, clientToEdit }) => {
    const { t, language } = useLanguage();
    const [type, setType] = useState<'Entreprise' | 'Particulier'>('Entreprise');
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [ice, setIce] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    
    const [isVisible, setIsVisible] = useState(false);

    const isEditMode = clientToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setType(clientToEdit.type || (clientToEdit.company ? 'Entreprise' : 'Particulier'));
                setName(clientToEdit.name);
                setCompany(clientToEdit.company || '');
                setIce(clientToEdit.ice || '');
                setEmail(clientToEdit.email);
                setPhone(clientToEdit.phone);
                setAddress(clientToEdit.address || '');
            } else {
                setType('Entreprise');
                setName('');
                setCompany('');
                setIce('');
                setEmail('');
                setPhone('');
                setAddress('');
            }
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [clientToEdit, isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (type === 'Entreprise' && !company) {
            alert(language === 'es' ? 'El nombre de la empresa es obligatorio.' : 'Le nom de la société est obligatoire.');
            return;
        }
        if (type === 'Particulier' && !name) {
            alert(language === 'es' ? 'El nombre es obligatorio.' : 'Le nom est obligatoire.');
            return;
        }

        onSave({ 
            type,
            name, 
            company: type === 'Entreprise' ? company : undefined,
            ice,
            rc: '',
            email, 
            phone,
            address
        }, clientToEdit?.id);
        handleClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
            <div className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 transition-all duration-200 ease-in-out flex flex-col max-h-[90vh] overflow-hidden ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            {type === 'Entreprise' ? <Building2 size={18} /> : <User size={18} />}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{isEditMode ? t('editClient') : t('addClient')}</h3>
                            <p className="text-xs text-slate-500">{isEditMode ? (language === 'fr' ? 'Modifier les coordonnées du client' : 'Update client information') : (language === 'fr' ? 'Créer une nouvelle fiche client' : 'Create a new client profile')}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <form id="clientForm" onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Type Selector */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-2">{t('type')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setType('Entreprise')}
                                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${type === 'Entreprise' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Building2 size={16} /> {t('enterprise')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('Particulier')}
                                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${type === 'Particulier' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <User size={16} /> {t('individual')}
                                </button>
                            </div>
                        </div>

                        {/* Fields specific to Enterprise */}
                        {type === 'Entreprise' && (
                            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                                <div>
                                    <label htmlFor="company" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('company')} <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="text" 
                                        id="company" 
                                        value={company} 
                                        onChange={(e) => setCompany(e.target.value)} 
                                        placeholder={language === 'es' ? "Ej: Mi Empresa S.L." : "Ex: Mon Entreprise SARL"}
                                        className="w-full" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="ice" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('ice')}</label>
                                    <input 
                                        type="text" 
                                        id="ice" 
                                        value={ice} 
                                        onChange={(e) => setIce(e.target.value)} 
                                        placeholder={language === 'es' ? "NIF / Identificador" : "Ex: 001588888000025"}
                                        className="w-full font-mono text-sm" 
                                    />
                                </div>
                            </div>
                        )}

                        {/* Common Fields */}
                        <div>
                            <label htmlFor="name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                                {type === 'Entreprise' ? t('contact') : t('name')} {type === 'Particulier' && <span className="text-rose-500">*</span>}
                            </label>
                            <input 
                                type="text" 
                                id="name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder={type === 'Entreprise' ? (language === 'es' ? "Ej: Responsable de contacto" : "Ex: M. Responsable") : (language === 'es' ? "Ej: Juan Pérez" : "Ex: Ahmed Alami")}
                                className="w-full" 
                                required={type === 'Particulier'}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('phone')}</label>
                                <input 
                                    type="text" 
                                    id="phone" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    className="w-full" 
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('email')}</label>
                                <input 
                                    type="email" 
                                    id="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="w-full" 
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                                <MapPin size={14} className="text-slate-400" /> {t('address')}
                            </label>
                            <textarea 
                                id="address" 
                                rows={2} 
                                value={address} 
                                onChange={(e) => setAddress(e.target.value)} 
                                className="w-full" 
                            />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
                    <button type="button" onClick={handleClose} className="btn-secondary">
                        {t('cancel')}
                    </button>
                    <button type="submit" form="clientForm" className="btn-primary">
                        <span>{isEditMode ? t('update') : t('save')}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddClientModal;
