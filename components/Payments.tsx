
import React, { useState } from 'react';
import Header from './Header';
import { CreditCard, Search } from 'lucide-react';
import { Payment, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface PaymentsProps {
    companySettings?: CompanySettings | null;
    payments: Payment[];
}

const Payments: React.FC<PaymentsProps> = ({ payments, companySettings }) => {
    const { t, isRTL, language } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPayments = payments.filter(p => {
        const term = searchTerm.toLowerCase();
        return (
            (p.clientName || '').toLowerCase().includes(term) ||
            (p.invoiceNumber || '').toLowerCase().includes(term)
        );
    });

    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);
    const locale = language === 'es' ? 'es-ES' : (language === 'ar' ? 'ar-MA' : 'fr-FR');

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'}>
            <Header title={t('paymentHistory')} />

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className={`p-4 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-center gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <div className="relative max-w-sm w-full">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                           <Search className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-400" aria-hidden="true" />
                        </div>
                        <input
                           type="search"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           placeholder={t('searchPaymentPlaceholder')}
                           className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs sm:text-sm ${isRTL ? 'pr-9 sm:pr-10' : 'pl-9 sm:pl-10'}`}
                        />
                    </div>
                    <div className={`text-xs sm:text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('totalCollected')} : <span className="font-bold text-emerald-600">{totalCollected.toLocaleString(locale, { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</span>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('invoices')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('type')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {filteredPayments.length > 0 ? (
                                filteredPayments.slice().reverse().map((payment) => (
                                    <tr key={payment.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(payment.date).toLocaleDateString(locale)}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900 ${isRTL ? 'text-right' : 'text-left'}`}>{payment.clientName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-emerald-600 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>#{payment.invoiceNumber}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className="inline-flex items-center gap-1">
                                                <CreditCard size={14} /> {payment.method}
                                            </span>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-neutral-900 ${isRTL ? 'text-left' : 'text-right'}`}>{payment.amount.toLocaleString(locale, { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 px-6 text-sm text-neutral-500">
                                        <div className="flex flex-col items-center">
                                            <CreditCard className="h-10 w-10 text-neutral-400 mb-2 opacity-50" />
                                            <h3 className="font-semibold text-neutral-800">{t('noPaymentsFound')}</h3>
                                            <p className="mt-1">{t('paymentsDesc')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-neutral-200">
                    {filteredPayments.length > 0 ? (
                        filteredPayments.slice().reverse().map((payment) => (
                            <div key={payment.id} className="p-4 hover:bg-emerald-50/60 transition-colors duration-200">
                                <div className={`flex justify-between items-start mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div>
                                        <p className={`text-xs text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {new Date(payment.date).toLocaleDateString(locale)}
                                        </p>
                                        <p className={`text-sm font-medium text-neutral-900 mt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {payment.clientName}
                                        </p>
                                    </div>
                                    <p className="text-sm font-bold text-neutral-900">
                                        {payment.amount.toLocaleString(locale, { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}
                                    </p>
                                </div>
                                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <p className="text-xs text-emerald-600 font-medium">#{payment.invoiceNumber}</p>
                                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                                        <CreditCard size={12} /> {payment.method}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 px-6 text-sm text-neutral-500">
                            <CreditCard className="h-10 w-10 text-neutral-400 mx-auto mb-2 opacity-50" />
                            <h3 className="font-semibold text-neutral-800">{t('noPaymentsFound')}</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Payments;
