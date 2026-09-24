
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ScanLine, Calculator, FileText, CreditCard, Loader2, Package, Square, Ruler, Weight, Hash, Tag, Coins, Layers, AlertTriangle } from 'lucide-react';
import { Client, Product, Invoice, LineItem, InvoiceStatus, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseDecimalInput, formatDecimalForInput, roundPrice } from '../services/currencyService';
import SearchableProductSelect from './SearchableProductSelect';

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (invoice: any, id?: string) => Promise<any> | void;
    clients: Client[];
    products: Product[];
    invoiceToEdit?: Invoice | null;
    prefilledPO?: string;
    prefilledOrder?: any;
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ isOpen, onClose, onSave, clients, products, invoiceToEdit, prefilledPO, prefilledOrder, companySettings, generateDocumentId }) => {
    const { t, isRTL, language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isModeTTC = companySettings?.priceDisplayMode === 'TTC';
    const qtyColLabel = companySettings?.documentColumns?.find(c => c.id === 'quantity')?.label || t('quantity');
    const vatOptions = language === 'es' ? [21, 10, 4, 0] : [20, 14, 10, 7, 0];

    const [clientId, setClientId] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [subject, setSubject] = useState('');
    const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
    const [showPOField, setShowPOField] = useState(false);
    const [showDueDateField, setShowDueDateField] = useState(false);
    const [showSubjectField, setShowSubjectField] = useState(false);
    const [showPaymentMethodField, setShowPaymentMethodField] = useState(false);
    const [invoicePaymentMethod, setInvoicePaymentMethod] = useState('');
    const [checkNumber, setCheckNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [notes, setNotes] = useState('');
    const [calculationMode, setCalculationMode] = useState<'piece' | 'm2' | 'ml' | 'kg' | 'days'>('piece');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    const [existingAmountPaid, setExistingAmountPaid] = useState<number>(0); 
    const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0); 
    
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
    const [stockError, setStockError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

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
            setSaveError(null);
            setStockError(null);
            if (invoiceToEdit) {
                // POS invoices for counter clients have clientId === '' or 'client-comptoir'
                const resolvedClientId = invoiceToEdit.clientId || 'client-comptoir';
                setClientId(resolvedClientId);
                setDocumentId(invoiceToEdit.documentId || '');
                const cleanDate = normalizeDateForInput(invoiceToEdit.date);
                setDate(cleanDate);
                const rawDueDate = invoiceToEdit.dueDate || invoiceToEdit.lineItems[0]?.dueDate;
                const cleanDueDate = rawDueDate ? normalizeDateForInput(rawDueDate) : (cleanDate ? new Date(new Date(cleanDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '');
                setDueDate(cleanDueDate);
                setSubject(invoiceToEdit.subject || invoiceToEdit.lineItems[0]?.subject || '');
                setShowSubjectField(!!(invoiceToEdit.subject || invoiceToEdit.lineItems[0]?.subject));
                const po = invoiceToEdit.purchaseOrderNumber || invoiceToEdit.lineItems[0]?.purchaseOrderNumber || '';
                setPurchaseOrderNumber(po);
                setShowPOField(!!po);
                const pm = invoiceToEdit.paymentMethod || invoiceToEdit.lineItems[0]?.paymentMethod || '';
                setInvoicePaymentMethod(pm);
                setShowPaymentMethodField(!!pm);
                setCheckNumber(invoiceToEdit.checkNumber || '');
                setBankName(invoiceToEdit.bankName || '');
                setShowDueDateField(!!rawDueDate);
                setNotes(invoiceToEdit.notes || '');
                // Read calculationMode from first line item
                setCalculationMode(invoiceToEdit.lineItems[0]?.calculationMode || 'piece');
                
                const loadedItems = JSON.parse(JSON.stringify(invoiceToEdit.lineItems));
                setLineItems(loadedItems.map((li: any) => ({
                    ...li,
                    name: stripHtml(li.name),
                    description: stripHtml(li.description)
                })));
                
                setExistingAmountPaid(invoiceToEdit.amountPaid || 0);
                setNewPaymentAmount(0);
                setIsDiscountEnabled(!!invoiceToEdit.discountValue && invoiceToEdit.discountValue > 0);
                setDiscountType(invoiceToEdit.discountType || 'percentage');
                setDiscountValue(invoiceToEdit.discountValue ? formatDecimalForInput(invoiceToEdit.discountValue, language) : '');
            } else {
                setClientId('');
                setDocumentId(generateDocumentId ? generateDocumentId() : '');
                setDate(new Date().toISOString().split('T')[0]);
                setDueDate('');
                setSubject('');
                setShowSubjectField(false);
                setPurchaseOrderNumber('');
                setShowPOField(!!prefilledPO);
                setInvoicePaymentMethod('');
                setShowPaymentMethodField(false);
                setCheckNumber('');
                setBankName('');
                setShowDueDateField(false);
                setNotes('');
                setLineItems([]);
                setExistingAmountPaid(0);
                setNewPaymentAmount(0);
                setTempVat(companySettings?.defaultTva ?? (language === 'es' ? 21 : 20));
                setIsDiscountEnabled(false);
                setDiscountType('percentage');
                setDiscountValue('0');
                
                if (prefilledOrder) {
                    setPurchaseOrderNumber(prefilledOrder.documentId || prefilledOrder.id);
                    setShowPOField(true);
                    setSubject(prefilledOrder.subject || '');
                    setShowSubjectField(!!prefilledOrder.subject);
                    setNotes(prefilledOrder.notes || '');
                    setLineItems(JSON.parse(JSON.stringify(prefilledOrder.lineItems)));
                    
                    // If the PO was paid, we can pre-set the amount paid for the invoice too
                    if (prefilledOrder.amountPaid && prefilledOrder.amountPaid > 0) {
                        setNewPaymentAmount(prefilledOrder.amountPaid);
                    }
                } else if (prefilledPO) {
                    setPurchaseOrderNumber(prefilledPO);
                    setShowPOField(true);
                }
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, invoiceToEdit, language]);

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

    const handleProductSelect = (productId: string) => {
        setSelectedProductId(productId);
        setSelectedVariantId(''); // Reset variant when product changes
        
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

    const insertItem = () => {
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
            length: length || 1,
            height: height || 1,
            weight: weight || 1,
            days: days || 1,
            unitPrice: price || 0,
            vat: vatValue,
            calculationMode
        };
        setLineItems(prev => [...(prev || []), newItem]);
        resetItemForm();
        setStockError(null);
        setSaveError(null);
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
                            const currentQtyInInvoice = lineItems
                                .filter(li => li.productId === selectedProductId && li.variantId === selectedVariantId)
                                .reduce((sum, li) => sum + li.quantity, 0);
                            const totalRequestedQty = currentQtyInInvoice + qty;
                            
                            const savedItem = invoiceToEdit?.lineItems?.find(li => li.productId === selectedProductId && li.variantId === selectedVariantId);
                            const savedQty = (savedItem && invoiceToEdit?.status !== InvoiceStatus.Draft) ? savedItem.quantity : 0;
                            
                            const availableStock = (variant.stockQuantity || 0) + savedQty;
                            
                            if (totalRequestedQty > availableStock) {
                                setStockError(`Stock insuffisant pour la variante ${variant.attributeValue} de ${product.name}. Disponible: ${availableStock}`);
                                return;
                            }
                        }
                    } else {
                        const currentQtyInInvoice = lineItems
                            .filter(li => li.productId === selectedProductId && !li.variantId)
                            .reduce((sum, li) => sum + li.quantity, 0);
                        const totalRequestedQty = currentQtyInInvoice + qty;
                        
                        const savedItem = invoiceToEdit?.lineItems?.find(li => li.productId === selectedProductId && !li.variantId);
                        const savedQty = (savedItem && invoiceToEdit?.status !== InvoiceStatus.Draft) ? savedItem.quantity : 0;
                        
                        const availableStock = (product.stockQuantity || 0) + savedQty;
                        
                        if (totalRequestedQty > availableStock) {
                            setStockError(`Stock insuffisant pour ${product.name}. Disponible: ${availableStock}`);
                            return;
                        }
                    }
                }
            }

            insertItem();
        } catch (error) {
            console.error("Error in handleAddItem:", error);
            alert("Erreur lors de l'ajout de l'article. Veuillez vérifier les données saisies.");
        }
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const updateLineItem = (id: string, updatedField: Partial<LineItem>) => {
        if (updatedField.quantity !== undefined) {
            const item = lineItems.find(li => li.id === id);
            if (item && item.productId) {
                const product = products.find(p => p.id === item.productId);
                if (product && product.productType === 'Produit') {
                    const savedItem = invoiceToEdit?.lineItems?.find(li => li.productId === item.productId && li.variantId === item.variantId);
                    const savedQty = (savedItem && invoiceToEdit?.status !== InvoiceStatus.Draft) ? savedItem.quantity : 0;
                    
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

    const computeTotals = (items: LineItem[]) => {
        if (isModeTTC) {
            const totalTTCUnrounded = items.reduce((acc, item) => {
                const lineMultiplier = getLineMultiplier(item);
                const unitTTC = roundPrice(item.unitPrice * (1 + (item.vat || 0) / 100));
                return acc + (unitTTC * item.quantity * lineMultiplier);
            }, 0);

            let discountAmount = 0;
            const parsedDiscountValue = parseDecimalInput(discountValue);
            if (isDiscountEnabled && parsedDiscountValue > 0) {
                if (discountType === 'percentage') {
                    discountAmount = totalTTCUnrounded * (parsedDiscountValue / 100);
                } else {
                    discountAmount = parsedDiscountValue;
                }
            }

            const totalTTC = Math.round((totalTTCUnrounded - discountAmount) * 100) / 100;

            const subTotalUnrounded = items.reduce((acc, item) => {
                const lineMultiplier = getLineMultiplier(item);
                const unitTTC = roundPrice(item.unitPrice * (1 + (item.vat || 0) / 100));
                const lineTTC = unitTTC * item.quantity * lineMultiplier;
                return acc + (lineTTC / (1 + (item.vat || 0) / 100));
            }, 0);

            const subTotalAfterDiscount = subTotalUnrounded - (discountType === 'percentage' ? subTotalUnrounded * ((parsedDiscountValue || 0) / 100) : (parsedDiscountValue || 0));
            const subTotal = Math.round(subTotalAfterDiscount * 100) / 100;
            const vatAmountAfterDiscount = Math.round((totalTTC - subTotal) * 100) / 100;

            return { subTotal, vatAmount: vatAmountAfterDiscount, totalTTC, discountAmount };
        } else {
            const subTotalUnrounded = items.reduce((acc, item) => {
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

            const vatAmountUnrounded = items.reduce((acc, item) => {
                const itemTotalHT = item.unitPrice * item.quantity * getLineMultiplier(item);
                const itemDiscount = subTotalUnrounded > 0 ? (itemTotalHT / subTotalUnrounded) * discountAmount : 0;
                const itemBaseForVat = itemTotalHT - itemDiscount;
                return acc + (itemBaseForVat * (item.vat / 100));
            }, 0);

            const totalTTC = Math.round((subTotalAfterDiscountUnrounded + vatAmountUnrounded) * 100) / 100;
            const subTotal = Math.round(subTotalAfterDiscountUnrounded * 100) / 100;
            const vatAmountAfterDiscount = Math.round((totalTTC - subTotal) * 100) / 100;

            return { subTotal, vatAmount: vatAmountAfterDiscount, totalTTC, discountAmount };
        }
    };

    const totals = useMemo(() => computeTotals(lineItems), [lineItems, isDiscountEnabled, discountType, discountValue, language, calculationMode, isModeTTC]);

    const handleSave = async () => {
        setSaveError(null);

        if (!clientId) {
            setSaveError(language === 'ar' ? 'يرجى تحديد أو اختيار العميل قبل حفظ الوصل' : 'Veuillez sélectionner un client pour enregistrer le bon.');
            return;
        }

        // Auto-include pending article if the user entered/selected a product but didn't click "+ Ajouter"
        let effectiveLineItems = [...lineItems];
        if (tempName && tempName.trim()) {
            const qty = parseDecimalInput(itemQuantity) || 1;
            const inputPrice = parseDecimalInput(tempPrice) || 0;
            const vatValue = typeof tempVat === 'number' ? tempVat : (companySettings?.defaultTva ?? 20);
            const price = isModeTTC ? (inputPrice / (1 + vatValue / 100)) : inputPrice;
            const length = showLengthColumn ? (parseDecimalInput(tempLength) || 1) : 1;
            const height = showHeightColumn ? (parseDecimalInput(tempHeight) || 1) : 1;
            const weight = isKg ? (parseDecimalInput(tempWeight) || 1) : 1;
            const days = isDays ? (parseDecimalInput(tempDays) || 1) : 1;

            const pendingItem: LineItem = {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                productId: selectedProductId || null,
                variantId: selectedVariantId || undefined,
                productCode: tempProductCode || '',
                name: tempName.trim(),
                description: tempDesc || '',
                quantity: qty,
                unit: tempUnit || '',
                length,
                height,
                weight,
                days,
                unitPrice: price,
                vat: vatValue,
                calculationMode
            };
            effectiveLineItems.push(pendingItem);
        }

        if (effectiveLineItems.length === 0) {
            setSaveError(language === 'ar' ? 'يرجى إضافة مادة واحدة على الأقل إلى الوصل (اضغط على زر + إضافة)' : 'Veuillez ajouter au moins un article au bon (cliquez sur + Ajouter).');
            return;
        }

        // Client resolution: support Client Comptoir (POS) and registered clients
        let clientNameDisplay = 'Client Comptoir';
        let savedClientId = clientId;
        if (clientId === 'client-comptoir') {
            clientNameDisplay = invoiceToEdit?.clientName || (language === 'ar' ? 'زبون مباشر (كونتوار)' : 'Client Comptoir');
            savedClientId = ''; // keeps POS standard
        } else {
            const client = clients.find(c => c.id === clientId);
            clientNameDisplay = client ? (client.company || client.name) : (invoiceToEdit?.clientName || 'Client');
            savedClientId = clientId;
        }

        const effectiveTotals = computeTotals(effectiveLineItems);
        const totalPaid = existingAmountPaid + newPaymentAmount;
        let status = InvoiceStatus.Pending;
        if (totalPaid >= effectiveTotals.totalTTC - 0.001) status = InvoiceStatus.Paid;
        else if (totalPaid > 0) status = InvoiceStatus.Partial;

        // Stock check before saving with warning confirmation
        const insufficientProducts: string[] = [];
        const checkedVariantKeys = new Set<string>();
        for (const item of effectiveLineItems) {
            const key = `${item.productId}-${item.variantId || 'none'}`;
            if (item.productId && !checkedVariantKeys.has(key)) {
                checkedVariantKeys.add(key);
                const product = products.find(p => p.id === item.productId);
                if (product && product.productType === 'Produit') {
                    if (item.variantId && product.hasVariants && product.variants) {
                        const variant = product.variants.find(v => v.id === item.variantId);
                        if (variant) {
                            const totalQtyInInvoice = effectiveLineItems
                                .filter(li => li.productId === item.productId && li.variantId === item.variantId)
                                .reduce((sum, li) => sum + li.quantity, 0);
                                
                            const savedItem = invoiceToEdit?.lineItems.find(li => li.productId === item.productId && li.variantId === item.variantId);
                            const savedQty = (savedItem && invoiceToEdit?.status !== InvoiceStatus.Draft) ? savedItem.quantity : 0;
                            
                            const availableStock = (variant.stockQuantity || 0) + savedQty;
                            
                            if (totalQtyInInvoice > availableStock) {
                                insufficientProducts.push(`${product.name} (${variant.attributeValue}): dispo ${availableStock}, demandé ${totalQtyInInvoice}`);
                            }
                        }
                    } else {
                        const totalQtyInInvoice = effectiveLineItems
                            .filter(li => li.productId === item.productId && !li.variantId)
                            .reduce((sum, li) => sum + li.quantity, 0);
                            
                        const savedItem = invoiceToEdit?.lineItems.find(li => li.productId === item.productId && !li.variantId);
                        const savedQty = (savedItem && invoiceToEdit?.status !== InvoiceStatus.Draft) ? savedItem.quantity : 0;
                        
                        const availableStock = (product.stockQuantity || 0) + savedQty;
                        
                        if (totalQtyInInvoice > availableStock) {
                            insufficientProducts.push(`${product.name}: dispo ${availableStock}, demandé ${totalQtyInInvoice}`);
                        }
                    }
                }
            }
        }

        if (insufficientProducts.length > 0) {
            const proceed = window.confirm(
                language === 'ar'
                    ? `تنبيه: المخزون المسجل لبعض المواد غير كافٍ:\n${insufficientProducts.join('\n')}\n\nهل تريد المتابعة وحفظ الوصل رغم ذلك؟`
                    : `Attention : Stock insuffisant pour :\n${insufficientProducts.join('\n')}\n\nSouhaitez-vous quand même enregistrer le bon ?`
            );
            if (!proceed) return;
        }

        // Store metadata in the first line item to avoid schema changes
        const updatedLineItems = [...effectiveLineItems];
        if (updatedLineItems.length > 0) {
            updatedLineItems[0] = { 
                ...updatedLineItems[0], 
                calculationMode,
                subject: showSubjectField ? subject : undefined,
                purchaseOrderNumber: showPOField ? purchaseOrderNumber : undefined,
                dueDate: showDueDateField ? dueDate : undefined,
                notes,
                paymentMethod: showPaymentMethodField ? invoicePaymentMethod : undefined,
                checkNumber: (showPaymentMethodField && invoicePaymentMethod === 'Chèque') ? checkNumber : undefined,
                bankName: (showPaymentMethodField && invoicePaymentMethod === 'Chèque') ? bankName : undefined
            };
        }

        const effectiveDate = date ? normalizeDateForInput(date) : (invoiceToEdit?.date ? normalizeDateForInput(invoiceToEdit.date) : new Date().toISOString().split('T')[0]);

        const invoiceData = {
            documentId: documentId || undefined,
            clientId: savedClientId, 
            clientName: clientNameDisplay, 
            date: effectiveDate, 
            dueDate: showDueDateField && dueDate ? normalizeDateForInput(dueDate) : undefined, 
            subject: showSubjectField ? subject : undefined, 
            purchaseOrderNumber: showPOField ? purchaseOrderNumber : undefined,
            paymentMethod: showPaymentMethodField ? invoicePaymentMethod : undefined,
            checkNumber: (showPaymentMethodField && invoicePaymentMethod === 'Chèque') ? checkNumber : undefined,
            bankName: (showPaymentMethodField && invoicePaymentMethod === 'Chèque') ? bankName : undefined,
            notes,
            lineItems: updatedLineItems, 
            status,
            subTotal: effectiveTotals.subTotal, 
            vatAmount: effectiveTotals.vatAmount, 
            amount: effectiveTotals.totalTTC, 
            amountPaid: totalPaid,
            discountType: isDiscountEnabled ? discountType : undefined,
            discountValue: isDiscountEnabled ? parseDecimalInput(discountValue) : undefined,
            initialPayment: newPaymentAmount > 0 ? { 
                amount: newPaymentAmount, 
                method: invoicePaymentMethod, 
                date: new Date().toISOString().split('T')[0],
                checkNumber: (invoicePaymentMethod === 'Chèque') ? checkNumber : undefined,
                bankName: (invoicePaymentMethod === 'Chèque') ? bankName : undefined
            } : undefined
        };

        setIsSubmitting(true);
        try { 
            if (invoiceToEdit?.id) {
                await onSave(invoiceData, invoiceToEdit.id);
            } else {
                await onSave(invoiceData);
            }
            handleClose(); 
        } catch (error: any) { 
            console.error("Save invoice error:", error); 
            setSaveError(error?.message || (language === 'ar' ? 'حدث خطأ أثناء حفظ الوصل' : "Erreur lors de l'enregistrement du bon"));
        } finally { 
            setIsSubmitting(false); 
        }
    };

    const remainingAmount = Math.max(0, totals.totalTTC - (existingAmountPaid + newPaymentAmount));
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
                            <h3 className="text-base font-bold text-slate-900">{invoiceToEdit ? t('editInvoice') : t('newInvoice')}</h3>
                            <p className="text-xs text-slate-500">
                                {invoiceToEdit 
                                    ? `#${invoiceToEdit.documentId || invoiceToEdit.id}` 
                                    : (language === 'fr' ? 'Éditer et enregistrer un nouveau bon client' : (language === 'ar' ? 'تحرير وحفظ وصل جديد' : 'Create and save a new voucher/bon'))}
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
                            <label className="block text-sm font-bold text-slate-700 ml-1">{language === 'es' ? 'Nº de Bon' : (language === 'ar' ? 'رقم الوصل (N° Bon)' : 'N° Bon')} *</label>
                            <input 
                                type="text" 
                                value={documentId} 
                                onChange={(e) => setDocumentId(e.target.value)} 
                                required
                                placeholder="FAC-YYYY/XXXXX"
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('client')} *</label>
                            <select 
                                value={clientId} 
                                onChange={(e) => {
                                    setClientId(e.target.value);
                                    if (saveError) setSaveError(null);
                                }} 
                                className={`block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 ${!clientId && saveError ? 'border-rose-500 ring-2 ring-rose-200' : ''}`}
                            >
                                <option value="">-- {t('select')} --</option>
                                <option value="client-comptoir">
                                    👤 {invoiceToEdit?.clientName || (language === 'ar' ? 'زبون مباشر (كونتوار / نقطة البيع POS)' : 'Client Comptoir / Passager (POS)')}
                                </option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.company || client.name}</option>
                                ))}
                                {invoiceToEdit?.clientName && invoiceToEdit.clientId && invoiceToEdit.clientId !== 'client-comptoir' && !clients.some(c => c.id === invoiceToEdit.clientId) && (
                                    <option value={invoiceToEdit.clientId}>{invoiceToEdit.clientName}</option>
                                )}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('date')} *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>
                        {showDueDateField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('dueDate')}</label>
                                <div className="relative">
                                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10"/>
                                    <button 
                                        type="button"
                                        onClick={() => setShowDueDateField(false)}
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
                                        if (!dueDate) {
                                            setDueDate(new Date(new Date(date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                                        }
                                        setShowDueDateField(true);
                                    }}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} /> {t('addDueDate')}
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
                        {showPOField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('purchaseOrderNumber')}</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={purchaseOrderNumber} 
                                        onChange={(e) => setPurchaseOrderNumber(e.target.value)} 
                                        placeholder={t('purchaseOrderNumber')} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => { setPurchaseOrderNumber(''); setShowPOField(false); }}
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
                                    onClick={() => setShowPOField(true)}
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
                                    <select value={invoicePaymentMethod} onChange={(e) => setInvoicePaymentMethod(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10">
                                        <option value="">-- {t('select')} --</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Chèque">Chèque</option>
                                        <option value="Espèces">Espèces</option>
                                        <option value="Carte Bancaire">Carte Bancaire</option>
                                    </select>
                                    <button 
                                        type="button"
                                        onClick={() => { setInvoicePaymentMethod(''); setCheckNumber(''); setBankName(''); setShowPaymentMethodField(false); }}
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

                        {showPaymentMethodField && invoicePaymentMethod === 'Chèque' && (
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
                                    placeholder="Ex: m, kg"
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-12 lg:col-span-2">
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
                                <div className="col-span-1 md:col-span-24 lg:col-span-12 mt-2 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-xs font-medium">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                                            <span>{stockError}</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={insertItem}
                                            className="ml-3 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-xs whitespace-nowrap active:scale-95"
                                        >
                                            {language === 'ar' ? 'إضافة على أية حال' : 'Ajouter quand même'}
                                        </button>
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
                                                        placeholder={t('refLabel')}
                                                        className="w-full p-1 text-left border-none focus:ring-0 text-[11px] font-mono bg-transparent"
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
                            <div className="md:hidden space-y-3">
                                {(lineItems || []).map(item => {
                                    const itemVat = typeof item.vat === 'number' ? item.vat : (companySettings?.defaultTva ?? 20);
                                    const displayPrice = isModeTTC ? roundPrice(item.unitPrice * (1 + itemVat/100)) : item.unitPrice;
                                    const displayLineTotal = (item.quantity || 0) * getLineMultiplier(item) * (displayPrice || 0);
                                    
                                    return (
                                        <div key={item.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-2">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('designationLabel')}</label>
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
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('refLabel')}</label>
                                                        <input 
                                                            type="text" 
                                                            value={item.productCode || ''} 
                                                            onChange={(e) => updateLineItem(item.id, { productCode: e.target.value })}
                                                            placeholder={t('refLabel')}
                                                            className="w-full h-8 rounded-lg border-slate-200 bg-white text-[11px] font-mono px-2 mt-0.5"
                                                        />
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t('quantity')}</label>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            value={formatDecimalForInput(item.quantity, language)} 
                                                            onChange={(e) => updateLineItem(item.id, { quantity: parseDecimalInput(e.target.value) })}
                                                            className="flex-1 h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            value={item.unit || ''} 
                                                            onChange={(e) => updateLineItem(item.id, { unit: e.target.value })}
                                                            placeholder={t('unit')}
                                                            className="w-16 h-10 rounded-lg border-slate-200 bg-white text-[10px] px-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('puTTCLabel') : t('puHTLabel')}</label>
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
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Long.</label>
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
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Haut.</label>
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
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Kg</label>
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

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('totalTTCLabel') : t('totalHTLabel')}</span>
                                                <span className="text-sm font-black text-emerald-700">
                                                    {displayLineTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} MAD
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
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                {invoiceToEdit && existingAmountPaid > 0 && (
                                    <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded flex justify-between">
                                        <span>{t('paid')} :</span>
                                        <span className="font-bold">{existingAmountPaid.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">{t('paymentAmount')}</label>
                                    <div className="relative">
                                        <input type="number" step="any" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(parseFloat(e.target.value) || 0)} className={`block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm font-bold h-11 ${isRTL ? 'pl-12 pr-3' : 'pl-3 pr-12'}`} placeholder="0.00"/>
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
                            <div className={`mt-4 p-4 rounded-xl border-2 transition-all ${remainingAmount > 0 ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('remaining')}</span>
                                    <span className="text-xl font-black">{remainingAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {saveError && (
                    <div className="mx-6 mb-2 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-xs font-semibold animate-in fade-in">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                            <span>{saveError}</span>
                        </div>
                        <button type="button" onClick={() => setSaveError(null)} className="text-rose-400 hover:text-rose-700 p-1">
                            <X size={15} />
                        </button>
                    </div>
                )}

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

export default CreateInvoiceModal;
