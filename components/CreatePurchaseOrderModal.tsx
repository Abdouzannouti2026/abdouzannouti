
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ScanLine, FileText, Loader2, Package, Square, Ruler, Weight, Hash, Tag, Coins, Layers, Calculator } from 'lucide-react';
import { Supplier, Product, PurchaseOrder, LineItem, PurchaseOrderStatus, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseDecimalInput, formatDecimalForInput, roundPrice } from '../services/currencyService';
import SearchableProductSelect from './SearchableProductSelect';

interface CreatePurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (order: any, id?: string) => Promise<any> | void;
    suppliers: Supplier[];
    products: Product[];
    orderToEdit?: PurchaseOrder | null;
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({ isOpen, onClose, onSave, suppliers, products, orderToEdit, companySettings, generateDocumentId }) => {
    const { t, isRTL, language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isModeTTC = companySettings?.priceDisplayMode === 'TTC';
    const vatOptions = language === 'es' ? [21, 10, 4, 0] : [20, 14, 10, 7, 0];

    const [supplierId, setSupplierId] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expectedDate, setExpectedDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [amountPaid, setAmountPaid] = useState<string>('0');
    const [subject, setSubject] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [checkNumber, setCheckNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [notes, setNotes] = useState('');
    const [calculationMode, setCalculationMode] = useState<'piece' | 'm2' | 'ml' | 'kg' | 'days'>('piece');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    const [showExpectedDateField, setShowExpectedDateField] = useState(false);
    const [showSubjectField, setShowSubjectField] = useState(false);
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

    const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState<string>('');

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
            if (orderToEdit) {
                setSupplierId(orderToEdit.supplierId);
                setDocumentId(orderToEdit.documentId || '');
                const cleanDate = normalizeDateForInput(orderToEdit.date);
                setDate(cleanDate);
                
                const rawDueDate = orderToEdit.dueDate || orderToEdit.lineItems[0]?.dueDate || '';
                setDueDate(rawDueDate ? normalizeDateForInput(rawDueDate) : '');
                setAmountPaid(orderToEdit.amountPaid ? formatDecimalForInput(orderToEdit.amountPaid, language) : '0');

                const initialExpectedDate = orderToEdit.expectedDate || orderToEdit.lineItems[0]?.expectedDate || '';
                setExpectedDate(initialExpectedDate ? normalizeDateForInput(initialExpectedDate) : '');
                setShowExpectedDateField(!!initialExpectedDate);

                const initialSubject = orderToEdit.subject || orderToEdit.lineItems[0]?.subject || '';
                setSubject(initialSubject);
                setShowSubjectField(!!initialSubject);

                const initialPaymentMethod = orderToEdit.paymentMethod || orderToEdit.lineItems[0]?.paymentMethod || '';
                setPaymentMethod(initialPaymentMethod);
                setShowPaymentMethodField(!!initialPaymentMethod);
                setCheckNumber(orderToEdit.checkNumber || orderToEdit.lineItems[0]?.checkNumber || '');
                setBankName(orderToEdit.bankName || orderToEdit.lineItems[0]?.bankName || '');

                setNotes(orderToEdit.notes || orderToEdit.lineItems[0]?.notes || '');
                // Read calculationMode from first line item
                setCalculationMode(orderToEdit.lineItems[0]?.calculationMode || 'piece');
                
                const loadedItems = JSON.parse(JSON.stringify(orderToEdit.lineItems));
                setLineItems(loadedItems.map((li: any) => ({
                    ...li,
                    name: stripHtml(li.name),
                    description: stripHtml(li.description)
                })));
                
                setIsDiscountEnabled(!!orderToEdit.discountValue && orderToEdit.discountValue > 0);
                setDiscountType(orderToEdit.discountType || 'percentage');
                setDiscountValue(orderToEdit.discountValue ? formatDecimalForInput(orderToEdit.discountValue, language) : '');
            } else {
                setSupplierId('');
                setDocumentId(generateDocumentId ? generateDocumentId() : '');
                setDate(new Date().toISOString().split('T')[0]);
                setExpectedDate('');
                setDueDate('');
                setAmountPaid('0');
                setShowExpectedDateField(false);
                setSubject('');
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
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, orderToEdit, language]);

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
                const priceToDisplay = isModeTTC ? roundPrice(product.purchasePrice * (1 + product.vat / 100)) : product.purchasePrice;
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
                
                if (variant.purchasePrice !== undefined && variant.purchasePrice > 0) {
                    const priceToDisplay = isModeTTC ? roundPrice(variant.purchasePrice * (1 + product.vat / 100)) : variant.purchasePrice;
                    setTempPrice(formatDecimalForInput(priceToDisplay, language));
                }
            }
        }
    };

    const isM2 = calculationMode === 'm2';
    const isML = calculationMode === 'ml';
    const isKg = calculationMode === 'kg';
    const isDays = calculationMode === 'days';

    const hasSpecificMode = (mode: string) => lineItems.some(item => item.calculationMode === mode);
    
    // Determine which columns to show based on current tool selection OR existing items
    const showLengthColumn = calculationMode === 'm2' || calculationMode === 'ml' || hasSpecificMode('m2') || hasSpecificMode('ml');
    const showHeightColumn = calculationMode === 'm2' || hasSpecificMode('m2');
    const showWeightColumn = calculationMode === 'kg' || hasSpecificMode('kg');
    const showDaysColumn = calculationMode === 'days' || hasSpecificMode('days');

    const getLineMultiplier = (item: LineItem) => {
        const mode = item.calculationMode || 'piece';
        if (mode === 'm2') return (item.length || 1) * (item.height || 1);
        if (mode === 'ml') return (item.length || 1);
        if (mode === 'kg') return (item.weight || 1);
        if (mode === 'days') return (item.days || 1);
        return 1;
    };

    const handleAddItem = () => {
        try {
            if (!tempName) return;
            const qty = parseDecimalInput(itemQuantity);
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
                calculationMode: calculationMode,
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

        const totalAmount = Math.round((subTotalAfterDiscountUnrounded + vatAmountUnrounded) * 100) / 100;
        const subTotal = Math.round(subTotalAfterDiscountUnrounded * 100) / 100;
        const vatAmountAfterDiscount = Math.round((totalAmount - subTotal) * 100) / 100;

        return { subTotal, vatAmount: vatAmountAfterDiscount, totalAmount, discountAmount };
    }, [lineItems, isDiscountEnabled, discountType, discountValue, language, calculationMode]);

    const handleSave = async () => {
        if (!supplierId || lineItems.length === 0) return;
        const supplier = suppliers.find(s => s.id === supplierId);
        
        const fallbackName = language === 'es' ? 'Proveedor desconocido' : 'Fournisseur inconnu';
        const supplierNameDisplay = supplier ? (supplier.company || supplier.name) : fallbackName;
        
        // Store metadata in the first line item to avoid schema changes
        const updatedLineItems = [...lineItems];
        if (updatedLineItems.length > 0) {
            updatedLineItems[0] = { 
                ...updatedLineItems[0], 
                calculationMode,
                dueDate: dueDate || undefined,
                expectedDate: showExpectedDateField ? expectedDate : undefined,
                subject: showSubjectField ? subject : undefined,
                paymentMethod: showPaymentMethodField ? paymentMethod : undefined,
                checkNumber: (showPaymentMethodField && paymentMethod === 'Chèque') ? checkNumber : undefined,
                bankName: (showPaymentMethodField && paymentMethod === 'Chèque') ? bankName : undefined,
                notes
            };
        }

        const effectiveDate = date ? normalizeDateForInput(date) : (orderToEdit?.date ? normalizeDateForInput(orderToEdit.date) : new Date().toISOString().split('T')[0]);

        const orderData = {
            documentId: documentId || undefined,
            supplierId, 
            supplierName: supplierNameDisplay, 
            date: effectiveDate, 
            dueDate: dueDate ? normalizeDateForInput(dueDate) : undefined,
            amountPaid: parseDecimalInput(amountPaid) || 0,
            expectedDate: showExpectedDateField && expectedDate ? normalizeDateForInput(expectedDate) : undefined, 
            subject: showSubjectField ? subject : undefined, 
            paymentMethod: showPaymentMethodField ? paymentMethod : undefined,
            checkNumber: (showPaymentMethodField && paymentMethod === 'Chèque') ? checkNumber : undefined,
            bankName: (showPaymentMethodField && paymentMethod === 'Chèque') ? bankName : undefined,
            notes, 
            lineItems: updatedLineItems,
            status: orderToEdit ? orderToEdit.status : PurchaseOrderStatus.Draft,
            subTotal: totals.subTotal, 
            vatAmount: totals.vatAmount, 
            totalAmount: totals.totalAmount,
            discountType: isDiscountEnabled ? discountType : undefined,
            discountValue: isDiscountEnabled ? parseDecimalInput(discountValue) : undefined,
        };

        setIsSubmitting(true);
        try {
            if (orderToEdit?.id) {
                await onSave(orderData, orderToEdit.id);
            } else {
                await onSave(orderData);
            }
            handleClose();
        } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
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
                            <h3 className="text-base font-bold text-slate-900">{orderToEdit ? t('editPurchaseOrder') : t('newPurchaseOrder')}</h3>
                            <p className="text-xs text-slate-500">
                                {orderToEdit 
                                    ? `#${orderToEdit.documentId || orderToEdit.id}` 
                                    : (language === 'fr' ? 'Éditer et enregistrer un nouveau bon de commande' : 'Create and save a new purchase order')}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-3 md:px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-6 pb-24 md:pb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{language === 'es' ? 'Nº de Pedido' : 'N° BC'} *</label>
                            <input 
                                type="text" 
                                value={documentId} 
                                onChange={(e) => setDocumentId(e.target.value)} 
                                required
                                placeholder="BC-YYYY/XXXXX"
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 font-mono"
                            />
                        </div>
                        <div className="sm:col-span-1 space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('supplier')} *</label>
                            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12">
                                <option value="">-- {t('select')} --</option>
                                {suppliers.map(supplier => (<option key={supplier.id} value={supplier.id}>{supplier.company || supplier.name}</option>))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('date')} *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{language === 'fr' ? 'Échéance' : 'Due Date'}</label>
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{language === 'fr' ? 'Montant déjà payé' : 'Amount Paid'}</label>
                            <input type="text" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 font-mono"/>
                        </div>
                        
                        {showExpectedDateField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('expectedDelivery')}</label>
                                <div className="relative">
                                    <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10"/>
                                    <button 
                                        type="button"
                                        onClick={() => { setExpectedDate(''); setShowExpectedDateField(false); }}
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
                                    onClick={() => {
                                        if (!expectedDate) {
                                            setExpectedDate(new Date(new Date(date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                                        }
                                        setShowExpectedDateField(true);
                                    }}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} /> {t('addExpectedDate')}
                                </button>
                            </div>
                        )}

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
                        <div className="sm:col-span-3 space-y-2">
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
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">Jours</label>
                                    <input 
                                        type="text" 
                                        value={tempDays} 
                                        onChange={(e) => setTempDays(e.target.value)} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
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
                            {/* Desktop Table View */}
                            <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{t('refLabel')}</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{t('description')}</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{t('quantity')}</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase w-28">{t('unit')}</th>
                                            {showLengthColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Long./Larg.</th>}
                                            {showHeightColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Haut.</th>}
                                            {showWeightColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Poids (kg)</th>}
                                            {showDaysColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{t('uDay')}</th>}
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Multiplier</th>
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
                                            {showWeightColumn && (
                                                <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(item.weight || 1, language)} 
                                                        onChange={(e) => {
                                                            const val = parseDecimalInput(e.target.value);
                                                            updateLineItem(item.id, { weight: val, calculationMode: item.calculationMode || 'kg' });
                                                        }}
                                                        className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                    />
                                                </td>
                                            )}
                                            {showDaysColumn && (
                                                <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(item.days || 1, language)} 
                                                        onChange={(e) => {
                                                            const val = parseDecimalInput(e.target.value);
                                                            updateLineItem(item.id, { days: val, calculationMode: item.calculationMode || 'days' });
                                                        }}
                                                        className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-center text-xs font-medium text-slate-500 italic">
                                                {getLineMultiplier(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                <span className="text-[9px] ml-1 opacity-50 uppercase">{item.calculationMode || 'piece'}</span>
                                            </td>
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
                                                <span className="text-xs font-bold text-slate-400 uppercase">{t('total')}</span>
                                                <span className="text-sm font-black text-emerald-600">{displayLineTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} MAD</span>
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
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100"><span className="text-base font-bold text-slate-900">{t('totalTTC')}</span><span className="text-xl font-black text-emerald-700">{totals.totalAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span></div>
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

export default CreatePurchaseOrderModal;
