
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ScanLine, Calculator, CreditCard, Loader2, Package, Square, Ruler, Weight, Hash, Tag, Coins, Layers, AlertTriangle } from 'lucide-react';
import { Client, Product, DeliveryNote, LineItem, CompanySettings, Invoice, InvoiceStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseDecimalInput, formatDecimalForInput, roundPrice } from '../services/currencyService';
import SearchableProductSelect from './SearchableProductSelect';

interface CreateDeliveryNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (note: any, id?: string) => Promise<any> | void;
    clients: Client[];
    products: Product[];
    invoices: Invoice[];
    noteToEdit?: DeliveryNote | null;
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const CreateDeliveryNoteModal: React.FC<CreateDeliveryNoteModalProps> = ({ isOpen, onClose, onSave, clients, products, invoices, noteToEdit, companySettings, generateDocumentId }) => {
    const { t, isRTL, language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isModeTTC = companySettings?.priceDisplayMode === 'TTC';
    const qtyColLabel = companySettings?.documentColumns?.find(c => c.id === 'quantity')?.label || t('quantity');
    const vatOptions = language === 'es' ? [21, 10, 4, 0] : [20, 14, 10, 7, 0];

    const [clientId, setClientId] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [subject, setSubject] = useState('');
    const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [calculationMode, setCalculationMode] = useState<'piece' | 'm2' | 'ml' | 'kg' | 'days'>('piece');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    const [showSubjectField, setShowSubjectField] = useState(false);
    const [showPurchaseOrderField, setShowPurchaseOrderField] = useState(false);
    const [showPaymentMethodField, setShowPaymentMethodField] = useState(false);
    
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempDesc, setTempDesc] = useState('');
    const [tempPrice, setTempPrice] = useState<string>('0');
    const [tempVat, setTempVat] = useState(companySettings?.defaultTva ?? 20);
    const [itemQuantity, setItemQuantity] = useState<string>('1');
    const [tempUnit, setTempUnit] = useState<string>('');
    const [tempDays, setTempDays] = useState<string>('1');
    const [tempLength, setTempLength] = useState<string>('1');
    const [tempHeight, setTempHeight] = useState<string>('1');
    const [tempWeight, setTempWeight] = useState<string>('1');
    const [tempProductCode, setTempProductCode] = useState('');
    
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Espèces');
    const [checkNumber, setCheckNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [stockError, setStockError] = useState<string | null>(null);

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

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            if (noteToEdit) {
                const initialClientId = noteToEdit.clientId || 'client-comptoir';
                setClientId(initialClientId);
                setDocumentId(noteToEdit.documentId || '');
                const cleanDate = normalizeDateForInput(noteToEdit.date);
                setDate(cleanDate);
                const initialSubject = noteToEdit.subject || noteToEdit.lineItems[0]?.subject || '';
                setSubject(initialSubject);
                setShowSubjectField(!!initialSubject);

                const initialPO = noteToEdit.purchaseOrderNumber || '';
                setPurchaseOrderNumber(initialPO);
                setShowPurchaseOrderField(!!initialPO);

                setNotes(noteToEdit.notes || '');
                // Read calculationMode from first line item
                setCalculationMode(noteToEdit.lineItems[0]?.calculationMode || 'piece');
                
                const loadedItems = JSON.parse(JSON.stringify(noteToEdit.lineItems));
                setLineItems(loadedItems.map((li: any) => ({
                    ...li,
                    name: stripHtml(li.name),
                    description: stripHtml(li.description)
                })));
                
                setPaymentAmount(noteToEdit.paymentAmount || 0);
                
                const initialPaymentMethod = noteToEdit.paymentMethod || noteToEdit.lineItems[0]?.paymentMethod || 'Espèces';
                setPaymentMethod(initialPaymentMethod);
                setShowPaymentMethodField(!!initialPaymentMethod);
                setCheckNumber(noteToEdit.checkNumber || '');
                setBankName(noteToEdit.bankName || '');
            } else {
                setClientId('');
                setDocumentId(generateDocumentId ? generateDocumentId() : '');
                setDate(new Date().toISOString().split('T')[0]);
                setSubject('');
                setShowSubjectField(false);
                setPurchaseOrderNumber('');
                setShowPurchaseOrderField(false);
                setNotes('');
                setLineItems([]);
                setPaymentAmount(0);
                setTempVat(companySettings?.defaultTva ?? (language === 'es' ? 21 : 20));
                setPaymentMethod(language === 'es' ? 'Efectivo' : 'Espèces');
                setShowPaymentMethodField(false);
                setCheckNumber('');
                setBankName('');
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, noteToEdit, language]);

    const resetItemForm = () => {
        setSelectedProductId('');
        setSelectedVariantId('');
        setTempName('');
        setTempDesc('');
        setTempPrice('0');
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

    const updateLineItem = (id: string, updatedField: Partial<LineItem>) => {
        if (updatedField.quantity !== undefined) {
            const item = lineItems.find(li => li.id === id);
            if (item && item.productId) {
                const product = products.find(p => p.id === item.productId);
                if (product && product.productType === 'Produit') {
                    const savedItem = noteToEdit?.lineItems?.find(li => li.productId === item.productId && li.variantId === item.variantId);
                    const sourceInvoice = noteToEdit?.invoiceId ? invoices.find(inv => inv.documentId === noteToEdit.invoiceId || inv.id === noteToEdit.invoiceId) : null;
                    const stockAlreadyDeductedByInv = sourceInvoice && sourceInvoice.status !== InvoiceStatus.Draft;
                    const savedQty = (!stockAlreadyDeductedByInv) ? (savedItem?.quantity || 0) : 0;
                    
                    let availableStock = 0;
                    if (item.variantId && product.variants) {
                        const variant = product.variants.find(v => v.id === item.variantId);
                        availableStock = (variant?.stockQuantity || 0) + savedQty;
                    } else {
                        availableStock = (product.stockQuantity || 0) + savedQty;
                    }

                    if (updatedField.quantity > availableStock) {
                        setStockError(`Stock insuffisant. Disponible: ${availableStock}`);
                        return;
                    } else {
                        setStockError(null);
                    }
                }
            }
        }
        setLineItems(prev => prev.map(item => item.id === id ? { ...item, ...updatedField } : item));
    };

    const handleProductSelect = (productId: string) => {
        setSelectedProductId(productId);
        setSelectedVariantId('');
        
        if (productId) {
            const product = products.find(p => p.id === productId);
            if (product) {
                setTempName(stripHtml(product.description || product.name));
                setTempDesc(stripHtml(product.description || ''));
                const priceToDisplay = isModeTTC ? roundPrice(product.salePrice * (1 + product.vat / 100)) : product.salePrice;
                setTempPrice(formatDecimalForInput(priceToDisplay, language));
                const itemVat = (companySettings?.defaultTva === 0) ? 0 : (typeof product.vat === 'number' ? product.vat : (companySettings?.defaultTva ?? 20));
                setTempVat(itemVat);
                setTempProductCode(product.productCode);
                setTempUnit(product.unitOfMeasure || '');
            }
        }
    };

    const handleVariantSelect = (variantId: string) => {
        setSelectedVariantId(variantId);
        
        if (variantId && selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            const variant = product?.variants?.find(v => v.id === variantId);
            if (variant && product) {
                const baseName = stripHtml(product.description || product.name);
                setTempName(`${baseName} (${variant.attributeValue})`);
                
                if (variant.salePrice !== undefined && variant.salePrice > 0) {
                    const priceToDisplay = isModeTTC ? roundPrice(variant.salePrice * (1 + product.vat / 100)) : variant.salePrice;
                    setTempPrice(formatDecimalForInput(priceToDisplay, language));
                }
            }
        }
    };

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
            setStockError(null);
            if (!tempName) return;
            const qty = parseDecimalInput(itemQuantity);

            // Stock check
            if (selectedProductId) {
                const product = products.find(p => p.id === selectedProductId);
                if (product && product.productType === 'Produit') {
                    if (selectedVariantId && product.hasVariants && product.variants) {
                        const variant = product.variants.find(v => v.id === selectedVariantId);
                        if (variant) {
                            const currentQtyInDN = lineItems
                                .filter(li => li.productId === selectedProductId && li.variantId === selectedVariantId)
                                .reduce((sum, li) => sum + li.quantity, 0);
                            const totalRequestedQty = currentQtyInDN + qty;
                            
                            const savedItem = noteToEdit?.lineItems?.find(li => li.productId === selectedProductId && li.variantId === selectedVariantId);
                            const sourceInvoice = noteToEdit?.invoiceId ? invoices.find(inv => inv.documentId === noteToEdit.invoiceId || inv.id === noteToEdit.invoiceId) : null;
                            const stockAlreadyDeductedByInv = sourceInvoice && sourceInvoice.status !== InvoiceStatus.Draft;
                            
                            const savedQty = (!stockAlreadyDeductedByInv) ? (savedItem?.quantity || 0) : 0;
                            const availableStock = (variant.stockQuantity || 0) + savedQty;
                            
                            if (totalRequestedQty > availableStock) {
                                setStockError(`Stock insuffisant pour la variante ${variant.attributeValue} de ${product.name}. Disponible: ${availableStock}`);
                                return;
                            }
                        }
                    } else {
                        const currentQtyInDN = lineItems
                            .filter(li => li.productId === selectedProductId && !li.variantId)
                            .reduce((sum, li) => sum + li.quantity, 0);
                        const totalRequestedQty = currentQtyInDN + qty;
                        
                        const savedItem = noteToEdit?.lineItems?.find(li => li.productId === selectedProductId && !li.variantId);
                        const sourceInvoice = noteToEdit?.invoiceId ? invoices.find(inv => inv.documentId === noteToEdit.invoiceId || inv.id === noteToEdit.invoiceId) : null;
                        const stockAlreadyDeductedByInv = sourceInvoice && sourceInvoice.status !== InvoiceStatus.Draft;
                        
                        const savedQty = (!stockAlreadyDeductedByInv) ? (savedItem?.quantity || 0) : 0;
                        const availableStock = (product.stockQuantity || 0) + savedQty;
                        
                        if (totalRequestedQty > availableStock) {
                            setStockError(`Stock insuffisant pour ${product.name}. Disponible: ${availableStock}`);
                            return;
                        }
                    }
                }
            }
            const inputPrice = parseDecimalInput(tempPrice);
            const vatValue = typeof tempVat === 'number' ? tempVat : (companySettings?.defaultTva ?? 20);
            const price = isModeTTC ? (inputPrice / (1 + vatValue / 100)) : inputPrice;
            const length = showLengthColumn ? parseDecimalInput(tempLength) : 1;
            const height = showHeightColumn ? parseDecimalInput(tempHeight) : 1;
            const weight = isKg ? parseDecimalInput(tempWeight) : 1;
            const days = isDays ? parseDecimalInput(tempDays) : 1;

            const newItem: LineItem = {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                productId: selectedProductId || null,
                variantId: selectedVariantId || undefined,
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

    const totals = useMemo(() => {
        if (isModeTTC) {
            let totalTTCUnrounded = lineItems.reduce((acc, item) => {
                const lineMultiplier = getLineMultiplier(item);
                const unitTTC = roundPrice(item.unitPrice * (1 + (item.vat || 0) / 100));
                return acc + (unitTTC * item.quantity * lineMultiplier);
            }, 0);
            const totalTTC = Math.round(totalTTCUnrounded * 100) / 100;
            
            const subTotalUnrounded = lineItems.reduce((acc, item) => {
                const lineMultiplier = getLineMultiplier(item);
                const unitTTC = roundPrice(item.unitPrice * (1 + (item.vat || 0) / 100));
                const lineTTC = unitTTC * item.quantity * lineMultiplier;
                return acc + (lineTTC / (1 + (item.vat || 0) / 100));
            }, 0);
            const subTotal = Math.round(subTotalUnrounded * 100) / 100;
            const vatAmount = Math.round((totalTTC - subTotal) * 100) / 100;
            return { subTotal, vatAmount, totalTTC };
        } else {
            const subTotalUnrounded = lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity * getLineMultiplier(item)), 0);
            const vatAmountUnrounded = lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity * getLineMultiplier(item) * (item.vat / 100)), 0);
            const totalTTC = Math.round((subTotalUnrounded + vatAmountUnrounded) * 100) / 100;
            const subTotal = Math.round(subTotalUnrounded * 100) / 100;
            const vatAmount = Math.round((totalTTC - subTotal) * 100) / 100;
            return { subTotal, vatAmount, totalTTC };
        }
    }, [lineItems, calculationMode, isModeTTC]);

    const handleSave = async () => {
        if (!clientId) return;
        
        let clientNameDisplay = 'Client Comptoir';
        let savedClientId = clientId;
        if (clientId === 'client-comptoir') {
            clientNameDisplay = noteToEdit?.clientName || (language === 'ar' ? 'زبون مباشر (كونتوار)' : 'Client Comptoir');
            savedClientId = '';
        } else {
            const client = clients.find(c => c.id === clientId);
            clientNameDisplay = client ? (client.company || client.name) : (noteToEdit?.clientName || 'Client inconnu');
            savedClientId = clientId;
        }

        if (lineItems.length === 0) return;
        // Store metadata in the first line item to avoid schema changes
        const updatedLineItems = [...lineItems];
        if (updatedLineItems.length > 0) {
            updatedLineItems[0] = { 
                ...updatedLineItems[0], 
                calculationMode,
                subject: showSubjectField ? subject : undefined,
                paymentMethod: showPaymentMethodField ? paymentMethod : undefined,
                checkNumber: (showPaymentMethodField && paymentMethod === 'Chèque') ? checkNumber : undefined,
                bankName: (showPaymentMethodField && paymentMethod === 'Chèque') ? bankName : undefined,
                notes,
                purchaseOrderNumber: showPurchaseOrderField ? purchaseOrderNumber : undefined
            };
        }

        const effectiveDate = date ? normalizeDateForInput(date) : (noteToEdit?.date ? normalizeDateForInput(noteToEdit.date) : new Date().toISOString().split('T')[0]);

        setIsSubmitting(true);
        try {
            await onSave({
                documentId: documentId || undefined,
                clientId: savedClientId, 
                clientName: clientNameDisplay, 
                date: effectiveDate, 
                subject: showSubjectField ? subject : undefined, 
                purchaseOrderNumber: showPurchaseOrderField ? purchaseOrderNumber : undefined, 
                notes, 
                lineItems: updatedLineItems, status: 'Livré',
                subTotal: totals.subTotal, vatAmount: totals.vatAmount, totalAmount: totals.totalTTC,
                paymentAmount, 
                paymentMethod: showPaymentMethodField ? paymentMethod : undefined, 
                checkNumber: (showPaymentMethodField && paymentMethod === 'Chèque') ? checkNumber : undefined,
                bankName: (showPaymentMethodField && paymentMethod === 'Chèque') ? bankName : undefined,
                invoiceId: noteToEdit?.invoiceId
            }, noteToEdit?.id);
            handleClose();
        } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
    };

    const remainingAmount = totals.totalTTC - paymentAmount;
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
                            <Package size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{noteToEdit ? t('editDeliveryNote') : t('newDeliveryNote')}</h3>
                            <p className="text-xs text-slate-500">
                                {noteToEdit 
                                    ? `#${noteToEdit.documentId || noteToEdit.id}` 
                                    : (language === 'fr' ? 'Éditer et enregistrer un nouveau bon de livraison' : 'Create and save a new delivery note')}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-3 md:px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-6 pb-24 md:pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{language === 'es' ? 'Nº de BL' : 'N° BL'} *</label>
                            <input 
                                type="text" 
                                value={documentId} 
                                onChange={(e) => setDocumentId(e.target.value)} 
                                required
                                placeholder="BL-YYYY/XXXXX"
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('client')} *</label>
                            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12">
                                <option value="">-- {t('select')} --</option>
                                <option value="client-comptoir">
                                    👤 {noteToEdit?.clientName || (language === 'ar' ? 'زبون مباشر (كونتوار / نقطة البيع POS)' : 'Client Comptoir / Passager (POS)')}
                                </option>
                                {clients.map(client => (<option key={client.id} value={client.id}>{client.company || client.name}</option>))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('date')} *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>

                        {showSubjectField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('subject')}</label>
                                <div className="relative">
                                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('subject')} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10"/>
                                    <button 
                                        type="button"
                                        onClick={() => { setSubject(''); setShowSubjectField(false); }}
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

                        {showPurchaseOrderField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('purchaseOrderNumber')}</label>
                                <div className="relative">
                                    <input type="text" value={purchaseOrderNumber} onChange={(e) => setPurchaseOrderNumber(e.target.value)} placeholder={t('purchaseOrderNumber')} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10"/>
                                    <button 
                                        type="button"
                                        onClick={() => { setPurchaseOrderNumber(''); setShowPurchaseOrderField(false); }}
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
                                    onClick={() => setShowPurchaseOrderField(true)}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} /> {t('addPurchaseOrderNumber')}
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
                                        onClick={() => { setPaymentMethod(language === 'es' ? 'Efectivo' : 'Espèces'); setCheckNumber(''); setBankName(''); setShowPaymentMethodField(false); }}
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



                        <div className="md:col-span-2 space-y-2">
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
                            <div className="col-span-1 md:col-span-12 lg:col-span-4">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Package size={10} /> {t('productAutoLabel')}
                                </label>
                                <SearchableProductSelect 
                                    products={products}
                                    selectedProductId={selectedProductId}
                                    onSelect={handleProductSelect}
                                    placeholder={language === 'fr' ? "Rechercher par nom ou réf..." : "Search by name or ref..."}
                                />
                                {selectedProductId && products.find(p => p.id === selectedProductId)?.hasVariants && (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <label className="block text-[9px] font-bold text-emerald-600 uppercase mb-1 ml-1 font-mono">Variante *</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {products.find(p => p.id === selectedProductId)?.variants?.map(variant => (
                                                <button
                                                    key={variant.id}
                                                    type="button"
                                                    onClick={() => handleVariantSelect(variant.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                        selectedVariantId === variant.id
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.02]'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                                                    }`}
                                                >
                                                    {variant.attributeValue} 
                                                    <span className={`ml-1.5 opacity-60 font-mono text-[10px] ${selectedVariantId === variant.id ? 'text-white' : 'text-slate-400'}`}>
                                                        ({variant.stockQuantity || 0})
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="col-span-1 md:col-span-24 lg:col-span-4">
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
                                    onChange={(e) => setTempPrice(e.target.value)} 
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

                            {stockError && (
                                <div className="col-span-1 md:col-span-12 lg:col-span-12 mt-2 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg border border-red-100 text-[11px] font-bold uppercase tracking-wider">
                                        <AlertTriangle size={14} />
                                        {stockError}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {lineItems.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{t('refLabel')}</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{t('description')}</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{qtyColLabel}</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase w-28">{t('unit')}</th>
                                            {showLengthColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{calculationMode === 'm2' ? 'Larg.' : 'Long.'}</th>}
                                            {showHeightColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Haut.</th>}
                                            {isKg && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Poids (kg)</th>}
                                            {isM2 && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">M²</th>}
                                            {isML && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">ML</th>}
                                            {isDays && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{t('uDay')}</th>}
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('puTTCLabel') : t('puHTLabel')}</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('totalTTCLabel') : t('totalHTLabel')}</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {(lineItems || []).map(item => {
                                            const itemVat = typeof item.vat === 'number' ? item.vat : (companySettings?.defaultTva ?? 20);
                                            const displayPrice = isModeTTC ? roundPrice(item.unitPrice * (1 + itemVat/100)) : item.unitPrice;
                                            const displayLineTotal = (item.quantity || 0) * getLineMultiplier(item) * (displayPrice || 0);
                                            
                                            return (
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
                                                <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(item.quantity, language)} 
                                                        onChange={(e) => updateLineItem(item.id, { quantity: parseDecimalInput(e.target.value) })}
                                                        className="w-16 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs text-slate-600">
                                                    <input 
                                                        type="text" 
                                                        value={item.unit || ''} 
                                                        onChange={(e) => updateLineItem(item.id, { unit: e.target.value })}
                                                        placeholder={t('unit')}
                                                        className="w-24 p-1 text-center border-none focus:ring-0 text-xs bg-transparent"
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
                                                <td className="px-4 py-3 text-right text-xs">
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(displayPrice, language)} 
                                                        onChange={(e) => {
                                                            const val = parseDecimalInput(e.target.value);
                                                            updateLineItem(item.id, { unitPrice: isModeTTC ? roundPrice(val / (1 + item.vat/100)) : val });
                                                        }}
                                                        className="w-24 p-1 text-right border-none focus:ring-0 text-xs font-medium bg-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs font-bold text-slate-900">
                                                    {displayLineTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3 text-center"><button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button></td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {(lineItems || []).map(item => {
                                    const itemVat = typeof item.vat === 'number' ? item.vat : (companySettings?.defaultTva ?? 20);
                                    const displayPrice = isModeTTC ? roundPrice(item.unitPrice * (1 + itemVat/100)) : item.unitPrice;
                                    const displayLineTotal = (item.quantity || 0) * getLineMultiplier(item) * (displayPrice || 0);
                                    
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
                                                            placeholder={t('designationLabel')}
                                                            rows={1}
                                                            className="w-full mt-0.5 p-2 rounded-lg border-slate-200 bg-slate-50/50 text-xs shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white transition-all resize-y overflow-hidden"
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

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('quantity')}</label>
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(item.quantity, language)} 
                                                        onChange={(e) => updateLineItem(item.id, { quantity: parseDecimalInput(e.target.value) })}
                                                        className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isModeTTC ? t('puTTCLabel') : t('puHTLabel')}</label>
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(displayPrice, language)} 
                                                        onChange={(e) => {
                                                            const val = parseDecimalInput(e.target.value);
                                                            updateLineItem(item.id, { unitPrice: isModeTTC ? roundPrice(val / (1 + item.vat/100)) : val });
                                                        }}
                                                        className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                    />
                                                </div>
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
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
                                                <div className="text-sm font-black text-emerald-600">
                                                    {displayLineTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} MAD
                                                </div>
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
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">{t('paymentAmount')}</label>
                                    <div className="relative">
                                        <input type="number" step="any" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} className={`block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm font-bold h-11 ${isRTL ? 'pl-12 pr-3' : 'pl-3 pr-12'}`} placeholder="0.00"/>
                                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'}`}><span className="text-slate-400 font-bold text-xs">MAD</span></div>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">{t('remarque')}</label>
                                    <textarea 
                                        value={notes} 
                                        onChange={(e) => setNotes(e.target.value)} 
                                        placeholder={t('remarque')} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs min-h-[60px] py-2 px-3"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-slate-500"><span>{t('totalHT')}</span><span>{totals.subTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span></div>
                            <div className="flex justify-between text-sm text-slate-500"><span>{t('vat')}</span><span>{totals.vatAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span></div>
                            <div className="h-px bg-slate-200 my-1"></div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100"><span className="text-base font-bold text-slate-900">{t('totalTTC')}</span><span className="text-xl font-black text-emerald-700">{totals.totalTTC.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span></div>
                            <div className={`mt-4 p-4 rounded-xl border-2 transition-all ${remainingAmount > 0 ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('remaining')}</span>
                                    <span className="text-xl font-black">{remainingAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2.5 p-4 bg-slate-50/50 border-t border-slate-100">
                    <button type="button" onClick={handleClose} disabled={isSubmitting} className="btn-secondary">
                        {t('cancel')}
                    </button>
                    <button type="button" onClick={handleSave} disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                        <span>{t('save')}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreateDeliveryNoteModal;
