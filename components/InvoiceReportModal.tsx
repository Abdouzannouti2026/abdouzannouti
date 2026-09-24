import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Search, FileText, Calculator } from 'lucide-react';
import { Invoice, InvoiceStatus, Client, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface InvoiceReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoices: Invoice[];
    clients: Client[];
    companySettings: CompanySettings | null;
}

const InvoiceReportModal: React.FC<InvoiceReportModalProps> = ({
    isOpen,
    onClose,
    invoices,
    clients,
    companySettings
}) => {
    const { t, language, isRTL } = useLanguage();
    
    // Set default date range: first day of current year to today
    const currentYear = new Date().getFullYear();
    const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTrigger, setFilterTrigger] = useState(0);

    const handleSearch = () => {
        setFilterTrigger(prev => prev + 1);
    };

    const currencyCode = companySettings?.defaultCurrencyCode || 'MAD';

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('fr-FR', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('fr-FR');
        } catch {
            return dateStr;
        }
    };

    // Filter and compute data based on active range
    const { filteredInvoices, totals } = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Filter out drafts if requested, but let's show all valid invoices
        const result = invoices.filter(invoice => {
            const invDate = new Date(invoice.date);
            return invDate >= start && invDate <= end && invoice.status !== InvoiceStatus.Draft;
        }).sort((a, b) => a.date.localeCompare(b.date));

        // Calculate totals
        const computedTotals = result.reduce((acc, inv) => {
            const ht = inv.subTotal !== undefined ? inv.subTotal : (inv.amount - (inv.vatAmount || 0));
            const tva = inv.vatAmount || 0;
            const ttc = inv.amount;
            const paid = inv.amountPaid || 0;
            const remaining = ttc - paid;

            return {
                ht: acc.ht + ht,
                tva: acc.tva + tva,
                ttc: acc.ttc + ttc,
                paid: acc.paid + paid,
                remaining: acc.remaining + remaining
            };
        }, { ht: 0, tva: 0, ttc: 0, paid: 0, remaining: 0 });

        return {
            filteredInvoices: result,
            totals: computedTotals
        };
    }, [invoices, startDate, endDate, filterTrigger]);

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Veuillez autoriser les pop-ups pour imprimer le rapport.");
            return;
        }

        const tableRowsHtml = filteredInvoices.map((inv) => {
            const ht = inv.subTotal !== undefined ? inv.subTotal : (inv.amount - (inv.vatAmount || 0));
            const isPaid = inv.status === InvoiceStatus.Paid || inv.amountPaid >= inv.amount;
            return `
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; white-space: nowrap;">${formatDate(inv.date)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-weight: 600; white-space: nowrap;">${inv.documentId || inv.id}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${inv.clientName}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; font-family: monospace;">${formatCurrency(ht)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; font-family: monospace;">${formatCurrency(inv.vatAmount || 0)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(inv.amount)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; font-family: monospace; color: #1e293b;">${formatCurrency(inv.amountPaid || 0)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; font-family: monospace; color: #1e293b;">${formatCurrency(inv.amount - (inv.amountPaid || 0))}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center; font-weight: bold; color: #1e293b;">
                        ${isPaid ? "OUI" : "NON"}
                    </td>
                </tr>
            `;
        }).join("");

        const companyName = companySettings?.companyName || "Ma Société";
        const address = companySettings?.address ? `<p class="text-xs text-slate-500 mt-1" style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">${companySettings.address}</p>` : '';
        const contactInfo = companySettings?.phone ? `<p class="text-xs text-slate-500" style="font-size: 12px; color: #64748b; margin: 0;">${companySettings.phone} ${companySettings.email ? `| ${companySettings.email}` : ''}</p>` : '';
        const iceInfo = companySettings?.ice ? `<p class="text-xs text-slate-500" style="font-size: 12px; color: #64748b; margin: 0;">ICE: ${companySettings.ice}</p>` : '';

        printWindow.document.open();
        printWindow.document.write(`
            <html>
                <head>
                    <title>Etat Global des Bons</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        body {
                            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                            padding: 24px;
                            background: white;
                            color: black;
                            -webkit-print-color-adjust: exact;
                        }
                        @media print {
                            @page { margin: 15mm; size: A4 portrait; }
                            body { margin: 0; padding: 10px; }
                        }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                        th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
                        th { background-color: #f1f5f9; font-weight: bold; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
                        .font-bold { font-weight: bold; }
                        .font-semibold { font-weight: 600; }
                        .mt-1 { margin-top: 4px; }
                        .mt-2 { margin-top: 8px; }
                        .mt-4 { margin-top: 16px; }
                        .mt-6 { margin-top: 24px; }
                        .mt-8 { margin-top: 32px; }
                        .mt-12 { margin-top: 48px; }
                        .mb-6 { margin-bottom: 24px; }
                        .mb-8 { margin-bottom: 32px; }
                        .pb-6 { padding-bottom: 24px; }
                        .pb-4 { padding-bottom: 16px; }
                        .border-b-2 { border-bottom-width: 2px; }
                        .border-slate-800 { border-color: #1e293b; }
                        .flex { display: flex; }
                        .justify-between { justify-content: space-between; }
                        .items-start { align-items: flex-start; }
                        .text-2xl { font-size: 24px; }
                        .text-xl { font-size: 20px; }
                        .text-lg { font-size: 18px; }
                        .text-sm { font-size: 14px; }
                        .text-xs { font-size: 12px; }
                        .text-slate-900 { color: #0f172a; }
                        .text-slate-800 { color: #1e293b; }
                        .text-slate-600 { color: #475569; }
                        .text-slate-500 { color: #64748b; }
                        .text-slate-400 { color: #94a3b8; }
                        .uppercase { text-transform: uppercase; }
                        .tracking-tight { letter-spacing: -0.025em; }
                        .tracking-wider { letter-spacing: 0.05em; }
                        .grid { display: grid; }
                        .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
                        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                        .gap-4 { gap: 16px; }
                        .gap-12 { gap: 48px; }
                        .rounded-lg { border-radius: 8px; }
                        .p-4 { padding: 16px; }
                        .bg-slate-50 { background-color: #f8fafc; }
                        .text-emerald-600 { color: #059669; }
                        .text-emerald-700 { color: #047857; }
                        .text-blue-600 { color: #2563eb; }
                        .text-blue-700 { color: #1d4ed8; }
                        .text-rose-600 { color: #e11d48; }
                        .text-rose-700 { color: #be123c; }
                        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                        .whitespace-nowrap { white-space: nowrap; }
                        .h-24 { height: 96px; }
                    </style>
                </head>
                <body>
                    <!-- Print Header -->
                    <div class="mb-8 border-b-2 border-slate-800 pb-6">
                        <div class="flex justify-between items-start">
                            <div>
                                <h1 class="text-2xl font-bold uppercase tracking-tight text-slate-900">${companyName}</h1>
                                ${address}
                                ${contactInfo}
                                ${iceInfo}
                            </div>
                            <div class="text-right">
                                <h2 class="text-xl font-black text-slate-800 uppercase tracking-wider">ETAT GLOBAL DES FACTURES</h2>
                                <p class="text-xs font-semibold text-slate-600 mt-2">
                                    Période : ${formatDate(startDate)} au ${formatDate(endDate)}
                                </p>
                                <p class="text-[10px] text-slate-400 mt-1">Généré le ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Print Totals Summary Box -->
                    <div class="grid grid-cols-5 gap-4 border border-slate-300 rounded-lg p-4 mb-6 bg-slate-50 text-xs">
                        <div>
                            <p class="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Total Chiffre d'Affaires HT</p>
                            <p class="text-sm font-bold text-slate-800 mt-1">${formatCurrency(totals.ht)}</p>
                        </div>
                        <div>
                            <p class="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Total TVA</p>
                            <p class="text-sm font-bold text-slate-800 mt-1">${formatCurrency(totals.tva)}</p>
                        </div>
                        <div>
                            <p class="font-semibold text-emerald-600 uppercase text-[10px] tracking-wider">Total Chiffre d'Affaires TTC</p>
                            <p class="text-sm font-bold text-emerald-700 mt-1">${formatCurrency(totals.ttc)}</p>
                        </div>
                        <div>
                            <p class="font-semibold text-blue-600 uppercase text-[10px] tracking-wider">Total Encaissé (Avances)</p>
                            <p class="text-sm font-bold text-blue-700 mt-1">${formatCurrency(totals.paid)}</p>
                        </div>
                        <div>
                            <p class="font-semibold text-rose-600 uppercase text-[10px] tracking-wider">Total Reste à Recouvrer</p>
                            <p class="text-sm font-bold text-rose-700 mt-1">${formatCurrency(totals.remaining)}</p>
                        </div>
                    </div>

                    <!-- Print Main Table -->
                    <table class="w-full text-left border-collapse border border-slate-300 text-xs">
                        <thead>
                            <tr class="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase">
                                <th class="border border-slate-300 px-3 py-2">Date bon</th>
                                <th class="border border-slate-300 px-3 py-2">Ref</th>
                                <th class="border border-slate-300 px-3 py-2">Client</th>
                                <th class="border border-slate-300 px-3 py-2 text-right">Total HT</th>
                                <th class="border border-slate-300 px-3 py-2 text-right">Total TVA</th>
                                <th class="border border-slate-300 px-3 py-2 text-right">Total TTC</th>
                                <th class="border border-slate-300 px-3 py-2 text-right">Avance</th>
                                <th class="border border-slate-300 px-3 py-2 text-right">Reste</th>
                                <th class="border border-slate-300 px-3 py-2 text-center">Réglé</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                            ${tableRowsHtml}
                            <!-- Table Totals Row -->
                            <tr class="bg-slate-100 font-bold border-t border-slate-300 uppercase">
                                <td colspan="3" class="border border-slate-300 px-3 py-2 text-left">Total Général</td>
                                <td class="border border-slate-300 px-3 py-2 text-right font-mono">${formatCurrency(totals.ht)}</td>
                                <td class="border border-slate-300 px-3 py-2 text-right font-mono">${formatCurrency(totals.tva)}</td>
                                <td class="border border-slate-300 px-3 py-2 text-right font-mono">${formatCurrency(totals.ttc)}</td>
                                <td class="border border-slate-300 px-3 py-2 text-right font-mono text-emerald-700">${formatCurrency(totals.paid)}</td>
                                <td class="border border-slate-300 px-3 py-2 text-right font-mono text-rose-700">${formatCurrency(totals.remaining)}</td>
                                <td class="border border-slate-300 px-3 py-2 text-center">-</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Print Signatures Block -->
                    <div class="mt-12 grid grid-cols-2 gap-12 text-xs">
                        <div></div>
                        <div class="text-right">
                            <p class="font-semibold text-slate-800">Cachet & Signature de l'Entreprise</p>
                            <div class="h-24"></div>
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Etat Global des Bons</h2>
                            <p className="text-xs text-slate-500">Générez et imprimez un rapport professionnel des bons de vente</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Content / Filters */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="grid grid-cols-2 gap-4 flex-1 w-full">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Date de début (Du)
                                </label>
                                <input 
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Date de fin (Au)
                                </label>
                                <input 
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2.5 w-full md:w-auto shrink-0">
                            <button
                                onClick={handleSearch}
                                className="btn-primary flex-1 md:flex-none"
                            >
                                <Search size={16} />
                                <span>Recherche</span>
                            </button>
                            <button
                                onClick={handlePrint}
                                className="btn-secondary flex-1 md:flex-none"
                            >
                                <Printer size={16} />
                                <span>Imprimer le rapport</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Interactive KPI Cards */}
                <div className="px-6 pt-5 pb-2 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-slate-50/70 border border-slate-200/80 p-3.5 rounded-xl">
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total HT</p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 mt-1">{formatCurrency(totals.ht)}</p>
                    </div>
                    <div className="bg-slate-50/70 border border-slate-200/80 p-3.5 rounded-xl">
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total TVA</p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 mt-1">{formatCurrency(totals.tva)}</p>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-xl">
                        <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">Total TTC</p>
                        <p className="text-sm sm:text-base font-bold text-emerald-700 mt-1">{formatCurrency(totals.ttc)}</p>
                    </div>
                    <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-xl">
                        <p className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider">Total Encaissé</p>
                        <p className="text-sm sm:text-base font-bold text-blue-700 mt-1">{formatCurrency(totals.paid)}</p>
                    </div>
                    <div className="bg-rose-50/60 border border-rose-100 p-3.5 rounded-xl col-span-2 md:col-span-1">
                        <p className="text-[11px] text-rose-700 font-semibold uppercase tracking-wider">Reste à Recouvrer</p>
                        <p className="text-sm sm:text-base font-bold text-rose-700 mt-1">{formatCurrency(totals.remaining)}</p>
                    </div>
                </div>

                {/* Modal Main Table Area */}
                <div className="flex-1 overflow-auto px-6 py-4 custom-scrollbar">
                    {filteredInvoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <FileText size={40} className="stroke-1 mb-3 text-slate-300" />
                            <p className="text-xs font-semibold">Aucun bon trouvé pour la période sélectionnée.</p>
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                                        <th className="px-4 py-3">Date bon</th>
                                        <th className="px-4 py-3">Ref</th>
                                        <th className="px-4 py-3">Client</th>
                                        <th className="px-4 py-3 text-right">Total HT</th>
                                        <th className="px-4 py-3 text-right">Total TVA</th>
                                        <th className="px-4 py-3 text-right">Total TTC</th>
                                        <th className="px-4 py-3 text-right">Avance</th>
                                        <th className="px-4 py-3 text-right">Reste</th>
                                        <th className="px-4 py-3 text-center">Réglé</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                    {filteredInvoices.map((inv) => {
                                        const ht = inv.subTotal !== undefined ? inv.subTotal : (inv.amount - (inv.vatAmount || 0));
                                        const isPaid = inv.status === InvoiceStatus.Paid || inv.amountPaid >= inv.amount;
                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(inv.date)}</td>
                                                <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{inv.documentId || inv.id}</td>
                                                <td className="px-4 py-2.5 truncate max-w-[200px]">{inv.clientName}</td>
                                                <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(ht)}</td>
                                                <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(inv.vatAmount || 0)}</td>
                                                <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(inv.amount)}</td>
                                                <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-600">{formatCurrency(inv.amountPaid || 0)}</td>
                                                <td className="px-4 py-2.5 text-right font-mono font-semibold text-rose-600">{formatCurrency(inv.amount - (inv.amountPaid || 0))}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isPaid}
                                                        readOnly 
                                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-default" 
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Table Totals Row */}
                                    <tr className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-300 text-xs uppercase">
                                        <td colSpan={3} className="px-4 py-3">Total Général</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.ht)}</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.tva)}</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.ttc)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(totals.paid)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-rose-700">{formatCurrency(totals.remaining)}</td>
                                        <td className="px-4 py-3 text-center">-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer buttons */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2.5">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        Fermer
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={filteredInvoices.length === 0}
                        className="btn-primary"
                    >
                        <Printer size={16} />
                        <span>Imprimer</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default InvoiceReportModal;
