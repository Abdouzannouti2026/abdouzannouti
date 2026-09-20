
import React, { useState, useMemo, useEffect } from 'react';
import Header from './Header';
import { Archive, Plus, ArrowUpRight, ArrowDownLeft, AlertTriangle, Pencil, X, Search, History, Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, StockMovement } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseDecimalInput, formatDecimalForInput } from '../services/currencyService';

interface StockManagementProps {
    products: Product[];
    movements: StockMovement[];
    onAddMovement: (movement: Omit<StockMovement, 'id'>) => void;
}

const StockManagement: React.FC<StockManagementProps> = ({ products, movements, onAddMovement }) => {
    const { t, isRTL, language } = useLanguage();
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    
    // Main List Search
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination for Global History
    const [movementsPage, setMovementsPage] = useState(1);
    const MOVEMENTS_PER_PAGE = 10;

    // Pagination for Stock Levels
    const [stockPage, setStockPage] = useState(1);
    const STOCK_PER_PAGE = 10;

    // Correction State
    const [productToCorrect, setProductToCorrect] = useState<Product | null>(null);
    const [realQuantityStr, setRealQuantityStr] = useState<string>('0');

    // History Modal State
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterRef, setFilterRef] = useState('');

    // Filter only physical products
    const physicalProducts = products.filter(p => p.productType === 'Produit');

    // Filtered list for display
    const filteredProducts = physicalProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalStockPages = Math.ceil(filteredProducts.length / STOCK_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (stockPage - 1) * STOCK_PER_PAGE,
        stockPage * STOCK_PER_PAGE
    );

    const getPageNumbers = (current: number, total: number) => {
        const pages = [];
        const maxVisible = 5;
        
        if (total <= maxVisible) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            pages.push(1);
            
            if (current > 3) {
                pages.push('...');
            }
            
            const start = Math.max(2, current - 1);
            const end = Math.min(total - 1, current + 1);
            
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            
            if (current < total - 2) {
                pages.push('...');
            }
            
            if (!pages.includes(total)) pages.push(total);
        }
        return pages;
    };

    useEffect(() => {
        setStockPage(1);
    }, [searchTerm]);

    // Sorted and Paginated Movements
    const sortedMovements = useMemo(() => {
        return movements.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [movements]);

    const totalMovementPages = Math.ceil(sortedMovements.length / MOVEMENTS_PER_PAGE);
    const paginatedMovements = sortedMovements.slice(
        (movementsPage - 1) * MOVEMENTS_PER_PAGE, 
        movementsPage * MOVEMENTS_PER_PAGE
    );

    const openCorrectionModal = (product: Product) => {
        setProductToCorrect(product);
        setRealQuantityStr(formatDecimalForInput(product.stockQuantity || 0, language));
        setIsCorrectionModalOpen(true);
    };

    const handleCorrectionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productToCorrect) return;

        const currentStock = productToCorrect.stockQuantity || 0;
        const realQuantity = parseDecimalInput(realQuantityStr);
        const diff = realQuantity - currentStock;

        if (Math.abs(diff) > 0.0001) {
            onAddMovement({
                productId: productToCorrect.id,
                productName: productToCorrect.name,
                date: new Date().toISOString().split('T')[0],
                quantity: diff,
                type: 'Ajustement', 
                reference: language === 'es' ? 'Corrección de inventario' : 'Correction Inventaire'
            });
        }
        setIsCorrectionModalOpen(false);
        setProductToCorrect(null);
        setMovementsPage(1);
    };

    // Filter History Logic
    const getProductHistory = () => {
        if (!historyProduct) return [];
        
        return movements
            .filter(m => m.productId === historyProduct.id)
            .filter(m => {
                const dateMatch = (!filterStartDate || m.date >= filterStartDate) && (!filterEndDate || m.date <= filterEndDate);
                const typeMatch = filterType === 'all' || m.type === filterType;
                const refMatch = !filterRef || (m.reference || '').toLowerCase().includes(filterRef.toLowerCase());
                return dateMatch && typeMatch && refMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const openHistoryModal = (product: Product) => {
        setHistoryProduct(product);
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterType('all');
        setFilterRef('');
    };

    const getTranslatedType = (type: string) => {
        switch(type) {
            case 'Initial': return t('mInitial');
            case 'Vente': return t('mVente');
            case 'Achat': return t('mAchat');
            case 'Ajustement': return t('mAjustement');
            case 'Retour': return t('mRetour');
            default: return type;
        }
    };

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'}>
            <Header title={t('stock')} />

            {/* Stock Levels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm ring-1 ring-neutral-200 overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="text-lg font-semibold text-neutral-900">{t('stockLevels')}</h3>
                        <div className="relative w-full sm:w-64">
                            <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                                <Search className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                            </div>
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('search')}
                                className={`block w-full rounded-md border-neutral-300 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 ${isRTL ? 'pr-10' : 'pl-10'}`}
                            />
                        </div>
                    </div>

                    {/* Mobile Card View for Stock Levels */}
                    <div className="md:hidden divide-y divide-neutral-200">
                        {paginatedProducts.length > 0 ? (
                            paginatedProducts.map(product => (
                                <div key={product.id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-sm font-medium text-neutral-900">{product.name}</div>
                                            <div className="text-xs text-neutral-500 font-mono">{product.productCode}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-neutral-900">{formatDecimalForInput(product.stockQuantity || 0, language)}</div>
                                            {(product.stockQuantity || 0) <= (product.minStockAlert || 5) ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                                                    <AlertTriangle className="w-2.5 h-2.5 mr-1"/> {t('lowStock')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                                                    {t('stockOk')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
                                        <button 
                                            onClick={() => openHistoryModal(product)}
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium"
                                        >
                                            <History size={16} />
                                            {t('history')}
                                        </button>
                                        <button 
                                            onClick={() => openCorrectionModal(product)}
                                            className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 text-xs font-medium"
                                        >
                                            <Pencil size={16} />
                                            {t('edit')}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-6 py-8 text-center text-neutral-500">{t('noFinancialData')}</div>
                        )}
                    </div>

                    {/* Desktop Table View for Stock Levels */}
                    <div className="hidden md:block overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-white sticky top-0 z-10">
                                <tr>
                                    <th className={`px-6 py-3 text-xs font-semibold text-neutral-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('pProduct')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">{t('quantity')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">{t('status')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 bg-white">
                                {paginatedProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="text-sm font-medium text-neutral-900">{product.name}</div>
                                            <div className="text-xs text-neutral-500 font-mono">{product.productCode}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center font-bold text-lg">{formatDecimalForInput(product.stockQuantity || 0, language)}</td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            {(product.stockQuantity || 0) <= (product.minStockAlert || 5) ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <AlertTriangle className="w-3 h-3 mr-1"/> {t('lowStock')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {t('stockOk')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => openHistoryModal(product)}
                                                    className="text-blue-500 hover:text-blue-700 transition-colors p-1.5 rounded-md hover:bg-blue-50"
                                                    title={t('history')}
                                                >
                                                    <History size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => openCorrectionModal(product)}
                                                    className="text-neutral-400 hover:text-emerald-600 transition-colors p-1.5 rounded-md hover:bg-emerald-50"
                                                    title={t('edit')}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">{t('noFinancialData')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination for Stock Levels */}
                    {totalStockPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-neutral-200">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setStockPage(prev => Math.max(prev - 1, 1))}
                                    disabled={stockPage === 1}
                                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                                >
                                    {isRTL ? 'التالي' : 'Précédent'}
                                </button>
                                <button
                                    onClick={() => setStockPage(prev => Math.min(prev + 1, totalStockPages))}
                                    disabled={stockPage === totalStockPages}
                                    className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                                >
                                    {isRTL ? 'السابق' : 'Suivant'}
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-neutral-700">
                                        {isRTL ? (
                                            <>عرض <span className="font-bold">{(stockPage - 1) * STOCK_PER_PAGE + 1}</span> إلى <span className="font-bold">{Math.min(stockPage * STOCK_PER_PAGE, filteredProducts.length)}</span> من <span className="font-bold">{filteredProducts.length}</span> منتج</>
                                        ) : (
                                            <>Affichage de <span className="font-bold">{(stockPage - 1) * STOCK_PER_PAGE + 1}</span> à <span className="font-bold">{Math.min(stockPage * STOCK_PER_PAGE, filteredProducts.length)}</span> sur <span className="font-bold">{filteredProducts.length}</span> produits</>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setStockPage(prev => Math.max(prev - 1, 1))}
                                            disabled={stockPage === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                                        >
                                            <ChevronLeft size={18} className={isRTL ? 'rotate-180' : ''} />
                                        </button>
                                        {getPageNumbers(stockPage, totalStockPages).map((page, i) => (
                                            <React.Fragment key={i}>
                                                {page === '...' ? (
                                                    <span className="relative inline-flex items-center px-4 py-2 border border-neutral-300 bg-white text-sm font-medium text-neutral-400">
                                                        ...
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setStockPage(page as number)}
                                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${stockPage === page ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600 font-bold' : 'bg-white border-neutral-300 text-neutral-500 hover:bg-neutral-50'}`}
                                                    >
                                                        {page}
                                                    </button>
                                                )}
                                            </React.Fragment>
                                        ))}
                                        <button
                                            onClick={() => setStockPage(prev => Math.min(prev + 1, totalStockPages))}
                                            disabled={stockPage === totalStockPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                                        >
                                            <ChevronRight size={18} className={isRTL ? 'rotate-180' : ''} />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Movements Widget (Paginated) */}
                <div className="bg-white rounded-lg shadow-sm ring-1 ring-neutral-200 overflow-hidden flex flex-col h-full lg:max-h-[600px]">
                    <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-neutral-900">{t('lastMovements')}</h3>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setMovementsPage(p => Math.max(1, p - 1))}
                                disabled={movementsPage === 1}
                                className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={18} className={isRTL ? 'rotate-180' : ''}/>
                            </button>
                            <span className="text-xs font-medium text-gray-500 w-12 text-center">
                                {totalMovementPages === 0 ? 0 : movementsPage} / {totalMovementPages}
                            </span>
                            <button 
                                onClick={() => setMovementsPage(p => Math.min(totalMovementPages, p + 1))}
                                disabled={movementsPage === totalMovementPages || totalMovementPages === 0}
                                className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight size={18} className={isRTL ? 'rotate-180' : ''}/>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-4 space-y-3 overflow-hidden">
                        {paginatedMovements.length > 0 ? (
                            paginatedMovements.map(movement => (
                                <div key={movement.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-emerald-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full flex-shrink-0 ${movement.quantity > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {movement.quantity > 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-neutral-900 truncate max-w-[120px] sm:max-w-[150px]">{movement.productName}</p>
                                            <p className="text-xs text-neutral-500">{new Date(movement.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'fr-FR')} • {getTranslatedType(movement.type)}</p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold whitespace-nowrap ml-2 ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {movement.quantity > 0 ? '+' : ''}{formatDecimalForInput(movement.quantity, language)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-neutral-500 py-12 flex flex-col items-center">
                                <Archive className="h-10 w-10 text-gray-300 mb-2" />
                                <p>{t('noMovements')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Correction Modal */}
            {isCorrectionModalOpen && productToCorrect && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{t('stockCorrection')}</h3>
                            <button onClick={() => setIsCorrectionModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('pProduct')} : <span className="font-semibold text-gray-800">{productToCorrect.name}</span><br/>
                            {t('stock')} : {formatDecimalForInput(productToCorrect.stockQuantity || 0, language)}
                        </p>
                        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('realQuantity')}</label>
                                <input 
                                    type="text" 
                                    value={realQuantityStr} 
                                    onChange={e => setRealQuantityStr(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-lg font-semibold"
                                    required
                                />
                                <p className="text-xs text-blue-600 mt-1">
                                    {language === 'es' ? 'Se calculará automáticamente la diferencia' : 'Le système calculera automatiquement la différence'} ({parseDecimalInput(realQuantityStr) - (productToCorrect.stockQuantity || 0) > 0 ? '+' : ''}{formatDecimalForInput(parseDecimalInput(realQuantityStr) - (productToCorrect.stockQuantity || 0), language)}).
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsCorrectionModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">{t('cancel')}</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">{t('validateCorrection')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* History Modal remains same... */}
        </div>
    );
};

export default StockManagement;
