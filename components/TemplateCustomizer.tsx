import React, { useState, useEffect } from 'react';
import { CompanySettings, DocumentColumn, NumberingConfig, DocumentLabels } from '../types';
import { CURRENCIES } from '../services/currencyService';
import { dbService } from '../db';
import { 
    Save, Upload, Building2, Palette, FileText, CheckCircle2, X, 
    ArrowUp, ArrowDown, LayoutTemplate, Briefcase, 
    CreditCard, MapPin, Globe, Mail, Phone, Hash, ShieldCheck, 
    Loader2, Type, Settings2, FileBarChart, Truck, ShoppingBag, 
    FileMinus, PencilLine, Eye, Trash2, Grid, 
    Check, Sparkles, RefreshCw, Copy, Layers, Sliders, CheckSquare,
    AlertCircle, HelpCircle, CheckCheck, Receipt, Store, Smartphone
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';

interface TemplateCustomizerProps {
    settings: CompanySettings | null;
    onSave: (settings: CompanySettings) => Promise<void>; 
}

const DEFAULT_COLUMNS: DocumentColumn[] = [
    { id: 'reference', label: 'Réf', visible: false, order: 0 },
    { id: 'name', label: 'Désignation', visible: true, order: 1 },
    { id: 'quantity', label: 'Qté', visible: true, order: 2 },
    { id: 'unit', label: 'Unité', visible: false, order: 3 },
    { id: 'unitPrice', label: 'P.U. HT', visible: true, order: 4 },
    { id: 'vat', label: 'TVA', visible: true, order: 5 },
    { id: 'total', label: 'Total HT', visible: true, order: 6 },
];

const DEFAULT_LABELS: DocumentLabels = {
    totalHt: 'Total HT',
    totalTax: 'Total TVA',
    totalNet: 'Net à Payer',
    amountInWordsPrefix: 'Arrêté le présent document à la somme de :',
    signatureSender: 'Signature Expéditeur',
    signatureRecipient: 'Signature & Cachet'
};

const COLOR_PRESETS = [
    { name: 'Émeraude (Défaut)', primary: '#10b981', tableBg: '#10b981', text: '#ffffff' },
    { name: 'Bleu Océan', primary: '#2563eb', tableBg: '#2563eb', text: '#ffffff' },
    { name: 'Indigo Royal', primary: '#6366f1', tableBg: '#4f46e5', text: '#ffffff' },
    { name: 'Teal Forest', primary: '#0d9488', tableBg: '#0f766e', text: '#ffffff' },
    { name: 'Pourpre Violet', primary: '#8b5cf6', tableBg: '#7c3aed', text: '#ffffff' },
    { name: 'Ambre Solaire', primary: '#d97706', tableBg: '#b45309', text: '#ffffff' },
    { name: 'Ardoise Sombre', primary: '#334155', tableBg: '#1e293b', text: '#ffffff' },
];

const createDefaultConfig = (prefix: string): NumberingConfig => ({
    prefix,
    yearFormat: 'YYYY',
    startNumber: 1,
    padding: 5,
    separator: '/'
});

type TabId = 'general' | 'legal' | 'branding' | 'documents';
type DocConfigType = 'invoice' | 'quote' | 'deliveryNote' | 'purchaseOrder' | 'creditNote';

const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({ settings, onSave }) => {
    const { t, isRTL, language } = useLanguage();
    const [localSettings, setLocalSettings] = useState<Partial<CompanySettings>>({ 
        showAmountInWords: true,
        showSignatureRecipient: false,
        priceDisplayMode: 'HT'
    });
    const [columns, setColumns] = useState<DocumentColumn[]>(DEFAULT_COLUMNS);
    const [showToast, setShowToast] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('general');
    const [activeDocType, setActiveDocType] = useState<DocConfigType>('invoice');
    const [copiedPreview, setCopiedPreview] = useState(false);

    useEffect(() => {
        const mergedSettings = settings ? { ...settings } : { 
            id: 'default',
            primaryColor: '#10b981', 
            showAmountInWords: true, 
            priceDisplayMode: 'HT' as const 
        } as CompanySettings;
        
        if (!mergedSettings.invoiceNumbering) mergedSettings.invoiceNumbering = createDefaultConfig('FAC');
        if (!mergedSettings.quoteNumbering) mergedSettings.quoteNumbering = createDefaultConfig('DEV');
        if (!mergedSettings.deliveryNoteNumbering) mergedSettings.deliveryNoteNumbering = createDefaultConfig('BL');
        if (!mergedSettings.purchaseOrderNumbering) mergedSettings.purchaseOrderNumbering = createDefaultConfig('BC');
        if (!mergedSettings.creditNoteNumbering) mergedSettings.creditNoteNumbering = createDefaultConfig('AVO');
        
        if (!mergedSettings.documentLabels) {
            mergedSettings.documentLabels = DEFAULT_LABELS;
        } else if (mergedSettings.documentLabels.signatureRecipient === 'Signature & Cachet Client') {
            mergedSettings.documentLabels.signatureRecipient = 'Signature & Cachet';
        }
        if (mergedSettings.showSignatureRecipient === undefined) mergedSettings.showSignatureRecipient = false;
        if (!mergedSettings.priceDisplayMode) mergedSettings.priceDisplayMode = 'HT';
        if (!mergedSettings.documentInfoPosition) mergedSettings.documentInfoPosition = 'right';
        if (mergedSettings.showExpiryDate === undefined) mergedSettings.showExpiryDate = true;
        if (!mergedSettings.logoWidth) mergedSettings.logoWidth = 200;
        if (!mergedSettings.backgroundLogoWidth) mergedSettings.backgroundLogoWidth = 450;
        if (!mergedSettings.stampWidth) mergedSettings.stampWidth = 220;
        if (!mergedSettings.headerTextColor) mergedSettings.headerTextColor = '#ffffff';
        if (!mergedSettings.tableHeaderBgColor) mergedSettings.tableHeaderBgColor = mergedSettings.primaryColor || '#10b981';
        if (mergedSettings.showTableBorders === undefined) mergedSettings.showTableBorders = true;
        if (!mergedSettings.clientPosition) mergedSettings.clientPosition = 'right';
        if (mergedSettings.defaultTva === undefined) mergedSettings.defaultTva = 20;

        if (settings?.backgroundLogo !== undefined) {
            mergedSettings.backgroundLogo = settings.backgroundLogo;
        }

        setLocalSettings(mergedSettings); 
        
        const isTTC = mergedSettings.priceDisplayMode === 'TTC';
        if (settings?.documentColumns && settings.documentColumns.length > 0) {
            const mergedColumns = DEFAULT_COLUMNS.map(defCol => {
                const savedCol = settings.documentColumns?.find(c => c.id === defCol.id);
                const col = savedCol || defCol;
                let label = col.label;
                if (isTTC) {
                    if (col.id === 'unitPrice') {
                        if (/H\.?T\.?/i.test(label)) label = label.replace(/H\.?T\.?/gi, 'TTC');
                        else if (!/TTC/i.test(label)) label = /prix/i.test(label) ? (label === label.toUpperCase() ? 'PRIX TTC' : 'Prix TTC') : 'P.U. TTC';
                    }
                    if (col.id === 'total') {
                        if (/H\.?T\.?/i.test(label)) label = label.replace(/H\.?T\.?/gi, 'TTC');
                        else if (!/TTC/i.test(label)) label = label === label.toUpperCase() ? 'TOTAL TTC' : 'Total TTC';
                    }
                }
                return { ...col, label };
            });
            setColumns(mergedColumns.sort((a, b) => a.order - b.order));
        } else {
            const baseCols = DEFAULT_COLUMNS.map(col => {
                let label = col.label;
                if (isTTC) {
                    if (col.id === 'unitPrice') label = 'P.U. TTC';
                    if (col.id === 'total') label = 'Total TTC';
                }
                return { ...col, label };
            });
            setColumns(baseCols);
        }
    }, [settings]);

    // Keyboard shortcut handler (Ctrl+S / Cmd+S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleManualSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [localSettings, columns]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleLabelChange = (field: keyof DocumentLabels, value: string) => {
        setLocalSettings(prev => ({
            ...prev,
            documentLabels: {
                ...(prev.documentLabels || DEFAULT_LABELS),
                [field]: value
            }
        }));
    };

    const handleNumberingChange = (type: DocConfigType, field: keyof NumberingConfig, value: string | number) => {
        const configKey = `${type}Numbering` as keyof CompanySettings;
        setLocalSettings(prev => ({
            ...prev,
            [configKey]: {
                ...(prev[configKey] as NumberingConfig),
                [field]: value
            }
        }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newLogo = reader.result as string;
                setLocalSettings(prev => ({ ...prev, logo: newLogo }));
            };
            reader.readAsDataURL(file);
        } else {
            alert(language === 'ar' ? 'يرجى اختيار صورة صحيحة' : "Veuillez sélectionner un fichier image valide.");
        }
    };

    const handleBackgroundLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newBgLogo = reader.result as string;
                try {
                    localStorage.setItem('facturago_background_logo', newBgLogo);
                } catch (_) {}
                setLocalSettings(prev => ({ ...prev, backgroundLogo: newBgLogo, showLogoWatermark: true }));
            };
            reader.readAsDataURL(file);
        } else {
            alert(language === 'ar' ? 'يرجى اختيار صورة صحيحة' : "Veuillez sélectionner un fichier image valide.");
        }
    };

    const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newStamp = reader.result as string;
                setLocalSettings(prev => ({ ...prev, stamp: newStamp }));
            };
            reader.readAsDataURL(file);
        } else {
            alert(language === 'ar' ? 'يرجى اختيار صورة صحيحة' : "Veuillez sélectionner un fichier image valide.");
        }
    };

    const handleRemoveLogo = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLocalSettings(prev => ({ ...prev, logo: null as any }));
    };

    const handleRemoveBackgroundLogo = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            localStorage.removeItem('facturago_background_logo');
        } catch (_) {}
        setLocalSettings(prev => ({ ...prev, backgroundLogo: '' }));
    };

    const handleRemoveStamp = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLocalSettings(prev => ({ ...prev, stamp: null as any }));
    };

    const toggleColumnVisibility = (id: string) => {
        const newColumns = columns.map(col => 
            col.id === id ? { ...col, visible: !col.visible } : col
        );
        setColumns(newColumns);
    };

    const updateColumnLabel = (id: string, label: string) => {
        setColumns(prev => prev.map(col => 
            col.id === id ? { ...col, label } : col
        ));
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === columns.length - 1) return;

        const newColumns = [...columns];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
        newColumns.forEach((col, idx) => col.order = idx + 1);
        setColumns(newColumns);
    };
    
    const handlePriceDisplayModeChange = (mode: 'HT' | 'TTC') => {
        setLocalSettings(prev => ({ ...prev, priceDisplayMode: mode }));
        setColumns(prev => prev.map(col => {
            let label = col.label;
            if (mode === 'TTC') {
                if (col.id === 'unitPrice') {
                    if (/H\.?T\.?/i.test(label)) {
                        label = label.replace(/H\.?T\.?/gi, 'TTC');
                    } else if (!/TTC/i.test(label)) {
                        label = /prix/i.test(label) ? (label === label.toUpperCase() ? 'PRIX TTC' : 'Prix TTC') : 'P.U. TTC';
                    }
                }
                if (col.id === 'total') {
                    if (/H\.?T\.?/i.test(label)) {
                        label = label.replace(/H\.?T\.?/gi, 'TTC');
                    } else if (!/TTC/i.test(label)) {
                        label = label === label.toUpperCase() ? 'TOTAL TTC' : 'Total TTC';
                    }
                }
            } else {
                if (col.id === 'unitPrice') {
                    if (/T\.?T\.?C\.?/i.test(label)) {
                        label = label.replace(/T\.?T\.?C\.?/gi, 'HT');
                    }
                }
                if (col.id === 'total') {
                    if (/T\.?T\.?C\.?/i.test(label)) {
                        label = label.replace(/T\.?T\.?C\.?/gi, 'HT');
                    }
                }
            }
            return { ...col, label };
        }));
    };

    const handleManualSave = async () => {
        setIsSaving(true);
        try {
            const isTTC = localSettings.priceDisplayMode === 'TTC';
            const syncedColumns = columns.map(col => {
                let label = col.label;
                if (isTTC) {
                    if (col.id === 'unitPrice' && /H\.?T\.?/i.test(label)) {
                        label = label.replace(/H\.?T\.?/gi, 'TTC');
                    }
                    if (col.id === 'total' && /H\.?T\.?/i.test(label)) {
                        label = label.replace(/H\.?T\.?/gi, 'TTC');
                    }
                } else {
                    if (col.id === 'unitPrice' && /T\.?T\.?C\.?/i.test(label)) {
                        label = label.replace(/T\.?T\.?C\.?/gi, 'HT');
                    }
                    if (col.id === 'total' && /T\.?T\.?C\.?/i.test(label)) {
                        label = label.replace(/T\.?T\.?C\.?/gi, 'HT');
                    }
                }
                return { ...col, label };
            });

            await onSave({ 
                ...localSettings as CompanySettings,
                documentColumns: syncedColumns
            });
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3500);
        } catch (error: any) {
            console.error("Save failed", error);
            alert(`Erreur de sauvegarde: ${error.message || "Vérifiez votre connexion"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const getPreviewNumber = (type: DocConfigType) => {
        const configKey = `${type}Numbering` as keyof CompanySettings;
        const cfg = localSettings[configKey] as NumberingConfig;
        if (!cfg) return '';
        const currentYear = new Date().getFullYear().toString();
        const year = cfg.yearFormat === 'YYYY' ? currentYear : (cfg.yearFormat === 'YY' ? currentYear.slice(-2) : '');
        const sep = cfg.separator || '/';
        const num = String(cfg.startNumber || 1).padStart(cfg.padding || 5, '0');
        return year ? `${cfg.prefix || ''}${sep}${year}${sep}${num}` : `${cfg.prefix || ''}${sep}${num}`;
    };

    const handleCopyPreview = () => {
        const text = getPreviewNumber(activeDocType);
        navigator.clipboard.writeText(text);
        setCopiedPreview(true);
        setTimeout(() => setCopiedPreview(false), 2000);
    };

    const tabs = [
        { 
            id: 'general', 
            label: language === 'ar' ? 'البيانات العامة' : (language === 'es' ? 'Datos y Contacto' : 'Coordonnées & Contact'), 
            icon: Building2, 
            badge: language === 'ar' ? 'الشركة' : 'Société',
            desc: language === 'ar' ? 'بيانات التواصل والعنوان' : (language === 'es' ? 'Datos generales de la empresa' : "Identité de l'entreprise & devises") 
        },
        { 
            id: 'legal', 
            label: language === 'ar' ? 'المعرفات القانونية' : (language === 'es' ? 'NIF / Fiscal' : 'Identifiants Fiscaux'), 
            icon: ShieldCheck, 
            badge: 'ICE / RC',
            desc: language === 'ar' ? 'ICE, RC, IF, الضريبة' : (language === 'es' ? 'Identificadores legales' : 'ICE, RC, IF, Patente & CNSS') 
        },
        { 
            id: 'branding', 
            label: language === 'ar' ? 'الهوية والشعار' : (language === 'es' ? 'Logo y Colores' : 'Logos, Filigrane & Couleurs'), 
            icon: Palette, 
            badge: language === 'ar' ? 'المظهر' : 'Design',
            desc: language === 'ar' ? 'الشعار الرئيسي، الختم والألوان' : (language === 'es' ? 'Logotipos, fondo y paleta' : 'Logo en-tête, filigrane, cachet & thèmes') 
        },
        { 
            id: 'documents', 
            label: language === 'ar' ? 'إعدادات المستندات' : (language === 'es' ? 'Documentos' : 'Structure & Numérotation'), 
            icon: FileText, 
            badge: 'PDF',
            desc: language === 'ar' ? 'الترقيم، الأعمدة والنصوص' : (language === 'es' ? 'Numeración y plantillas PDF' : 'Numérotation, colonnes, affichage & pied de page') 
        },
    ];

    const docTypes: { id: DocConfigType, label: string, icon: any, color: string }[] = [
        { id: 'invoice', label: language === 'ar' ? 'فواتير' : t('invoices'), icon: FileText, color: 'emerald' },
        { id: 'quote', label: language === 'ar' ? 'عروض أسعار' : t('quotes'), icon: FileBarChart, color: 'blue' },
        { id: 'deliveryNote', label: language === 'ar' ? 'وصول تسليم' : (language === 'es' ? 'Albaranes' : 'Bons de Livraison'), icon: Truck, color: 'amber' },
        { id: 'purchaseOrder', label: language === 'ar' ? 'طلبات شراء' : (language === 'es' ? 'Pedidos' : 'Bons de Commande'), icon: ShoppingBag, color: 'purple' },
        { id: 'creditNote', label: language === 'ar' ? 'إشعارات دائنة' : t('creditNotes'), icon: FileMinus, color: 'rose' },
    ];

    const currentDocConfigKey = `${activeDocType}Numbering` as keyof CompanySettings;
    const currentDocConfig = (localSettings[currentDocConfigKey] as NumberingConfig) || createDefaultConfig('DOC');
    const currentLabels = localSettings.documentLabels || DEFAULT_LABELS;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 animate-fadeIn">
            {/* Floating Toast Notification */}
            <div className={`fixed bottom-6 right-6 z-[9999] transform transition-all duration-400 ease-out ${showToast ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95 pointer-events-none'}`}>
                <div className="bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3.5 min-w-[320px] max-w-md border border-slate-700/80 backdrop-blur-xl">
                    <div className="w-9 h-9 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white tracking-tight">
                            {language === 'ar' ? 'تم الحفظ بنجاح' : (language === 'es' ? 'Cambios guardados' : 'Modifications enregistrées')}
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5 truncate">
                            {language === 'ar' ? 'تم تحديث جميع إعدادات النظام وقوالب PDF.' : (language === 'es' ? 'Sus ajustes han sido actualizados.' : 'Vos paramètres et modèles ont été synchronisés.')}
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowToast(false)} 
                        className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Standardized Header matching all views */}
            <Header 
                title={language === 'ar' ? 'الإعدادات والقوالب' : (language === 'es' ? 'Ajustes y Plantillas' : 'Paramètres & Modèles')}
                subtitle={language === 'ar' 
                    ? 'تخصيص هوية شركتك، الأختام، الألوان، الترقيم وتصميم الفواتير والمستندات' 
                    : 'Configurez les coordonnées de votre société, vos identifiants légaux, logos, filigranes et numérotation.'}
            >
                <div className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100/90 text-slate-500 text-xs font-mono border border-slate-200">
                        <span>Ctrl + S</span>
                    </div>
                    <button 
                        type="button"
                        onClick={handleManualSave} 
                        disabled={isSaving}
                        className="btn-primary px-3.5 py-2.5 whitespace-nowrap"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{language === 'ar' ? 'جاري الحفظ...' : (language === 'es' ? 'Guardando...' : 'Enregistrement...')}</span>
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                <span>{language === 'ar' ? 'حفظ التغييرات' : (language === 'es' ? 'Guardar' : 'Enregistrer')}</span>
                            </>
                        )}
                    </button>
                </div>
            </Header>

            {/* Layout Grid: Sidebar Navigation Tabs + Main Form Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Navigation Card */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-xs sticky top-6 space-y-1.5">
                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {language === 'ar' ? 'أقسام الإعدادات' : 'Sections'}
                        </div>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabId)}
                                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-200 text-left group relative ${
                                        isActive 
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold' 
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                        isActive 
                                        ? 'bg-white/20 text-white shadow-inner' 
                                        : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-emerald-600 group-hover:shadow-xs'
                                    }`}>
                                        <Icon size={19} />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left rtl:text-right">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-sm truncate">{tab.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold uppercase tracking-wider ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        </div>
                                        <p className={`text-xs mt-0.5 truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                                            {tab.desc}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="lg:col-span-8 xl:col-span-9 min-w-0">
                    <AnimatePresence mode="wait">
                        {/* TAB 1: GENERAL & CONTACT */}
                        {activeTab === 'general' && (
                            <motion.div 
                                key="general"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold border border-blue-200/50">
                                            <Building2 size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'المعلومات العامة وبيانات الاتصال' : (language === 'es' ? 'Datos Generales' : 'Informations Générales de l’Entreprise')}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'تظهر هذه المعلومات في رأس وتذييل جميع الفواتير والمستندات.' : "Ces informations apparaîtront dans l'en-tête de vos devis, factures et bons de livraison."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <InputField 
                                                icon={Briefcase} 
                                                label={language === 'ar' ? 'اسم الشركة أو النشاط' : t('company')} 
                                                name="companyName" 
                                                value={localSettings.companyName || ''} 
                                                onChange={handleInputChange} 
                                                placeholder="Ex: Facturago SARL" 
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <TextAreaField 
                                                icon={MapPin} 
                                                label={language === 'ar' ? 'العنوان الكامل' : t('address')} 
                                                name="address" 
                                                value={localSettings.address || ''} 
                                                onChange={handleInputChange} 
                                                rows={3} 
                                                placeholder="Ex: 123 Boulevard Mohammed V, Étage 2, Casablanca" 
                                            />
                                        </div>
                                        <InputField 
                                            icon={Phone} 
                                            label={language === 'ar' ? 'الهاتف' : t('phone')} 
                                            name="phone" 
                                            value={localSettings.phone || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="+212 600-000000" 
                                        />
                                        <InputField 
                                            icon={Mail} 
                                            label={language === 'ar' ? 'البريد الإلكتروني' : t('email')} 
                                            name="email" 
                                            type="email" 
                                            value={localSettings.email || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="contact@votre-entreprise.com" 
                                        />
                                        <InputField 
                                            icon={Globe} 
                                            label={language === 'ar' ? 'الموقع الإلكتروني' : "Site Web"} 
                                            name="website" 
                                            value={localSettings.website || ''} 
                                            onChange={handleInputChange} 
                                            className="md:col-span-2" 
                                            placeholder="www.votre-entreprise.ma" 
                                        />

                                        {/* Default Currency */}
                                        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-2">
                                            <label htmlFor="defaultCurrencyCode" className="block text-sm font-bold text-slate-800">
                                                {language === 'ar' ? 'العملة الافتراضية' : (language === 'es' ? 'Moneda por defecto' : 'Devise principale par défaut')}
                                            </label>
                                            <p className="text-xs text-slate-500">
                                                {language === 'ar' ? 'العملة المستعملة لحساب المجاميع وإنشاء الفواتير.' : 'Devise utilisée par défaut dans tous les nouveaux documents.'}
                                            </p>
                                            <div className="relative pt-1">
                                                <select
                                                    id="defaultCurrencyCode"
                                                    name="defaultCurrencyCode"
                                                    value={localSettings.defaultCurrencyCode || 'MAD'}
                                                    onChange={handleInputChange}
                                                    className="block w-full rounded-xl border border-slate-200 bg-white shadow-xs focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium text-slate-800 py-2.5 px-3 transition-all"
                                                >
                                                    {CURRENCIES.map(c => (
                                                        <option key={c.code} value={c.code}>{c.code} — {c.pluralNameFr}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Default VAT */}
                                        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-2">
                                            <label htmlFor="defaultTva" className="block text-sm font-bold text-slate-800">
                                                {language === 'ar' ? 'نسبة الضريبة على القيمة المضافة الافتراضية (%)' : 'Taux de TVA par défaut (%)'}
                                            </label>
                                            <p className="text-xs text-slate-500">
                                                {language === 'ar' ? 'النسبة المطبقة تلقائياً عند إضافة سطور جديدة.' : 'Appliqué automatiquement lors de la saisie de nouveaux articles.'}
                                            </p>
                                            <div className="flex items-center gap-3 pt-1">
                                                <input
                                                    type="number"
                                                    id="defaultTva"
                                                    name="defaultTva"
                                                    value={localSettings.defaultTva ?? 20}
                                                    onChange={(e) => setLocalSettings(prev => ({ ...prev, defaultTva: parseInt(e.target.value) || 0 }))}
                                                    className="block w-28 rounded-xl border border-slate-200 bg-white shadow-xs focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm font-bold text-slate-800 py-2.5 px-3 transition-all text-center"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                />
                                                <div className="flex flex-wrap gap-1.5">
                                                    {[0, 7, 10, 14, 20].map(rate => (
                                                        <button
                                                            key={rate}
                                                            type="button"
                                                            onClick={() => setLocalSettings(prev => ({ ...prev, defaultTva: rate }))}
                                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                                (localSettings.defaultTva ?? 20) === rate
                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                                            }`}
                                                        >
                                                            {rate}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 2: LEGAL IDENTIFIERS */}
                        {activeTab === 'legal' && (
                            <motion.div 
                                key="legal"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold border border-purple-200/50">
                                            <ShieldCheck size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'المعرفات القانونية والضريبية' : (language === 'es' ? 'Identificadores Legales' : 'Identifiants Fiscaux & Légaux')}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'أرقام التعريف القانونية التي تفرض في الفواتير الرسمية.' : 'Ces numéros légaux sont automatiquement intégrés dans les mentions de bas de page de vos PDF.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <InputField 
                                            icon={Hash} 
                                            label={language === 'es' ? 'N.I.F / I.C.E' : 'I.C.E (Identifiant Commun)'} 
                                            name="ice" 
                                            value={localSettings.ice || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="Ex: 001234567000089" 
                                        />
                                        <InputField 
                                            icon={Hash} 
                                            label="R.C (Registre de Commerce)" 
                                            name="rc" 
                                            value={localSettings.rc || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="Ex: 45678 Casablanca" 
                                        />
                                        <InputField 
                                            icon={Hash} 
                                            label="I.F (Identifiant Fiscal)" 
                                            name="fiscalId" 
                                            value={localSettings.fiscalId || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="Ex: 12345678" 
                                        />
                                        <InputField 
                                            icon={Hash} 
                                            label="T.P / Patente" 
                                            name="patente" 
                                            value={localSettings.patente || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="Ex: 34567890" 
                                        />
                                        <InputField 
                                            icon={Hash} 
                                            label="N° CNSS" 
                                            name="cnss" 
                                            value={localSettings.cnss || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="Ex: 7890123" 
                                        />
                                        <InputField 
                                            icon={Hash} 
                                            label="Capital Social" 
                                            name="capital" 
                                            value={localSettings.capital || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="Ex: 100 000 MAD" 
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 3: BRANDING, LOGOS, FILIGRANE & COLORS */}
                        {activeTab === 'branding' && (
                            <motion.div 
                                key="branding"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 flex items-center justify-center font-bold border border-pink-200/50">
                                            <Palette size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'الهوية البصرية والعلامة التجارية' : (language === 'es' ? 'Identidad Visual' : 'Logos, Filigrane & Identité Visuelle')}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'تحميل الشعار الرئيسي، خلفية المستند (Filigrane) والختم الرقمي.' : 'Gérez vos logos en en-tête, filigranes transparents et cachets pour vos documents imprimés.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3 Dedicated Modern Cards for Logos & Stamp */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* 1. Primary Header Logo */}
                                        <div className="flex flex-col bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 relative">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                                    <span>1. Logo En-tête</span>
                                                </label>
                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                    Header
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-4 min-h-[32px]">
                                                {language === 'ar' ? 'يظهر في أعلى الفاتورة أو العرض.' : "S'affiche dans le coin supérieur de vos factures et devis."}
                                            </p>
                                            
                                            <div className="group relative w-full border-2 border-dashed border-slate-300 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden min-h-[10rem] py-3 bg-white shadow-2xs">
                                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} />
                                                {localSettings.logo ? (
                                                    <div className="relative w-full p-4 flex items-center justify-center overflow-hidden min-h-[10rem]">
                                                        <img 
                                                            src={localSettings.logo} 
                                                            alt="Logo Principal" 
                                                            className="object-contain transition-all duration-150 max-h-24" 
                                                            style={{ width: `${localSettings.logoWidth || 200}px`, maxWidth: '100%' }}
                                                        />
                                                        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-2xs">
                                                            <span className="text-white text-xs font-semibold flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg">
                                                                <Upload size={14}/> {language === 'ar' ? 'تغيير' : 'Changer'}
                                                            </span>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={handleRemoveLogo}
                                                            className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-full z-20 shadow-md transition-all border border-slate-200 duration-150 hover:scale-105 active:scale-95"
                                                            title="Supprimer le logo"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                            <Upload size={20} />
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-700">{language === 'ar' ? 'تحميل الشعار' : 'Importer le logo'}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG</p>
                                                    </div>
                                                )}
                                            </div>

                                            {localSettings.logo && (
                                                <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                            {language === 'ar' ? 'عرض الشعار' : 'Largeur du logo'}
                                                        </span>
                                                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                            {localSettings.logoWidth || 200}px
                                                        </span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="50" 
                                                        max="500" 
                                                        step="10"
                                                        value={localSettings.logoWidth || 200} 
                                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, logoWidth: parseInt(e.target.value) }))}
                                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. Background Logo (Watermark / Filigrane) */}
                                        <div className="flex flex-col bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100 relative">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                                    <span>2. Filigrane Fond</span>
                                                </label>
                                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                    Watermark
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-4 min-h-[32px]">
                                                {language === 'ar' ? 'يظهر شفافاً في مركز صفحات PDF.' : "Centré en filigrane discret au milieu de chaque page."}
                                            </p>
                                            
                                            <div className="group relative w-full border-2 border-dashed border-indigo-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden min-h-[10rem] py-3 bg-white shadow-2xs">
                                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/png, image/jpeg, image/svg+xml" onChange={handleBackgroundLogoChange} />
                                                {localSettings.backgroundLogo ? (
                                                    <div className="relative w-full p-4 flex items-center justify-center overflow-hidden min-h-[10rem]">
                                                        <img 
                                                            src={localSettings.backgroundLogo} 
                                                            alt="Logo d'Arrière-plan" 
                                                            className="object-contain transition-all duration-150 max-h-24" 
                                                            style={{ 
                                                                opacity: Math.max(0.25, (localSettings.logoWatermarkOpacity ?? 0.07) * 3),
                                                                maxWidth: '100%' 
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-2xs">
                                                            <span className="text-white text-xs font-semibold flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg">
                                                                <Upload size={14}/> {language === 'ar' ? 'تغيير' : 'Changer'}
                                                            </span>
                                                        </div>
                                                        {localSettings.backgroundLogo && (
                                                            <button 
                                                                type="button"
                                                                onClick={handleRemoveBackgroundLogo}
                                                                className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-full z-20 shadow-md transition-all border border-slate-200 duration-150 hover:scale-105 active:scale-95"
                                                                title="Supprimer le filigrane"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-2 text-indigo-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                            <Upload size={20} />
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-700">{language === 'ar' ? 'تحميل الشعار الشفاف' : 'Importer le filigrane'}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">PNG transparent</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Watermark Controls */}
                                            <div className="mt-4 p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {language === 'ar' ? 'تفعيل الشعار في الخلفية' : 'Activer en arrière-plan'}
                                                    </span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setLocalSettings(prev => ({ ...prev, showLogoWatermark: !(prev.showLogoWatermark ?? true) }))}
                                                        className={`w-10 h-6 rounded-full flex items-center transition-colors duration-300 px-0.5 ${(localSettings.showLogoWatermark ?? true) ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                                    >
                                                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                                                    </button>
                                                </div>

                                                {(localSettings.showLogoWatermark ?? true) && (
                                                    <div className="pt-2 border-t border-slate-100 space-y-3">
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                                    {language === 'ar' ? 'الحجم' : 'Largeur'}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                    {localSettings.backgroundLogoWidth || 450}px
                                                                </span>
                                                            </div>
                                                            <input 
                                                                type="range" 
                                                                min="100" 
                                                                max="750" 
                                                                step="10" 
                                                                value={localSettings.backgroundLogoWidth || 450} 
                                                                onChange={(e) => setLocalSettings(prev => ({ ...prev, backgroundLogoWidth: parseInt(e.target.value) }))}
                                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                                    {language === 'ar' ? 'الشفافية' : 'Opacité'}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                    {Math.round((localSettings.logoWatermarkOpacity ?? 0.07) * 100)}%
                                                                </span>
                                                            </div>
                                                            <input 
                                                                type="range" 
                                                                min="0.01" 
                                                                max="0.30" 
                                                                step="0.01" 
                                                                value={localSettings.logoWatermarkOpacity ?? 0.07} 
                                                                onChange={(e) => setLocalSettings(prev => ({ ...prev, logoWatermarkOpacity: parseFloat(e.target.value) }))}
                                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Cachet & Signature */}
                                        <div className="flex flex-col bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 relative">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                                    <span>3. Cachet & Signature</span>
                                                </label>
                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                    Footer
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-4 min-h-[32px]">
                                                {language === 'ar' ? 'يظهر في مربع توقيع واعتماد الشركة أسفل الفاتورة.' : "S'affiche dans la zone de validation et signature en bas de page."}
                                            </p>
                                            
                                            <div className="group relative w-full border-2 border-dashed border-slate-300 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden min-h-[10rem] py-3 bg-white shadow-2xs">
                                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/png, image/jpeg, image/svg+xml" onChange={handleStampChange} />
                                                {localSettings.stamp ? (
                                                    <div className="relative w-full p-4 flex items-center justify-center overflow-hidden min-h-[10rem]">
                                                        <img 
                                                            src={localSettings.stamp} 
                                                            alt="Cachet" 
                                                            className="object-contain transition-all duration-150 max-h-24" 
                                                            style={{ width: `${localSettings.stampWidth || 220}px`, maxWidth: '100%' }}
                                                        />
                                                        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-2xs">
                                                            <span className="text-white text-xs font-semibold flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg">
                                                                <Upload size={14}/> {language === 'ar' ? 'تغيير' : 'Changer'}
                                                            </span>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={handleRemoveStamp}
                                                            className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-full z-20 shadow-md transition-all border border-slate-200 duration-150 hover:scale-105 active:scale-95"
                                                            title="Supprimer le cachet"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                            <Upload size={20} />
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-700">{language === 'ar' ? 'تحميل الختم' : 'Importer le cachet'}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">PNG transparent</p>
                                                    </div>
                                                )}
                                            </div>

                                            {localSettings.stamp && (
                                                <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                            {language === 'ar' ? 'عرض الختم' : 'Largeur du cachet'}
                                                        </span>
                                                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                            {localSettings.stampWidth || 220}px
                                                        </span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="50" 
                                                        max="500" 
                                                        step="10"
                                                        value={localSettings.stampWidth || 220} 
                                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, stampWidth: parseInt(e.target.value) }))}
                                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Color Studio Section */}
                                    <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-base font-bold text-slate-900">
                                                    {language === 'ar' ? 'لوحة الألوان وتصميم الجداول' : 'Thème de Couleur & Style des Tableaux'}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {language === 'ar' ? 'اختر نسق الألوان الجاهز أو حدد كود اللون المفضل لشركتك.' : 'Personnalisez la couleur des en-têtes et éléments graphiques de vos documents.'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Presets */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                            {COLOR_PRESETS.map(preset => {
                                                const isCurrent = (localSettings.primaryColor || '#10b981').toLowerCase() === preset.primary.toLowerCase();
                                                return (
                                                    <button
                                                        key={preset.name}
                                                        type="button"
                                                        onClick={() => setLocalSettings(prev => ({
                                                            ...prev,
                                                            primaryColor: preset.primary,
                                                            tableHeaderBgColor: preset.tableBg,
                                                            headerTextColor: preset.text
                                                        }))}
                                                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                                                            isCurrent 
                                                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 shadow-xs' 
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="w-full h-8 rounded-xl mb-2 flex items-center justify-center shadow-inner" style={{ backgroundColor: preset.primary }}>
                                                            {isCurrent && <Check size={16} className="text-white" />}
                                                        </div>
                                                        <div className="text-[11px] font-bold text-slate-800 truncate">{preset.name}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Custom Pickers */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                                                <label htmlFor="primaryColor" className="block text-xs font-bold text-slate-700">
                                                    {language === 'ar' ? 'اللون الرئيسي' : 'Couleur Principale (Titres)'}
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative overflow-hidden w-11 h-11 rounded-xl shadow-xs ring-2 ring-white shrink-0 border border-slate-200">
                                                        <input 
                                                            type="color" 
                                                            id="primaryColor" 
                                                            name="primaryColor" 
                                                            value={localSettings.primaryColor || '#10b981'} 
                                                            onChange={handleInputChange} 
                                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0" 
                                                        />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={localSettings.primaryColor || '#10b981'} 
                                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                                                        className="w-full text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 bg-white py-2.5 px-3 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-800" 
                                                        placeholder="#10B981"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                                                <label htmlFor="tableHeaderBgColor" className="block text-xs font-bold text-slate-700">
                                                    {language === 'ar' ? 'خلفية رأس الجدول' : "Fond d'en-tête de tableau"}
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative overflow-hidden w-11 h-11 rounded-xl shadow-xs ring-2 ring-white shrink-0 border border-slate-200">
                                                        <input 
                                                            type="color" 
                                                            id="tableHeaderBgColor" 
                                                            name="tableHeaderBgColor" 
                                                            value={localSettings.tableHeaderBgColor || '#10b981'} 
                                                            onChange={handleInputChange} 
                                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0" 
                                                        />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={localSettings.tableHeaderBgColor || '#10b981'} 
                                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, tableHeaderBgColor: e.target.value }))}
                                                        className="w-full text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 bg-white py-2.5 px-3 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-800" 
                                                        placeholder="#10B981"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                                                <label htmlFor="headerTextColor" className="block text-xs font-bold text-slate-700">
                                                    {language === 'ar' ? 'لون نص رأس الجدول' : "Texte d'en-tête de tableau"}
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative overflow-hidden w-11 h-11 rounded-xl shadow-xs ring-2 ring-white shrink-0 border border-slate-200">
                                                        <input 
                                                            type="color" 
                                                            id="headerTextColor" 
                                                            name="headerTextColor" 
                                                            value={localSettings.headerTextColor || '#ffffff'} 
                                                            onChange={handleInputChange} 
                                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0" 
                                                        />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={localSettings.headerTextColor || '#ffffff'} 
                                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, headerTextColor: e.target.value }))}
                                                        className="w-full text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 bg-white py-2.5 px-3 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-800" 
                                                        placeholder="#FFFFFF"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Live Mini Table Preview */}
                                        <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Eye size={14} />
                                                <span>Aperçu du tableau PDF en direct</span>
                                            </div>
                                            <div className="overflow-hidden rounded-xl border border-slate-700 text-xs">
                                                <div 
                                                    className="px-4 py-2.5 font-bold flex justify-between items-center" 
                                                    style={{ 
                                                        backgroundColor: localSettings.tableHeaderBgColor || '#10b981', 
                                                        color: localSettings.headerTextColor || '#ffffff' 
                                                    }}
                                                >
                                                    <span>Désignation</span>
                                                    <span>Qté</span>
                                                    <span>{localSettings.priceDisplayMode === 'TTC' ? 'P.U. TTC' : 'P.U. HT'}</span>
                                                    <span>{localSettings.priceDisplayMode === 'TTC' ? 'Total TTC' : 'Total HT'}</span>
                                                </div>
                                                <div className="bg-slate-800/80 px-4 py-2.5 flex justify-between items-center text-slate-300">
                                                    <span>Prestation de service & Développement</span>
                                                    <span>1</span>
                                                    <span>15 000,00 MAD</span>
                                                    <span className="font-bold text-emerald-400">15 000,00 MAD</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 4: DOCUMENTS, NUMBERING & STRUCTURE */}
                        {activeTab === 'documents' && (
                            <motion.div 
                                key="documents"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {/* 1. Numbering Configurator */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200/50">
                                            <Settings2 size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'تنسيق وترقيم المستندات' : 'Configuration de la Numérotation'}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'تخصيص البادئة، الفاصل، تنسيق السنة وتسلسل الأرقام لكل نوع وثيقة.' : 'Personnalisez le préfixe, le séparateur et le compteur automatique pour chaque type de document.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Document Type Selector Bar */}
                                    <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
                                        {docTypes.map((type) => {
                                            const Icon = type.icon;
                                            const isActive = activeDocType === type.id;
                                            return (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setActiveDocType(type.id)}
                                                    className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                                                        isActive
                                                            ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200'
                                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                                    }`}
                                                >
                                                    <Icon size={16} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                                                    <span>{type.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Live Formatting Form */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                                                {language === 'ar' ? 'البادئة' : 'Préfixe'}
                                            </label>
                                            <input 
                                                type="text" 
                                                value={currentDocConfig.prefix || ''} 
                                                onChange={(e) => handleNumberingChange(activeDocType, 'prefix', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-bold uppercase text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                                placeholder="EX: FAC"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                                                {language === 'ar' ? 'الفاصل' : 'Séparateur'}
                                            </label>
                                            <input 
                                                type="text" 
                                                value={currentDocConfig.separator || '/'} 
                                                onChange={(e) => handleNumberingChange(activeDocType, 'separator', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-bold text-center text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                                placeholder="/"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                                                {language === 'ar' ? 'تنسيق السنة' : 'Format Année'}
                                            </label>
                                            <select 
                                                value={currentDocConfig.yearFormat} 
                                                onChange={(e) => handleNumberingChange(activeDocType, 'yearFormat', e.target.value as any)}
                                                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                            >
                                                <option value="YYYY">2026 (YYYY)</option>
                                                <option value="YY">26 (YY)</option>
                                                <option value="NONE">{language === 'ar' ? 'بدون سنة' : 'Aucun'}</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                                                {language === 'ar' ? 'رقم البداية' : 'Numéro de départ'}
                                            </label>
                                            <input 
                                                type="number" 
                                                value={currentDocConfig.startNumber} 
                                                onChange={(e) => handleNumberingChange(activeDocType, 'startNumber', parseInt(e.target.value) || 1)}
                                                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                                min="1"
                                            />
                                        </div>
                                    </div>

                                    {/* Number Padding Slider */}
                                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700">
                                                {language === 'ar' ? 'عدد الأصفار (Padding)' : 'Nombre de zéros de remplissage'}
                                            </span>
                                            <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {currentDocConfig.padding} chiffres
                                            </span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="8" 
                                            value={currentDocConfig.padding} 
                                            onChange={(e) => handleNumberingChange(activeDocType, 'padding', parseInt(e.target.value) || 5)}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                        />
                                    </div>

                                    {/* Preview Box Ticket */}
                                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1.5">
                                                <Sparkles size={14} />
                                                <span>Aperçu en direct • {docTypes.find(d => d.id === activeDocType)?.label}</span>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider">
                                                {getPreviewNumber(activeDocType)}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCopyPreview}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 active:scale-95"
                                        >
                                            {copiedPreview ? <CheckCheck size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                            <span>{copiedPreview ? 'Copié !' : 'Copier format'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 2. Pricing Mode (HT vs TTC) */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200/50">
                                            <Eye size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'طريقة عرض الأسعار' : t('priceDisplayMode')}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'اختر طريقة حساب وعرض أسعار الوحدات في جداول الفواتير.' : 'Choisissez si vos tableaux PDF affichent les prix unitaires en Hors Taxe (HT) ou Tout Compris (TTC).'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button 
                                            type="button"
                                            onClick={() => handlePriceDisplayModeChange('HT')}
                                            className={`p-5 rounded-2xl border-2 transition-all text-left rtl:text-right relative ${
                                                localSettings.priceDisplayMode === 'HT' 
                                                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs' 
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="font-bold text-sm text-slate-900">
                                                    {language === 'ar' ? 'وضع الشركات الكلاسيكي (HT)' : 'Mode Classique (HT)'}
                                                </div>
                                                {localSettings.priceDisplayMode === 'HT' && (
                                                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                                        <Check size={12} />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {language === 'ar' ? 'يعرض P.U. HT والمجموع HT في الجدول مع حساب TVA في الأسفل. مناسب للتعامل بين الشركات (B2B).' : 'Affiche P.U. HT et Total HT dans le tableau avec calcul TVA au récapitulatif. Recommandé B2B.'}
                                            </p>
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={() => handlePriceDisplayModeChange('TTC')}
                                            className={`p-5 rounded-2xl border-2 transition-all text-left rtl:text-right relative ${
                                                localSettings.priceDisplayMode === 'TTC' 
                                                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs' 
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="font-bold text-sm text-slate-900">
                                                    {language === 'ar' ? 'الوضع المباشر الشامل (TTC)' : 'Mode Simplifié (TTC)'}
                                                </div>
                                                {localSettings.priceDisplayMode === 'TTC' && (
                                                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                                        <Check size={12} />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {language === 'ar' ? 'يعرض الأسعار شاملة للضريبة مباشرة في كل سطر. مناسب لخدمة الأفراد والبيع المباشر (B2C).' : 'Affiche directement les montants Toutes Taxes Comprises (TTC) par article. Idéal pour particuliers.'}
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                {/* Thermal Ticket Printer Width Preference */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200/50">
                                            <Receipt size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'طابعة التذاكر الحرارية الافتراضية (Ticket de Caisse)' : 'Format Imprimante Thermique (Ticket de Caisse)'}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'حدد قياس رول الورق الافتراضي عند طباعة التذاكر للزبائن.' : 'Définissez la largeur de rouleau par défaut pour vos tickets de caisse.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setLocalSettings(prev => ({ ...prev, defaultThermalTicketWidth: '80mm' }))}
                                            className={`p-4 rounded-2xl border text-left transition-all relative ${
                                                (localSettings.defaultThermalTicketWidth || '80mm') === '80mm'
                                                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/20'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-2 rounded-xl ${(localSettings.defaultThermalTicketWidth || '80mm') === '80mm' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                        <Store size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-900">80 mm (Standard POS)</div>
                                                        <div className="text-[11px] text-emerald-700 font-semibold">Rouleau 3 pouces</div>
                                                    </div>
                                                </div>
                                                {(localSettings.defaultThermalTicketWidth || '80mm') === '80mm' && (
                                                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                                        <Check size={12} />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {language === 'ar' ? 'القياس الأكثر شيوعاً لطابعات الكاشيه والمتاجر (Epson TM-T20, Xprinter, Bixolon).' : 'Le standard pour imprimantes de caisse fixes en magasin et commerce.'}
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setLocalSettings(prev => ({ ...prev, defaultThermalTicketWidth: '58mm' }))}
                                            className={`p-4 rounded-2xl border text-left transition-all relative ${
                                                localSettings.defaultThermalTicketWidth === '58mm'
                                                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/20'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-2 rounded-xl ${localSettings.defaultThermalTicketWidth === '58mm' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                        <Smartphone size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-900">58 mm (Compact POS)</div>
                                                        <div className="text-[11px] text-emerald-700 font-semibold">Rouleau 2 pouces</div>
                                                    </div>
                                                </div>
                                                {localSettings.defaultThermalTicketWidth === '58mm' && (
                                                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                                        <Check size={12} />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {language === 'ar' ? 'مناسب للطابعات الصغيرة المحمولة وبلوتوث وتطبيقات التوصيل (POS-58, Goojprt).' : 'Idéal pour mini imprimantes portables Bluetooth, livreurs et petits espaces.'}
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                {/* 3. Custom Labels */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold border border-amber-200/50">
                                            <PencilLine size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'عناوين ونصوص مخصصة في المستندات' : t('customLabels')}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'تعديل التسميات المطبوعة في جداول الحسابات والتوقيعات.' : 'Personnalisez les intitulés de totaux, signatures et phrases de clôture.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <InputField 
                                            label={t('labelTotalHt')} 
                                            value={currentLabels.totalHt || ''} 
                                            onChange={(e: any) => handleLabelChange('totalHt', e.target.value)} 
                                            placeholder="Ex: Total Hors Taxes" 
                                        />
                                        <InputField 
                                            label={t('labelTotalTax')} 
                                            value={currentLabels.totalTax || ''} 
                                            onChange={(e: any) => handleLabelChange('totalTax', e.target.value)} 
                                            placeholder="Ex: Total TVA (20%)" 
                                        />
                                        <InputField 
                                            label={t('labelTotalNet')} 
                                            value={currentLabels.totalNet || ''} 
                                            onChange={(e: any) => handleLabelChange('totalNet', e.target.value)} 
                                            placeholder="Ex: Net à Payer TTC" 
                                        />
                                        <InputField 
                                            label={t('labelSignatureRecipient')} 
                                            value={currentLabels.signatureRecipient || ''} 
                                            onChange={(e: any) => handleLabelChange('signatureRecipient', e.target.value)} 
                                            placeholder="Ex: Signature & Cachet Client" 
                                        />
                                        <InputField 
                                            label={t('labelAmountWordsPrefix')} 
                                            value={currentLabels.amountInWordsPrefix || ''} 
                                            onChange={(e: any) => handleLabelChange('amountInWordsPrefix', e.target.value)} 
                                            placeholder="Ex: Arrêté le présent document à la somme de :" 
                                            className="md:col-span-2"
                                        />
                                    </div>
                                </div>

                                {/* 4. Display Toggles & Options */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold border border-teal-200/50">
                                            <LayoutTemplate size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'خيارات العرض والمواضع' : 'Options de Mise en Page & Affichage'}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'التحكم في ظهور المبالغ بالحروف، مربع التوقيع وموضع عنوان العميل.' : 'Activez ou masquez des blocs complémentaires sur vos impressions PDF.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Toggle Amount in Words */}
                                        <div className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-2xs border border-slate-200">
                                                    <Type size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">
                                                        {language === 'ar' ? 'كتابة المجموع بالحروف' : 'Montant en toutes lettres'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {language === 'ar' ? 'إظهار المبلغ الإجمالي مكتوباً بالأحرف في أسفل الوثيقة.' : 'Affiche la somme totale écrite en lettres en bas du document.'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setLocalSettings(prev => ({ ...prev, showAmountInWords: !prev.showAmountInWords }))}
                                                className={`w-11 h-6 rounded-full flex items-center transition-colors duration-300 px-0.5 ${localSettings.showAmountInWords ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                            >
                                                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                                            </button>
                                        </div>

                                        {/* Toggle Signature Recipient */}
                                        <div className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-2xs border border-slate-200">
                                                    <PencilLine size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">
                                                        {language === 'ar' ? 'مربع توقيع المستلم / العميل' : 'Section Signature Destinataire'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {language === 'ar' ? 'إظهار خانة مخصصة لتوقيع وختم العميل عند الاستلام.' : 'Affiche un encadré pour le visa et la signature du client.'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setLocalSettings(prev => ({ ...prev, showSignatureRecipient: !prev.showSignatureRecipient }))}
                                                className={`w-11 h-6 rounded-full flex items-center transition-colors duration-300 px-0.5 ${localSettings.showSignatureRecipient ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                            >
                                                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                                            </button>
                                        </div>

                                        {/* Toggle Table Vertical Borders */}
                                        <div className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-2xs border border-slate-200">
                                                    <Grid size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">
                                                        {language === 'ar' ? 'الخطوط العمودية في الجدول' : 'Lignes verticales du tableau'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {language === 'ar' ? 'تفعيل أو إخفاء الحدود الرمادية الفاصلة بين أعمدة الجدول.' : 'Affiche des séparateurs verticaux entre les colonnes du tableau.'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setLocalSettings(prev => ({ ...prev, showTableBorders: prev.showTableBorders === undefined ? false : !prev.showTableBorders }))}
                                                className={`w-11 h-6 rounded-full flex items-center transition-colors duration-300 px-0.5 ${localSettings.showTableBorders !== false ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                            >
                                                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                                            </button>
                                        </div>

                                        {/* Client Block Position */}
                                        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-2xs border border-slate-200">
                                                    <Building2 size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">
                                                        {language === 'ar' ? 'موضع مربع العميل' : "Position de l'encadré du Client"}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {language === 'ar' ? 'محاذاة مربع عنوان العميل في الجهة اليمنى أو اليسرى.' : "Aligner les coordonnées du client à droite (standard) ou à gauche."}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 pt-1">
                                                <button 
                                                    type="button"
                                                    onClick={() => setLocalSettings(prev => ({ ...prev, clientPosition: 'right' }))}
                                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                                                        (!localSettings.clientPosition || localSettings.clientPosition === 'right') 
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs' 
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span>À droite (Standard)</span>
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setLocalSettings(prev => ({ ...prev, clientPosition: 'left' }))}
                                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                                                        localSettings.clientPosition === 'left' 
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs' 
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span>À gauche</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. PDF Table Columns Customization */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold border border-rose-200/50">
                                            <Layers size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'تخصيص وترتيب أعمدة الجدول' : 'Colonnes du Tableau PDF'}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'تعديل تسميات الأعمدة، إعادة ترتيبها، وتفعيلها أو إخفائها.' : 'Organisez, réordonnez et renommez les colonnes de vos devis et factures.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        {columns.map((col, index) => (
                                            <div 
                                                key={col.id} 
                                                className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all ${
                                                    col.visible 
                                                    ? 'bg-white border-slate-200/90 shadow-2xs' 
                                                    : 'bg-slate-50/70 border-slate-200/50 opacity-60'
                                                }`}
                                            >
                                                <div className="flex flex-col gap-1 text-slate-400 shrink-0">
                                                    <button 
                                                        type="button"
                                                        onClick={() => moveColumn(index, 'up')} 
                                                        disabled={index === 0} 
                                                        className="hover:text-slate-800 disabled:opacity-20 transition-colors p-0.5"
                                                    >
                                                        <ArrowUp size={15} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => moveColumn(index, 'down')} 
                                                        disabled={index === columns.length - 1} 
                                                        className="hover:text-slate-800 disabled:opacity-20 transition-colors p-0.5"
                                                    >
                                                        <ArrowDown size={15} />
                                                    </button>
                                                </div>

                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center min-w-0">
                                                    <div>
                                                        <input 
                                                            type="text" 
                                                            value={col.label} 
                                                            onChange={(e) => updateColumnLabel(col.id, e.target.value)} 
                                                            className="block w-full bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 focus:outline-none px-1 py-1 font-bold text-sm text-slate-900 transition-colors" 
                                                            disabled={!col.visible} 
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-end gap-3">
                                                        <span className={`text-xs font-semibold ${col.visible ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md' : 'text-slate-400'}`}>
                                                            {col.visible ? (language === 'ar' ? 'مُفعلة' : 'Affichée') : (language === 'ar' ? 'مخفية' : 'Masquée')}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => toggleColumnVisibility(col.id)} 
                                                            className={`w-10 h-6 rounded-full flex items-center transition-colors duration-300 px-0.5 ${col.visible ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                                        >
                                                            <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 6. Footer Notes & Payment Terms */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                                    <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200/50">
                                            <FileText size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {language === 'ar' ? 'شروط الدفع والملاحظات الافتراضية' : 'Pied de page & Conditions de Règlement'}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {language === 'ar' ? 'النصوص التي تظهر تلقائياً في أسفل جميع الوثائق الصادرة.' : 'Définissez les mentions légales ou conditions générales de vente par défaut.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <InputField 
                                            icon={CreditCard} 
                                            label={language === 'ar' ? 'شروط الدفع الافتراضية' : "Conditions de paiement par défaut"} 
                                            name="defaultPaymentTerms" 
                                            value={localSettings.defaultPaymentTerms || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="Ex: Paiement à 30 jours fin de mois, Virement bancaire..." 
                                        />
                                        <div>
                                            <TextAreaField 
                                                label={language === 'ar' ? 'الملاحظات الافتراضية أسفل المستند' : "Notes et mentions de bas de page"} 
                                                name="footerNotes" 
                                                value={localSettings.footerNotes || ''} 
                                                onChange={handleInputChange} 
                                                rows={3} 
                                                placeholder="Ex: Merci pour votre confiance. En cas de retard, une pénalité de..." 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

/* --- Modern Reusable Input Subcomponents --- */

const InputField = ({ label, icon: Icon, className, ...props }: { label: string, icon?: any, className?: string, [key: string]: any }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            {label}
        </label>
        <div className="relative group">
            {Icon && (
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                    <Icon size={18} />
                </div>
            )}
            <input 
                id={props.name} 
                {...props} 
                className={`block w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 shadow-2xs hover:bg-white focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium text-slate-800 py-3 transition-all duration-150 ${Icon ? 'pl-10 pr-3.5' : 'px-3.5'}`} 
            />
        </div>
    </div>
);

const TextAreaField = ({ label, icon: Icon, className, ...props }: { label: string, icon?: any, className?: string, [key: string]: any }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            {label}
        </label>
        <div className="relative group">
            {Icon && (
                <div className="absolute top-3.5 left-3.5 flex items-start pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                    <Icon size={18} />
                </div>
            )}
            <textarea 
                id={props.name} 
                {...props} 
                className={`block w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 shadow-2xs hover:bg-white focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium text-slate-800 py-3 transition-all duration-150 ${Icon ? 'pl-10 pr-3.5' : 'px-3.5'}`} 
            />
        </div>
    </div>
);

export default TemplateCustomizer;
