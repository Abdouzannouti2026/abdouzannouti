
import React from 'react';
import { CompanySettings, Quote, Invoice, Client, DeliveryNote, CreditNote, PurchaseOrder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface DocumentPreviewProps {
    settings: Partial<CompanySettings>;
    document: Quote | Invoice | DeliveryNote | CreditNote | PurchaseOrder;
    client: Client;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ settings, document, client }) => {
    const { t, language } = useLanguage();
    const primaryColor = settings.primaryColor || '#059669'; // Default to emerald-600
    const headerTextColor = settings.headerTextColor || '#ffffff';
    const tableHeaderBgColor = settings.tableHeaderBgColor || primaryColor;
    const showTableBorders = settings.showTableBorders !== false;
    const borderStyle = showTableBorders ? 'border-r border-slate-300' : '';
    const clientPosition = settings.clientPosition || 'right';
    
    // Détermination du type de document
    let documentType = 'DOCUMENT';
    let isDeliveryNote = false;
    let isQuote = false;

    if ('expiryDate' in document) {
        documentType = t('quotes').toUpperCase();
        isQuote = true;
    } else if ('dueDate' in document) {
        documentType = t('invoices').toUpperCase();
    } else if ('expectedDate' in document) {
        documentType = t('purchaseOrders').toUpperCase();
    } else if ('subject' in document && !('expiryDate' in document) && !('dueDate' in document) && !('expectedDate' in document)) {
        // This is a bit tricky, CreditNote has subject, but others might too.
        // Let's check if it's a CreditNote by checking if it's not the others.
        // Actually, let's just use the documentId prefix or something if available, 
        // but the current logic is based on properties.
        documentType = t('creditNotes').toUpperCase();
    } else {
        // Logique par défaut pour DeliveryNote
        documentType = t('deliveryNotes').toUpperCase();
        isDeliveryNote = true;
    }

    const isCreditNote = 'returnToStock' in document || (document as any).invoiceId !== undefined || documentType === t('creditNotes').toUpperCase();
    const hasInvoiceQty = isCreditNote && document.lineItems.some(i => i.invoiceQuantity !== undefined);

    const docSubject = document.subject || document.lineItems[0]?.subject || "";
    const docPaymentMethod = document.paymentMethod || document.lineItems[0]?.paymentMethod || "";
    const docCheckNumber = document.checkNumber || document.lineItems[0]?.checkNumber || "";
    const docBankName = document.bankName || document.lineItems[0]?.bankName || "";
    const docDueDate = (document as any).dueDate || (document.lineItems[0] as any)?.dueDate || "";
    const docExpectedDate = (document as any).expectedDate || document.lineItems[0]?.expectedDate || "";

    const calculationMode = document.lineItems[0]?.calculationMode || 'piece';
    const legacyShowDimensions = (document as any).showDimensions || document.lineItems[0]?.showDimensions;
    
    const isM2 = calculationMode === 'm2' || (legacyShowDimensions && calculationMode === 'piece');
    const isML = calculationMode === 'ml';
    const isKg = calculationMode === 'kg';

    const isModeTTC = settings?.priceDisplayMode === 'TTC';

    const getColLabel = (id: string, defaultLabel: string) => {
        const customCol = settings?.documentColumns?.find(c => c.id === id);
        let label = customCol?.label || defaultLabel;
        if (isModeTTC) {
            if (id === 'unitPrice') {
                if (/H\.?T\.?/i.test(label)) {
                    label = label.replace(/H\.?T\.?/gi, 'TTC');
                } else if (!/TTC/i.test(label)) {
                    label = /prix/i.test(label) ? (label === label.toUpperCase() ? 'PRIX TTC' : 'Prix TTC') : 'P.U. TTC';
                }
            }
            if (id === 'total') {
                if (/H\.?T\.?/i.test(label)) {
                    label = label.replace(/H\.?T\.?/gi, 'TTC');
                } else if (!/TTC/i.test(label)) {
                    label = label === label.toUpperCase() ? 'TOTAL TTC' : 'Total TTC';
                }
            }
        } else {
            if (id === 'unitPrice' && /T\.?T\.?C\.?/i.test(label)) {
                label = label.replace(/T\.?T\.?C\.?/gi, 'HT');
            }
            if (id === 'total' && /T\.?T\.?C\.?/i.test(label)) {
                label = label.replace(/T\.?T\.?C\.?/gi, 'HT');
            }
        }
        return label;
    };

    const getLineMultiplier = (item: any) => {
        if (isM2) return (item.length || 1) * (item.height || 1);
        if (isML) return (item.length || 1);
        return 1;
    };

    let totalTTC = 0;
    let subTotal = 0;
    let vatAmount = 0;
    let discountAmount = 0;
    const doc = document as any;

    if (isModeTTC) {
        const totalTTCUnrounded = document.lineItems.reduce((acc, item) => {
            const lineMultiplier = getLineMultiplier(item);
            const unitTTC = Math.round(item.unitPrice * (1 + (item.vat || 0) / 100) * 100) / 100;
            return acc + (unitTTC * item.quantity * lineMultiplier);
        }, 0);
        let currentTotalTTC = Math.round(totalTTCUnrounded * 100) / 100;

        if (doc.discountType && doc.discountValue && doc.discountValue > 0) {
            if (doc.discountType === 'percentage') {
                discountAmount = currentTotalTTC * (doc.discountValue / 100);
            } else {
                discountAmount = doc.discountValue;
            }
        }
        totalTTC = Math.round((currentTotalTTC - discountAmount) * 100) / 100;

        const subTotalUnrounded = document.lineItems.reduce((acc, item) => {
            const lineMultiplier = getLineMultiplier(item);
            const unitTTC = Math.round(item.unitPrice * (1 + (item.vat || 0) / 100) * 100) / 100;
            const lineTTC = unitTTC * item.quantity * lineMultiplier;
            return acc + (lineTTC / (1 + (item.vat || 0) / 100));
        }, 0);
        const subTotalAfterDiscount = subTotalUnrounded - (doc.discountType === 'percentage' ? subTotalUnrounded * ((doc.discountValue || 0) / 100) : (doc.discountValue || 0));
        subTotal = Math.round(subTotalAfterDiscount * 100) / 100;
        vatAmount = Math.round((totalTTC - subTotal) * 100) / 100;
    } else {
        const subTotalUnrounded = document.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity * getLineMultiplier(item)), 0);
        
        if (doc.discountType && doc.discountValue && doc.discountValue > 0) {
            if (doc.discountType === 'percentage') {
                discountAmount = subTotalUnrounded * (doc.discountValue / 100);
            } else {
                discountAmount = doc.discountValue;
            }
        }
        const subTotalAfterDiscountUnrounded = subTotalUnrounded - discountAmount;

        const vatAmountUnrounded = document.lineItems.reduce((acc, item) => {
            const itemTotalHT = item.unitPrice * item.quantity * getLineMultiplier(item);
            const itemDiscount = subTotalUnrounded > 0 ? (itemTotalHT / subTotalUnrounded) * discountAmount : 0;
            const itemBaseForVat = itemTotalHT - itemDiscount;
            return acc + (itemBaseForVat * (item.vat / 100));
        }, 0);

        totalTTC = Math.round((subTotalAfterDiscountUnrounded + vatAmountUnrounded) * 100) / 100;
        subTotal = Math.round(subTotalAfterDiscountUnrounded * 100) / 100;
        vatAmount = Math.round((totalTTC - subTotal) * 100) / 100;
    }

    const renderAddress = (address: string) => {
        return address.split('\n').map((line, index) => (
            <React.Fragment key={index}>
                {line}
                <br />
            </React.Fragment>
        ));
    };

    const iceLabel = language === 'es' ? 'NIF' : (language === 'en' ? 'Tax ID' : 'ICE');

    const legalIds = [
        settings.ice ? `${iceLabel}: ${settings.ice}` : '',
        settings.rc ? `RC: ${settings.rc}` : '',
        settings.fiscalId ? `IF: ${settings.fiscalId}` : '',
        settings.patente ? `TP: ${settings.patente}` : '',
        settings.cnss ? `CNSS: ${settings.cnss}` : '',
        settings.capital ? `Capital: ${settings.capital}` : ''
    ].filter(Boolean).join(' | ');

    const showReference = document.lineItems.some(item => !!item.productCode);

    return (
        <div className="bg-white p-12 shadow-2xl font-sans text-sm text-neutral-800 relative overflow-hidden flex flex-col" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
            
            {/* Watermark / Logo en arrière-plan */}
            {settings.backgroundLogo && (settings.showLogoWatermark ?? true) && (
                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                    <img 
                        src={settings.backgroundLogo} 
                        alt="Watermark" 
                        className="max-h-[60%] object-contain translate-y-16"
                        style={{ 
                            width: settings.backgroundLogoWidth ? `${settings.backgroundLogoWidth}px` : '80%',
                            maxWidth: '90%',
                            opacity: settings.logoWatermarkOpacity ?? 0.07 
                        }}
                    />
                </div>
            )}

            <style>{`
                .ql-size-small { font-size: 0.75em; }
                .ql-size-large { font-size: 1.5em; }
                .ql-size-huge { font-size: 2.5em; }
                .ql-align-center { text-align: center; }
                .ql-align-right { text-align: right; }
                .ql-align-justify { text-align: justify; }
                .document-preview-content p { margin: 0 0 4px 0; }
                .document-preview-content p:last-child { margin-bottom: 0; }
            `}</style>
            <div className="relative z-10 flex flex-col flex-1 document-preview-content">
                {/* Header */}
                <header className="flex justify-between items-start pb-6 border-b-2" style={{ borderColor: primaryColor }}>
                    <div className="w-1/2">
                        {settings.logo ? (
                            <img 
                                src={settings.logo} 
                                alt="Company Logo" 
                                style={{ 
                                    maxHeight: '110px', 
                                    width: settings.logoWidth ? `${settings.logoWidth}px` : 'auto', 
                                    maxWidth: '100%',
                                    objectFit: 'contain'
                                }} 
                            />
                        ) : (
                            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{settings.companyName || ''}</h1>
                        )}
                        <div className="mt-4 text-xs leading-relaxed text-neutral-600">
                            {settings.address && <p className="font-medium text-neutral-800 mb-1">{renderAddress(settings.address)}</p>}
                            
                            <div className="flex flex-wrap gap-y-1 gap-x-4 mt-2">
                                 {settings.phone && <p>{t('phone')}: {settings.phone}</p>}
                                 {settings.email && <p>{t('email')}: {settings.email}</p>}
                                 {settings.website && <p>Web: {settings.website}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{documentType}</h2>
                        <p className="font-semibold mt-2 text-lg text-neutral-700">#{document.documentId || document.id}</p>
                            <div className="text-xs mt-4 text-neutral-600 space-y-1">
                                <p>{t('date')} : <span className="font-medium text-neutral-900">{new Date(document.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</span></p>
                                {docDueDate && (
                                    <p>{t('dueDate')} : <span className="font-medium text-neutral-900">{new Date(docDueDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</span></p>
                                )}
                                {'expiryDate' in document && document.expiryDate && (
                                    <p>{t('expiryDate')} : <span className="font-medium text-neutral-900">{new Date(document.expiryDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</span></p>
                                )}
                                {docExpectedDate && (
                                    <p>{t('expectedDelivery')} : <span className="font-medium text-neutral-900">{new Date(docExpectedDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</span></p>
                                )}
                                {('purchaseOrderNumber' in document && document.purchaseOrderNumber) && (
                                <p>{t('purchaseOrderNumber')} : <span className="font-medium text-neutral-900">{document.purchaseOrderNumber}</span></p>
                            )}
                            {document.reference && <p>{t('reference')} : <span className="font-medium text-neutral-900">{document.reference}</span></p>}
                        </div>
                    </div>
                </header>

                {/* Client Info */}
                <section className={`mt-8 flex ${clientPosition === 'left' ? 'justify-start' : 'justify-end'}`}>
                    <div className="w-1/2 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                        <p className="text-xs uppercase font-bold text-neutral-500 mb-2">{t('client')} :</p>
                        <div className="font-medium text-base text-neutral-900">
                            {client.company && <p className="font-bold">{client.company}</p>}
                            <p>{client.name}</p>
                        </div>
                        <div className="mt-2 text-sm text-neutral-600">
                            {client.address && <div className="mb-2">{renderAddress(client.address)}</div>}
                            {client.ice && <p>{iceLabel}: {client.ice}</p>}
                            <p>{client.email}</p>
                            <p>{client.phone}</p>
                        </div>
                    </div>
                </section>

                 {(docSubject || docPaymentMethod) && (
                     <section className="mt-6 mb-4 flex gap-10 flex-wrap">
                        {docSubject && <p className="text-sm"><span className="font-bold text-neutral-700">{t('subject')} :</span> {docSubject}</p>}
                        {docPaymentMethod && <p className="text-sm"><span className="font-bold text-neutral-700">{t('paymentMethod') || 'Mode de paiement'} :</span> {docPaymentMethod} {docPaymentMethod === 'Chèque' && docCheckNumber ? `(N° ${docCheckNumber}${docBankName ? ` - ${docBankName}` : ''})` : ''}</p>}
                    </section>
                )}

                {/* Line Items Table */}
                <section className="mt-8 flex-1 overflow-hidden">
                    <table className="w-full text-left table-auto" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ backgroundColor: tableHeaderBgColor, color: headerTextColor }}>
                                {showReference && <th className="py-3 px-4 align-middle font-semibold uppercase text-[10px] rounded-tl-lg rounded-bl-lg w-20 whitespace-nowrap">{getColLabel('reference', t('refLabel'))}</th>}
                                <th className={`py-3 px-2 align-middle font-semibold uppercase text-[10px] ${!showReference ? 'rounded-tl-lg rounded-bl-lg' : ''} min-w-[320px] whitespace-nowrap`}>{getColLabel('name', t('description'))}</th>
                                <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-14 whitespace-nowrap">{getColLabel('unit', t('unit'))}</th>
                                {hasInvoiceQty ? (
                                    <>
                                        <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-12 whitespace-nowrap">{language === 'ar' ? 'الكمية المفوترة' : 'Qté Facturée'}</th>
                                        <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-12 whitespace-nowrap text-emerald-700 bg-emerald-50/60">{getColLabel('avoir', language === 'ar' ? 'كمية الإرجاع' : 'AV')}</th>
                                    </>
                                ) : (
                                    <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-10 whitespace-nowrap">{getColLabel('quantity', t('quantity'))}</th>
                                )}
                                {isM2 && (
                                    <>
                                        <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-10 whitespace-nowrap">Larg.</th>
                                        <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-10 whitespace-nowrap">Haut.</th>
                                        <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-12 whitespace-nowrap">M²</th>
                                    </>
                                )}
                                {isML && (
                                    <>
                                        <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-12 whitespace-nowrap">Long.</th>
                                        <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-12 whitespace-nowrap">ML</th>
                                    </>
                                )}
                                {isKg && (
                                    <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-14 whitespace-nowrap">Poids (kg)</th>
                                )}
                                {!isDeliveryNote && (
                                    <>
                                        <th className="py-3 px-2 align-middle text-right font-semibold uppercase text-[10px] w-20 whitespace-nowrap">{getColLabel('unitPrice', isModeTTC ? (t('puTTCLabel') || 'P.U. TTC') : t('unitPrice'))}</th>
                                        <th className="py-3 px-1 align-middle text-center font-semibold uppercase text-[10px] w-10 whitespace-nowrap">{getColLabel('vat', t('vat'))}</th>
                                        <th className="py-3 px-4 align-middle text-right font-semibold uppercase text-[10px] w-24 rounded-tr-lg rounded-br-lg whitespace-nowrap">{getColLabel('total', isModeTTC ? (t('totalTTCLabel') || 'Total TTC') : t('totalHT'))}</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {document.lineItems.map(item => (
                                <tr key={item.id} className="text-neutral-700 border-b border-slate-300">
                                    {showReference && <td className={`py-3 px-4 align-middle text-[11px] text-neutral-500 ${borderStyle}`}>{item.productCode || '-'}</td>}
                                    <td className={`py-3 px-4 align-middle ${borderStyle}`}>
                                        <div className="text-[10.5px] font-medium text-neutral-900 leading-tight" dangerouslySetInnerHTML={{ __html: item.name }} />
                                        {item.description && <div className="text-[9px] text-neutral-500 mt-1 leading-normal italic font-normal" dangerouslySetInnerHTML={{ __html: item.description }} />}
                                    </td>
                                    <td className={`py-3 px-2 text-center align-middle text-[10px] font-medium ${borderStyle}`}>{item.unit || '-'}</td>
                                    {hasInvoiceQty ? (
                                        <>
                                            <td className={`py-3 px-2 text-center align-middle font-bold text-[11px] text-slate-500 bg-slate-50/50 ${borderStyle}`}>{item.invoiceQuantity !== undefined ? item.invoiceQuantity : item.quantity}</td>
                                            <td className={`py-3 px-2 text-center align-middle font-bold text-[11px] text-emerald-700 bg-emerald-50/30 ${(!isDeliveryNote || isM2 || isML || isKg) ? borderStyle : ''}`}>{(item as any).avoirQuantity ?? (item as any).returnQuantity ?? (item as any).returnedQuantity ?? item.quantity}</td>
                                        </>
                                    ) : (
                                        <td className={`py-3 px-2 text-center align-middle font-bold text-[11px] ${(!isDeliveryNote || isM2 || isML || isKg) ? borderStyle : ''}`}>{item.quantity}</td>
                                    )}
                                    {isM2 && (
                                        <>
                                            <td className={`py-3 px-2 text-center align-middle text-[10px] ${borderStyle}`}>{item.length || 1}</td>
                                            <td className={`py-3 px-2 text-center align-middle text-[10px] ${borderStyle}`}>{item.height || 1}</td>
                                            <td className={`py-3 px-2 text-center align-middle text-[10px] font-medium ${!isDeliveryNote ? borderStyle : ''}`}>{(item.quantity * (item.length || 1) * (item.height || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>
                                        </>
                                    )}
                                    {isML && (
                                        <>
                                            <td className={`py-3 px-2 text-center align-middle text-[10px] ${borderStyle}`}>{item.length || 1}</td>
                                            <td className={`py-3 px-2 text-center align-middle text-[10px] font-medium ${!isDeliveryNote ? borderStyle : ''}`}>{(item.quantity * (item.length || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>
                                        </>
                                    )}
                                    {isKg && (
                                        <td className={`py-3 px-2 text-center align-middle text-[10px] ${borderStyle}`}>{item.weight || 1}</td>
                                    )}
                                    {!isDeliveryNote && (
                                        <>
                                            <td className={`py-3 px-2 text-right align-middle text-[10px] ${borderStyle}`}>{(isModeTTC ? (item.unitPrice * (1 + (item.vat || 0) / 100)) : item.unitPrice).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                                            <td className={`py-3 px-2 text-center align-middle text-[9px] text-neutral-500 ${borderStyle}`}>{item.vat}%</td>
                                            <td className="py-3 px-4 text-right align-middle font-bold text-neutral-900 text-[11px]">{(item.quantity * getLineMultiplier(item) * (isModeTTC ? (item.unitPrice * (1 + (item.vat || 0) / 100)) : item.unitPrice)).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* Notes and Totals */}
                <section className="flex justify-between items-start mt-8">
                    <div className="w-1/2">
                        {document.notes && (
                            <div className="mt-4">
                                <p className="text-xs uppercase font-bold text-neutral-500 mb-2">{t('notes')} :</p>
                                <p className="text-xs text-neutral-600 whitespace-pre-line">{document.notes}</p>
                            </div>
                        )}
                    </div>
                    {!isDeliveryNote && (
                        <div className="w-full max-w-xs space-y-3">
                            <div className="flex justify-between text-neutral-600">
                                <span>{t('totalHT')}</span>
                                <span className="font-medium">{subTotal.toLocaleString('fr-MA', { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span>{t('discount')} {doc.discountType === 'percentage' ? `(${doc.discountValue}%)` : ''}</span>
                                    <span className="font-medium">- {discountAmount.toLocaleString('fr-MA', { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-neutral-600">
                                <span>{t('vat')}</span>
                                <span className="font-medium">{vatAmount.toLocaleString('fr-MA', { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                            </div>
                            <div className="h-px bg-neutral-200 my-2"></div>
                            <div className="flex justify-between text-lg font-bold bg-neutral-50 p-2 rounded" style={{ color: '#000000' }}>
                                <span>{t('totalTTC')}</span>
                                <span>{totalTTC.toLocaleString('fr-MA', { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                            </div>
                        </div>
                    )}
                </section>
                
                {/* Footer */}
                <footer className="mt-auto pt-8 text-center">
                    {settings.footerNotes && <p className="text-sm text-black mb-4 whitespace-pre-line">{settings.footerNotes}</p>}
                    
                    <div className="border-t border-black pt-2 text-[10px] text-black font-normal uppercase tracking-wider">
                         <p>{legalIds}</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default DocumentPreview;
