
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ScanLine, Calculator, FileText, Loader2, AlertCircle, Package, Square, Ruler, Weight, Hash, Tag, Coins, Layers, RotateCcw } from 'lucide-react';
import { Client, Product, CreditNote, LineItem, CreditNoteStatus, CompanySettings, Invoice } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseDecimalInput, formatDecimalForInput, roundPrice } from '../services/currencyService';
import SearchableProductSelect from './SearchableProductSelect';

interface CreateCreditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (creditNote: any, id?: string) => Promise<any> | void;
    clients: Client[];
    products: Product[];
    invoices?: Invoice[];
    prefilledInvoice?: Invoice | null;
    creditNoteToEdit?: CreditNote | null;
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const CreateCreditNoteModal: React.FC<CreateCreditNoteModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    clients, 
    products, 
    invoices = [],
    prefilledInvoice,
    creditNoteToEdit, 
    companySettings, 
    generateDocumentId 
}) => {
    const { t, isRTL, language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const isModeTTC = companySettings?.priceDisplayMode === 'TTC';
    const qtyColLabel = companySettings?.documentColumns?.find(c => c.id === 'quantity')?.label || t('quantity');
    const vatOptions = language === 'es' ? [21, 10, 4, 0] : [20, 14, 10, 7, 0];

    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [clientId, setClientId] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [checkNumber, setCheckNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [notes, setNotes] = useState('');
    const [calculationMode, setCalculationMode] = useState<'piece' | 'm2' | 'ml' | 'kg' | 'days'>('piece');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    const [showSubjectField, setShowSubjectField] = useState(false);
    const [showPaymentMethodField, setShowPaymentMethodField] = useState(false);
    
    const [selectedProductId, setSelectedProductId] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempDesc, setTempDesc] = useState('');
    const [tempPrice, setTempPrice] = useState(0);
    const [tempVat, setTempVat] = useState(companySettings?.defaultTva ?? 20);
    const [itemQuantity, setItemQuantity] = useState<string>('1');
    const [tempUnit, setTempUnit] = useState<string>('');
    const [tempDays, setTempDays] = useState<string>('1');
    const [tempLength, setTempLength] = useState<string>('1');
    const [tempHeight, setTempHeight] = useState<string>('1');
    const [tempWeight, setTempWeight] = useState<string>('1');
    const [tempProductCode, setTempProductCode] = useState('');

    const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState<string>('');

    const [status, setStatus] = useState<CreditNoteStatus>(CreditNoteStatus.Validated);
    const [returnToStock, setReturnToStock] = useState<boolean>(true);

    const normalizeDateForInput = (d?: string | Date | null): string => {
        if (!d) return '';
        if (typeof d === 'string') {
            const trimmed = d.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
            if (trimmed.includes('T')) return trimmed.split('T')[0];
            if (trimmed.includes(' ')) return trimmed.split(' ')[0];
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
                const [day, month, year] = trimmed.split('/');
                return `${year}-${month}-${day}`;
            }
            const parsed = new Date(trimmed);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
            }
            return trimmed;
        }
        if (d instanceof Date && !isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
        return '';
    };

    const stripHtml = (html?: string) => {
        if (!html) return '';
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        return (tempDiv.textContent || tempDiv.innerText || "").replace(/\u00a0/g, " ").trim();
    };

    const loadInvoiceData = (inv: Invoice) => {
        setSelectedInvoiceId(inv.id);
        setClientId(inv.clientId);
        const invRef = inv.documentId || inv.id;
        setReason(`Avoir sur facture ${invRef}`);
        setShowSubjectField(true);
        setPaymentMethod(inv.paymentMethod || '');
        setShowPaymentMethodField(!!inv.paymentMethod);
        setCheckNumber(inv.checkNumber || '');
        setBankName(inv.bankName || '');
        setNotes(`Avoir suite au retour d'articles de la facture ${invRef}.`);
        
        const mode = inv.lineItems[0]?.calculationMode || 'piece';
        setCalculationMode(mode);

        const items: LineItem[] = inv.lineItems.map(item => ({
            ...item,
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            invoiceQuantity: item.quantity,
            quantity: 0,
            name: stripHtml(item.name),
            description: stripHtml(item.description)
        }));
        setLineItems(items);
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            setError(null);
            if (creditNoteToEdit) {
                setSelectedInvoiceId(creditNoteToEdit.invoiceId || '');
                setClientId(creditNoteToEdit.clientId);
                setDocumentId(creditNoteToEdit.documentId || '');
                const cleanDate = normalizeDateForInput(creditNoteToEdit.date);
                setDate(cleanDate);
                
                const initialReason = creditNoteToEdit.subject || creditNoteToEdit.lineItems[0]?.subject || '';
                setReason(initialReason);
                setShowSubjectField(!!initialReason);

                const initialPaymentMethod = creditNoteToEdit.paymentMethod || creditNoteToEdit.lineItems[0]?.paymentMethod || '';
                setPaymentMethod(initialPaymentMethod);
                setShowPaymentMethodField(!!initialPaymentMethod);
                setCheckNumber(creditNoteToEdit.checkNumber || '');
                setBankName(creditNoteToEdit.bankName || '');

                setNotes(creditNoteToEdit.notes || '');
                setCalculationMode(creditNoteToEdit.lineItems[0]?.calculationMode || 'piece');
                
                const loadedItems = JSON.parse(JSON.stringify(creditNoteToEdit.lineItems));
                setLineItems(loadedItems.map((li: any) => ({
                    ...li,
                    name: stripHtml(li.name),
                    description: stripHtml(li.description)
                })));
                
                setIsDiscountEnabled(!!creditNoteToEdit.discountValue && creditNoteToEdit.discountValue > 0);
                setDiscountType(creditNoteToEdit.discountType || 'percentage');
                setDiscountValue(creditNoteToEdit.discountValue ? formatDecimalForInput(creditNoteToEdit.discountValue, language) : '');
                setStatus(creditNoteToEdit.status || CreditNoteStatus.Validated);
                setReturnToStock(creditNoteToEdit.returnToStock !== false);
            } else if (prefilledInvoice) {
                setDocumentId(generateDocumentId ? generateDocumentId() : '');
                setDate(new Date().toISOString().split('T')[0]);
                setIsDiscountEnabled(false);
                setDiscountType('percentage');
                setDiscountValue('0');
                setStatus(CreditNoteStatus.Validated);
                setReturnToStock(true);
                loadInvoiceData(prefilledInvoice);
            } else {
                setSelectedInvoiceId('');
                setClientId('');
                setDocumentId(generateDocumentId ? generateDocumentId() : '');
                setDate(new Date().toISOString().split('T')[0]);
                setReason('');
                setShowSubjectField(false);
                setPaymentMethod('');
                setShowPaymentMethodField(false);
                setCheckNumber('');
                setBankName('');
                setNotes('');
                setLineItems([]);
                setTempVat(companySettings?.defaultTva ?? (language === 'es' ? 21 : 20));
                setIsDiscountEnabled(false);
                setDiscountType('percentage');
                setDiscountValue('0');
                setStatus(CreditNoteStatus.Validated);
                setReturnToStock(true);
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, creditNoteToEdit, prefilledInvoice, language]);

    const resetItemForm = () => {
        setSelectedProductId('');
        setTempName('');
        setTempDesc('');
        setTempPrice(0);
        setTempVat(companySettings?.defaultTva ?? (language === 'es' ? 21 : 20));
        setItemQuantity('1');
        setTempUnit('');
        setTempDays('1');
        setTempLength('1');
        setTempHeight('1');
        setTempProductCode('');
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            if (product) {
                setTempName(stripHtml(product.description || product.name));
                setTempDesc(stripHtml(product.description || ''));
                const priceToDisplay = isModeTTC ? roundPrice(product.salePrice * (1 + product.vat / 100)) : product.salePrice;
                setTempPrice(priceToDisplay);
                const itemVat = (companySettings?.defaultTva === 0) ? 0 : (typeof product.vat === 'number' ? product.vat : (companySettings?.defaultTva ?? 20));
                setTempVat(itemVat);
                setTempProductCode(product.productCode);
                setTempUnit(product.unitOfMeasure || '');
            }
        }
    }, [selectedProductId, products, isModeTTC]);

    const isM2 = calculationMode === 'm2';
    const isML = calculationMode === 'ml';
    const isKg = calculationMode === 'kg';
    const isDays = calculationMode === 'days';
    const showLengthColumn = calculationMode === 'm2' || calculationMode === 'ml';
    const showHeightColumn = calculationMode === 'm2';
    const showDaysColumn = calculationMode === 'days';

    const getLineMultiplier = (item: LineItem) => {
        if (isM2) return (item.length || 1) * (item.height || 1);
        if (isML) return (item.length || 1);
        if (isKg) return (item.weight || 1);
        if (isDays) return (item.days || 1);
        return 1;
    };

    const handleAddItem = () => {
        try {
            if (!tempName) return;
            const qty = parseDecimalInput(itemQuantity);
            const vatValue = typeof tempVat === 'number' ? tempVat : (companySettings?.defaultTva ?? 20);
            const price = isModeTTC ? (tempPrice / (1 + vatValue / 100)) : tempPrice;
            const length = showLengthColumn ? parseDecimalInput(tempLength) : 1;
            const height = showHeightColumn ? parseDecimalInput(tempHeight) : 1;
            const weight = isKg ? parseDecimalInput(tempWeight) : 1;
            const days = isDays ? parseDecimalInput(tempDays) : 1;

            const newItem: LineItem = {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                productId: selectedProductId || null,
                productCode: tempProductCode || '',
                name: tempName,
                description: tempDesc || '',
                quantity: qty || 1,
                unit: tempUnit || '',
                length: length || 1,
                height: height || 1,
                weight: weight || 1,
                days: days || 1,
                unitPrice: price || 0,
                vat: vatValue
            };
            setLineItems(prev => [...(prev || []), newItem]);
            resetItemForm();
        } catch (error) {
            console.error("Error in handleAddItem:", error);
            alert("Erreur lors de l'ajout de l'article. Veuillez vérifier les données saisies.");
        }
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const updateLineItem = (id: string, updatedField: Partial<LineItem>) => {
        setLineItems(prev => prev.map(item => item.id === id ? { ...item, ...updatedField } : item));
    };

    const totals = useMemo(() => {
        const subTotalUnrounded = lineItems.reduce((acc, item) => {
            const lineTotal = item.unitPrice * item.quantity * getLineMultiplier(item);
            return acc + lineTotal;
        }, 0);
        
        let discountAmount = 0;
        const parsedDiscountValue = parseDecimalInput(discountValue);
        if (isDiscountEnabled && parsedDiscountValue > 0) {
            if (discountType === 'percentage') {
                discountAmount = subTotalUnrounded * (parsedDiscountValue / 100);
            } else { // fixed
                discountAmount = parsedDiscountValue;
            }
        }

        const subTotalAfterDiscountUnrounded = subTotalUnrounded - discountAmount;

        const vatAmountUnrounded = lineItems.reduce((acc, item) => {
            const itemTotalHT = item.unitPrice * item.quantity * getLineMultiplier(item);
            const itemDiscount = subTotalUnrounded > 0 ? (itemTotalHT / subTotalUnrounded) * discountAmount : 0;
            const itemBaseForVat = itemTotalHT - itemDiscount;
            return acc + (itemBaseForVat * (item.vat / 100));
        }, 0);

        const totalTTC = Math.round((subTotalAfterDiscountUnrounded + vatAmountUnrounded) * 100) / 100;
        const subTotal = Math.round(subTotalAfterDiscountUnrounded * 100) / 100;
        const vatAmountAfterDiscount = Math.round((totalTTC - subTotal) * 100) / 100;

        return { subTotal, vatAmount: vatAmountAfterDiscount, totalTTC, discountAmount };
    }, [lineItems, isDiscountEnabled, discountType, discountValue, language, calculationMode]);

    const hasInvoiceItems = lineItems.some(i => i.invoiceQuantity !== undefined);

    const handleSave = async () => {
        if (!clientId) {
            setError(language === 'ar' ? 'يرجى تحديد الزبون.' : 'Veuillez sélectionner un client.');
            return;
        }
        if (lineItems.length === 0) {
            setError(language === 'ar' ? 'يرجى إضافة سلع للأفوار.' : 'Veuillez ajouter des articles.');
            return;
        }

        const activeItems = hasInvoiceItems
            ? lineItems.filter(item => (Number(item.quantity) || 0) > 0)
            : lineItems;

        if (activeItems.length === 0) {
            setError(language === 'ar' 
                ? 'يرجى إدخال كمية الإرجاع (أكبر من 0) لسلعة واحدة على الأقل في عمود الإرجاع (Qté Avoir).' 
                : 'Veuillez saisir une quantité retournée (> 0) dans la colonne "Qté Avoir".');
            return;
        }

        const client = clients.find(c => c.id === clientId);
        const clientNameDisplay = client ? (client.company || client.name) : (language === 'es' ? 'Cliente desconocido' : 'Client inconnu');

        // Store metadata in the first line item to avoid schema changes
        const updatedLineItems = [...activeItems];
        if (updatedLineItems.length > 0) {
            updatedLineItems[0] = { 
                ...updatedLineItems[0], 
                calculationMode,
                subject: showSubjectField ? reason : undefined,
                notes,
                paymentMethod: showPaymentMethodField ? paymentMethod : undefined,
                checkNumber: (showPaymentMethodField && paymentMethod === 'Chèque') ? checkNumber : undefined,
                bankName: (showPaymentMethodField && paymentMethod === 'Chèque') ? bankName : undefined
            };
        }

        const resolvedInvoiceId = selectedInvoiceId || creditNoteToEdit?.invoiceId || (prefilledInvoice?.documentId || prefilledInvoice?.id) || undefined;
        const effectiveDate = date ? normalizeDateForInput(date) : (creditNoteToEdit?.date ? normalizeDateForInput(creditNoteToEdit.date) : new Date().toISOString().split('T')[0]);

        const creditNoteData: any = {
            documentId: documentId || undefined,
            clientId, 
            clientName: clientNameDisplay, 
            date: effectiveDate, 
            subject: showSubjectField ? reason : undefined, 
            paymentMethod: showPaymentMethodField ? paymentMethod : undefined, 
            checkNumber: (showPaymentMethodField && paymentMethod === 'Chèque') ? checkNumber : undefined,
            bankName: (showPaymentMethodField && paymentMethod === 'Chèque') ? bankName : undefined,
            notes, 
            lineItems: updatedLineItems,
            status,
            returnToStock,
            subTotal: totals.subTotal, 
            vatAmount: totals.vatAmount, 
            amount: totals.totalTTC, 
            invoiceId: resolvedInvoiceId,
            discountType: isDiscountEnabled ? discountType : undefined,
            discountValue: isDiscountEnabled ? parseDecimalInput(discountValue) : undefined,
        };
        setIsSubmitting(true);
        setError(null);
        try { 
            if (creditNoteToEdit?.id) {
                await onSave(creditNoteData, creditNoteToEdit.id);
            } else {
                await onSave(creditNoteData);
            }
            handleClose(); 
        } catch (err: any) { setError(err.message || "Error."); } finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
            <div className={`relative w-full h-full md:h-auto md:max-h-[92vh] md:max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-100 transition-all duration-200 ease-out flex flex-col overflow-hidden ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{creditNoteToEdit ? t('editCreditNote') : t('newCreditNote')}</h3>
                            <p className="text-xs text-slate-500">
                                {creditNoteToEdit 
                                    ? `#${creditNoteToEdit.documentId || creditNoteToEdit.id}` 
                                    : (language === 'fr' ? 'Éditer et enregistrer un nouvel avoir client' : 'Create and save a new credit note')}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {error && (<div className="px-6 pt-4"><div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3"><AlertCircle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-xs text-red-700">{error}</p></div></div>)}

                <div className="px-3 md:px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-6 pb-24 md:pb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{language === 'es' ? 'Nº de Avoir' : 'N° Avoir'} *</label>
                            <input 
                                type="text" 
                                value={documentId} 
                                onChange={(e) => setDocumentId(e.target.value)} 
                                required
                                placeholder="AV-YYYY/XXXXX"
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('client')} *</label>
                            <select 
                                value={clientId} 
                                onChange={(e) => {
                                    setClientId(e.target.value);
                                    if (selectedInvoiceId) {
                                        const inv = invoices.find(i => i.id === selectedInvoiceId);
                                        if (inv && inv.clientId !== e.target.value) {
                                            setSelectedInvoiceId('');
                                        }
                                    }
                                }} 
                                disabled={!!creditNoteToEdit?.invoiceId} 
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 bg-white disabled:bg-gray-100"
                            >
                                <option value="">-- {t('select')} --</option>
                                {clients.map(client => (<option key={client.id} value={client.id}>{client.company || client.name}</option>))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">
                                {language === 'ar' ? 'الفاتورة الأصلية' : 'Facture d\'origine'}
                            </label>
                            <select 
                                value={selectedInvoiceId} 
                                onChange={(e) => {
                                    const invId = e.target.value;
                                    setSelectedInvoiceId(invId);
                                    if (invId) {
                                        const inv = invoices.find(i => i.id === invId);
                                        if (inv) loadInvoiceData(inv);
                                    }
                                }}
                                disabled={!!creditNoteToEdit?.invoiceId}
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 bg-white disabled:bg-gray-100"
                            >
                                <option value="">-- {language === 'ar' ? 'بدون ربط بفاتورة' : 'Aucune (Avoir libre)'} --</option>
                                {invoices
                                    .filter(inv => !clientId || inv.clientId === clientId)
                                    .map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.documentId || inv.id} ({inv.clientName} - {inv.amount} MAD)
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('date')} *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {showSubjectField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('reasonLabel')}</label>
                                <div className="relative">
                                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={language === 'es' ? 'Ej: Devolución de produit' : 'Ex: Retour produit'} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10"/>
                                    <button 
                                        type="button"
                                        onClick={() => { setReason(''); setShowSubjectField(false); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-end pb-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowSubjectField(true)}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} /> {t('addSubject')}
                                </button>
                            </div>
                        )}

                        {showPaymentMethodField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('paymentMethod')}</label>
                                <div className="relative">
                                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10">
                                        <option value="">-- {t('select')} --</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Chèque">Chèque</option>
                                        <option value="Espèces">Espèces</option>
                                        <option value="Carte Bancaire">Carte Bancaire</option>
                                    </select>
                                    <button 
                                        type="button"
                                        onClick={() => { setPaymentMethod(''); setCheckNumber(''); setBankName(''); setShowPaymentMethodField(false); }}
                                        className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-end pb-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowPaymentMethodField(true)}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} /> {t('addPaymentMethod')}
                                </button>
                            </div>
                        )}

                        {showPaymentMethodField && paymentMethod === 'Chèque' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-emerald-700 ml-1">Numéro de chèque</label>
                                    <input 
                                        type="text" 
                                        value={checkNumber} 
                                        onChange={(e) => setCheckNumber(e.target.value)} 
                                        placeholder="Ex: 1234567" 
                                        className="block w-full rounded-xl border-emerald-200 bg-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-emerald-700 ml-1">La banque</label>
                                    <input 
                                        type="text" 
                                        value={bankName} 
                                        onChange={(e) => setBankName(e.target.value)} 
                                        placeholder="Ex: Attijariwafa bank" 
                                        className="block w-full rounded-xl border-emerald-200 bg-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"
                                    />
                                </div>
                            </div>
                        )}


                        {/* Statut & Réintégration en Stock */}
                        <div className="sm:col-span-2 p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                                    <RotateCcw className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-800">
                                            {language === 'ar' ? 'إرجاع السلع إلى المخزون (Retour Marchandise)' : 'Retour de Marchandise & Stock'}
                                        </span>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            {language === 'ar' ? 'تلقائي' : 'Automatique'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        {language === 'ar' 
                                            ? 'السلع المرجعة ستضاف للمخزون فوراً، وسيتم خصم المبلغ من رقم المعاملات (Chiffre d\'affaires).' 
                                            : 'Les quantités retournées seront réintégrées au stock et le montant sera déduit du Chiffre d\'Affaires.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 shrink-0">
                                <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-2 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={returnToStock} 
                                        onChange={(e) => setReturnToStock(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                    />
                                    <span className="text-xs font-bold text-slate-700">
                                        {language === 'ar' ? 'إعادة للمخزون (+Stock)' : 'Réintégrer au stock (+)'}
                                    </span>
                                </label>

                                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setStatus(CreditNoteStatus.Validated)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${status === CreditNoteStatus.Validated ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        {t('statusValidated') || 'Validé'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatus(CreditNoteStatus.Draft)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${status === CreditNoteStatus.Draft ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        {t('statusManual') || 'Brouillon'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-sm font-bold text-slate-700 ml-1">Mode de calcul</label>
                            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 w-fit">
                                {[
                                    { id: 'piece', label: 'Par pièce', icon: Package },
                                    { id: 'm2', label: 'Par m² (Larg x Haut)', icon: Square },
                                    { id: 'ml', label: 'Par mètre linéaire', icon: Ruler },
                                    { id: 'kg', label: 'Par kg', icon: Weight },
                                    { id: 'days', label: 'Par Jour', icon: Calculator }
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => setCalculationMode(mode.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                            calculationMode === mode.id 
                                            ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' 
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                        }`}
                                    >
                                        <mode.icon size={14} />
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <Layers size={18} />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 tracking-tight">{t('items')}</h4>
                            </div>
                            <div className="h-px bg-slate-100 flex-1 mx-6 hidden md:block"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-24 gap-4 items-end">
                            <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Hash size={10} /> {t('refLabel')}
                                </label>
                                <input 
                                    type="text" 
                                    value={tempProductCode} 
                                    onChange={(e) => setTempProductCode(e.target.value)} 
                                    placeholder={t('reference')} 
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-12 lg:col-span-5">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Package size={10} /> {t('productAutoLabel')}
                                </label>
                                <SearchableProductSelect 
                                    products={products}
                                    selectedProductId={selectedProductId}
                                    onSelect={setSelectedProductId}
                                    placeholder={language === 'fr' ? "Rechercher par nom ou réf..." : "Search by name or ref..."}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-24 lg:col-span-5">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Tag size={10} /> {t('designationLabel')} *
                                </label>
                                <textarea
                                    value={tempName} 
                                    onChange={(e) => setTempName(e.target.value)} 
                                    placeholder={t('description')} 
                                    rows={1}
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs py-3 px-3 transition-all min-h-[48px] resize-y overflow-hidden"
                                    onInput={(e) => {
                                        e.currentTarget.style.height = 'auto';
                                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                    }}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-12 lg:col-span-3">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Coins size={10} /> {isModeTTC ? t('puTTCLabel') : t('puHTLabel')}
                                </label>
                                <input 
                                    type="text" 
                                    value={tempPrice} 
                                    onChange={(e) => setTempPrice(parseDecimalInput(e.target.value, language))} 
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all font-mono"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-12 lg:col-span-3">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Calculator size={10} /> {t('quantity')}
                                </label>
                                <input 
                                    type="text" 
                                    value={itemQuantity} 
                                    onChange={(e) => setItemQuantity(e.target.value)} 
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                />
                            </div>
                            {showLengthColumn && (
                                <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{calculationMode === 'm2' ? 'Larg.' : 'Long.'}</label>
                                    <input 
                                        type="text" 
                                        value={tempLength} 
                                        onChange={(e) => setTempLength(e.target.value)} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                    />
                                </div>
                            )}
                            {showHeightColumn && (
                                <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">Haut.</label>
                                    <input 
                                        type="text" 
                                        value={tempHeight} 
                                        onChange={(e) => setTempHeight(e.target.value)} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                    />
                                </div>
                            )}
                            {isKg && (
                                <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">Poids (kg)</label>
                                    <input 
                                        type="text" 
                                        value={tempWeight} 
                                        onChange={(e) => setTempWeight(e.target.value)} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                    />
                                </div>
                            )}
                            {isDays && (
                                <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{t('uDay')}</label>
                                    <input 
                                        type="text" 
                                        value={tempDays} 
                                        onChange={(e) => setTempDays(e.target.value)} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all font-mono"
                                    />
                                </div>
                            )}
                            <div className="col-span-1 md:col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{t('unit')}</label>
                                <input 
                                    type="text" 
                                    value={tempUnit} 
                                    onChange={(e) => setTempUnit(e.target.value)} 
                                    placeholder={t('unit')}
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{t('vat')}</label>
                                <select 
                                    value={tempVat} 
                                    onChange={(e) => setTempVat(parseInt(e.target.value))} 
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                >
                                    {vatOptions.map(v => <option key={v} value={v}>{v}%</option>)}
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-24 lg:col-span-3">
                                <button 
                                    onClick={handleAddItem} 
                                    className="w-full inline-flex items-center justify-center h-12 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-[0.98] text-[13px] font-bold gap-2"
                                >
                                    <Plus size={16} /> {t('add')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {lineItems.length > 0 ? (
                        <>
                            {hasInvoiceItems && (
                                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                        <div className="text-xs text-emerald-950">
                                            <span className="font-bold">
                                                {language === 'ar' ? 'إرجاع سلع الفاتورة: ' : 'Retour d\'articles de la facture : '}
                                            </span>
                                            {language === 'ar' 
                                                ? 'حدد الكمية التي أرجعها الزبون في خانة (Qté Avoir). سيتم احتساب المبلغ تلقائياً وإعادة السلع للمخزون وخفض رقم المعاملات.'
                                                : 'Saisissez les quantités retournées dans la colonne "Qté Avoir". Les montants, le stock et le CA s\'ajusteront automatiquement.'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLineItems(prev => prev.map(item => ({
                                                    ...item,
                                                    quantity: item.invoiceQuantity !== undefined ? item.invoiceQuantity : item.quantity
                                                })));
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 rounded-xl border border-emerald-300 shadow-2xs transition-all"
                                        >
                                            {language === 'ar' ? 'إرجاع كل السلع' : 'Tout retourner'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLineItems(prev => prev.map(item => ({
                                                    ...item,
                                                    quantity: 0
                                                })));
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-2xs transition-all"
                                        >
                                            {language === 'ar' ? 'تصفير (0)' : 'Vider (0)'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Desktop Table View */}
                            <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{t('refLabel')}</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{t('description')}</th>
                                            {hasInvoiceItems ? (
                                                <>
                                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">
                                                        {language === 'ar' ? 'الكمية المفوترة' : 'Qté Facturée'}
                                                    </th>
                                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-emerald-800 uppercase bg-emerald-50/80 border-x border-emerald-200">
                                                        {language === 'ar' ? 'الكمية المرجعة (أفوار)' : 'Qté Avoir (Retour)'}
                                                    </th>
                                                </>
                                            ) : (
                                                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{qtyColLabel}</th>
                                            )}
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{t('puHTLabel')}</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase w-24">{t('unit')}</th>
                                            {showLengthColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{calculationMode === 'm2' ? 'Larg.' : 'Long.'}</th>}
                                            {showHeightColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Haut.</th>}
                                            {isKg && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Poids (kg)</th>}
                                            {isM2 && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">M²</th>}
                                            {isML && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">ML</th>}
                                            {isDays && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{t('uDay')}</th>}
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{t('totalHTLabel')}</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {(lineItems || []).map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="text" 
                                                        value={item.productCode || ''} 
                                                        onChange={(e) => updateLineItem(item.id, { productCode: e.target.value })}
                                                        className="w-full p-1 text-left border-none focus:ring-0 text-[11px] font-bold bg-transparent"
                                                        placeholder={t('refLabel')}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <textarea 
                                                        value={item.name || ''} 
                                                        onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                                                        placeholder={t('designationLabel')}
                                                        rows={1}
                                                        className="w-full p-1 text-left border-none focus:ring-0 text-[11px] font-bold bg-transparent resize-y overflow-hidden leading-tight"
                                                        onInput={(e) => {
                                                            e.currentTarget.style.height = 'auto';
                                                            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                                        }}
                                                    />
                                                </td>
                                                {hasInvoiceItems ? (
                                                    <>
                                                        <td className="px-3 py-3 text-center text-xs font-bold text-slate-600 bg-slate-50/50">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                                                                {item.invoiceQuantity !== undefined ? item.invoiceQuantity : '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3 text-center text-xs font-bold bg-emerald-50/40 border-x border-emerald-100">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <input 
                                                                    type="text" 
                                                                    value={formatDecimalForInput(item.quantity, language)} 
                                                                    onChange={(e) => {
                                                                        const val = parseDecimalInput(e.target.value);
                                                                        const max = item.invoiceQuantity !== undefined ? item.invoiceQuantity : Infinity;
                                                                        updateLineItem(item.id, { quantity: Math.min(Math.max(0, val), max) });
                                                                    }}
                                                                    placeholder="0"
                                                                    className="w-16 p-1.5 text-center rounded-lg border border-emerald-300 focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-emerald-950 bg-white shadow-2xs"
                                                                />
                                                                {item.invoiceQuantity !== undefined && (
                                                                    <button
                                                                        type="button"
                                                                        title={language === 'ar' ? 'إرجاع الكمية كاملة' : 'Tout retourner'}
                                                                        onClick={() => updateLineItem(item.id, { quantity: item.invoiceQuantity! })}
                                                                        className="text-[10px] font-bold px-1.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded transition-colors"
                                                                    >
                                                                        Max
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                        <input 
                                                            type="text" 
                                                            value={formatDecimalForInput(item.quantity, language)} 
                                                            onChange={(e) => updateLineItem(item.id, { quantity: parseDecimalInput(e.target.value) })}
                                                            className="w-16 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-right text-xs text-slate-700 font-bold">
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(item.unitPrice, language)} 
                                                        onChange={(e) => updateLineItem(item.id, { unitPrice: parseDecimalInput(e.target.value) })}
                                                        className="w-20 p-1 text-right border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs text-slate-600">
                                                    <input 
                                                        type="text" 
                                                        value={item.unit || ''} 
                                                        onChange={(e) => updateLineItem(item.id, { unit: e.target.value })}
                                                        placeholder={t('unit')}
                                                        className="w-20 p-1 text-center border-none focus:ring-0 text-xs bg-transparent"
                                                    />
                                                </td>
                                                {showLengthColumn && (
                                                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                        <input 
                                                            type="text" 
                                                            value={formatDecimalForInput(item.length || 1, language)} 
                                                            onChange={(e) => updateLineItem(item.id, { length: parseDecimalInput(e.target.value) })}
                                                            className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                        />
                                                    </td>
                                                )}
                                                {showHeightColumn && (
                                                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                        <input 
                                                            type="text" 
                                                            value={formatDecimalForInput(item.height || 1, language)} 
                                                            onChange={(e) => updateLineItem(item.id, { height: parseDecimalInput(e.target.value) })}
                                                            className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                        />
                                                    </td>
                                                )}
                                                {isKg && (
                                                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                        <input 
                                                            type="text" 
                                                            value={formatDecimalForInput(item.weight || 1, language)} 
                                                            onChange={(e) => updateLineItem(item.id, { weight: parseDecimalInput(e.target.value) })}
                                                            className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                        />
                                                    </td>
                                                )}
                                                {isM2 && <td className="px-4 py-3 text-center text-xs font-medium text-slate-700">{(item.quantity * (item.length || 1) * (item.height || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>}
                                                {isML && <td className="px-4 py-3 text-center text-xs font-medium text-slate-700">{(item.quantity * (item.length || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>}
                                                {isDays && (
                                                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                        <input 
                                                            type="text" 
                                                            value={formatDecimalForInput(item.days || 1, language)} 
                                                            onChange={(e) => updateLineItem(item.id, { days: parseDecimalInput(e.target.value) })}
                                                            className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent font-mono"
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-right text-xs font-bold text-slate-900">{(item.quantity * getLineMultiplier(item) * item.unitPrice).toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-4 py-3 text-center"><button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {(lineItems || []).map(item => {
                                    const displayLineTotal = (item.quantity || 0) * getLineMultiplier(item) * (item.unitPrice || 0);
                                    
                                    return (
                                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">{t('refLabel')}</label>
                                                        <input 
                                                            type="text" 
                                                            value={item.productCode || ''} 
                                                            onChange={(e) => updateLineItem(item.id, { productCode: e.target.value })}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                            placeholder={t('refLabel')}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">{t('designationLabel')}</label>
                                                        <textarea 
                                                            value={item.name || ''} 
                                                            onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-emerald-500 focus:border-emerald-500 resize-y overflow-hidden"
                                                            placeholder={t('designationLabel')}
                                                            rows={1}
                                                            onInput={(e) => {
                                                                e.currentTarget.style.height = 'auto';
                                                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            {hasInvoiceItems ? (
                                                <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/60">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === 'ar' ? 'الكمية المفوترة' : 'Qté Facturée'}</label>
                                                        <div className="h-10 flex items-center justify-center font-bold text-slate-700 bg-slate-100 rounded-lg text-sm">
                                                            {item.invoiceQuantity !== undefined ? item.invoiceQuantity : '-'}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">{language === 'ar' ? 'الكمية المرجعة' : 'Qté Avoir'}</label>
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="text" 
                                                                value={formatDecimalForInput(item.quantity, language)} 
                                                                onChange={(e) => {
                                                                    const val = parseDecimalInput(e.target.value);
                                                                    const max = item.invoiceQuantity !== undefined ? item.invoiceQuantity : Infinity;
                                                                    updateLineItem(item.id, { quantity: Math.min(Math.max(0, val), max) });
                                                                }}
                                                                placeholder="0"
                                                                className="w-full h-10 rounded-lg border-emerald-300 bg-white text-sm font-bold px-2 text-center text-emerald-950 focus:ring-emerald-500"
                                                            />
                                                            {item.invoiceQuantity !== undefined && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateLineItem(item.id, { quantity: item.invoiceQuantity! })}
                                                                    className="h-10 px-2 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition-colors"
                                                                >
                                                                    Max
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('quantity')}</label>
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(item.quantity, language)} 
                                                        onChange={(e) => updateLineItem(item.id, { quantity: parseDecimalInput(e.target.value) })}
                                                        className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('puHTLabel')}</label>
                                                <input 
                                                    type="text" 
                                                    value={formatDecimalForInput(item.unitPrice, language)} 
                                                    onChange={(e) => updateLineItem(item.id, { unitPrice: parseDecimalInput(e.target.value) })}
                                                    className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                />
                                            </div>

                                            {(showLengthColumn || showHeightColumn || isKg) && (
                                                <div className="grid grid-cols-3 gap-3">
                                                    {showLengthColumn && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Long.</label>
                                                            <input 
                                                                type="text" 
                                                                value={formatDecimalForInput(item.length || 1, language)} 
                                                                onChange={(e) => updateLineItem(item.id, { length: parseDecimalInput(e.target.value) })}
                                                                className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                            />
                                                        </div>
                                                    )}
                                                    {showHeightColumn && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Haut.</label>
                                                            <input 
                                                                type="text" 
                                                                value={formatDecimalForInput(item.height || 1, language)} 
                                                                onChange={(e) => updateLineItem(item.id, { height: parseDecimalInput(e.target.value) })}
                                                                className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                            />
                                                        </div>
                                                    )}
                                                    {isKg && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poids</label>
                                                            <input 
                                                                type="text" 
                                                                value={formatDecimalForInput(item.weight || 1, language)} 
                                                                onChange={(e) => updateLineItem(item.id, { weight: parseDecimalInput(e.target.value) })}
                                                                className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{t('totalHTLabel')}</span>
                                                <span className="text-sm font-bold text-emerald-600">
                                                    {displayLineTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 text-sm italic">
                            {t('items')} ({language === 'ar' ? 'فارغ' : 'Vide'})
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">{t('remarque')}</label>
                            <textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder={t('remarque')} 
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs min-h-[60px] py-2 px-3"
                            />
                        </div>
                        <div className="flex justify-end">
                            <div className="w-full max-w-sm space-y-3">
                            <div className="flex justify-between text-sm text-slate-500"><span>{t('totalHT')}</span><span>{totals.subTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span></div>
                            
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="discount-toggle"
                                        checked={isDiscountEnabled}
                                        onChange={(e) => setIsDiscountEnabled(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <label htmlFor="discount-toggle" className="text-slate-500 font-medium">{t('globalDiscount')}</label>
                                </div>
                                {isDiscountEnabled && totals.discountAmount > 0 && (
                                    <span className="font-bold text-red-500">
                                        - {totals.discountAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}
                                    </span>
                                )}
                            </div>

                            {isDiscountEnabled && (
                                <div className="pl-4 pb-2">
                                    <div className="flex items-stretch bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <input 
                                            type="text" 
                                            value={discountValue}
                                            onChange={e => setDiscountValue(e.target.value)}
                                            placeholder="0"
                                            className="flex-1 min-w-0 h-9 border-0 bg-transparent text-sm font-bold text-right focus:ring-0 px-3"
                                        />
                                        <div className="w-px bg-slate-200 my-1"></div>
                                        <select 
                                            value={discountType}
                                            onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                                            className="h-9 border-0 bg-slate-50 py-0 pl-3 pr-8 text-slate-600 focus:ring-0 sm:text-sm font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            <option value="percentage">%</option>
                                            <option value="fixed">MAD</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between text-sm text-slate-500"><span>{t('vat')}</span><span>{totals.vatAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span></div>
                            <div className="h-px bg-slate-200 my-1"></div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100"><span className="text-base font-bold text-slate-900">{t('totalTTC')}</span><span className="text-xl font-black text-emerald-700">{totals.totalTTC.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span></div>
                        </div>
                    </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2.5 p-4 bg-slate-50/50 border-t border-slate-100">
                    <button type="button" onClick={handleClose} disabled={isSubmitting} className="btn-secondary">
                        {t('cancel')}
                    </button>
                    <button type="button" onClick={handleSave} disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        <span>{t('save')}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreateCreditNoteModal;
