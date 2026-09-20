
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product, ProductVariant } from '../types';
import { X, Plus, Trash2, Layers, Barcode, Camera, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { generateBarcodeNumber } from '../utils/barcode';
import { roundPrice } from '../services/currencyService';
import BarcodeScannerModal from './BarcodeScannerModal';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Omit<Product, 'id'>, id?: string) => void;
    productToEdit: Product | null;
    existingCategories?: string[];
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSave, productToEdit, existingCategories = [] }) => {
    const { t, language } = useLanguage();
    const [name, setName] = useState('');
    const [productCode, setProductCode] = useState('');
    const [barcode, setBarcode] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [salePrice, setSalePrice] = useState(0);
    const [salePriceTTC, setSalePriceTTC] = useState(0);
    const [purchasePrice, setPurchasePrice] = useState(0);
    const [purchasePriceTTC, setPurchasePriceTTC] = useState(0);
    const [vat, setVat] = useState(20);
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [productType, setProductType] = useState<'Produit' | 'Service'>('Produit');
    const [unitOfMeasure, setUnitOfMeasure] = useState('Unité');
    const [minStockAlert, setMinStockAlert] = useState(5);
    
    // Variants state
    const [hasVariants, setHasVariants] = useState(false);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [stockQuantity, setStockQuantity] = useState(0);

    const isEditMode = productToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setName(productToEdit.name);
                setProductCode(productToEdit.productCode || '');
                setBarcode(productToEdit.barcode || '');
                setSalePrice(productToEdit.salePrice);
                setSalePriceTTC(roundPrice(productToEdit.salePrice * (1 + productToEdit.vat / 100)));
                setPurchasePrice(productToEdit.purchasePrice);
                setPurchasePriceTTC(roundPrice(productToEdit.purchasePrice * (1 + productToEdit.vat / 100)));
                setVat(productToEdit.vat);
                setCategory(productToEdit.category || '');
                setDescription(productToEdit.description || '');
                setProductType(productToEdit.productType === 'Service' ? 'Service' : 'Produit');
                setUnitOfMeasure(productToEdit.unitOfMeasure || 'Unité');
                setMinStockAlert(productToEdit.minStockAlert || 5);
                setHasVariants(!!productToEdit.hasVariants);
                setVariants(productToEdit.variants || []);
                setStockQuantity(productToEdit.stockQuantity || 0);
            } else {
                setName('');
                setProductCode('');
                setBarcode('');
                setSalePrice(0);
                setSalePriceTTC(0);
                setPurchasePrice(0);
                setPurchasePriceTTC(0);
                setVat(20);
                setCategory('');
                setDescription('');
                setProductType('Produit');
                setUnitOfMeasure('Unité');
                setMinStockAlert(5);
                setHasVariants(false);
                setVariants([]);
                setStockQuantity(0);
            }
        }
    }, [productToEdit, isOpen]);

    // Update total stock when variants change
    useEffect(() => {
        if (hasVariants && variants.length > 0) {
            const total = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
            setStockQuantity(total);
        }
    }, [variants, hasVariants]);

    const handleSalePriceHTChange = (val: number) => {
        setSalePrice(val);
        setSalePriceTTC(roundPrice(val * (1 + vat / 100)));
    };

    const handleSalePriceTTCChange = (val: number) => {
        setSalePriceTTC(val);
        setSalePrice(roundPrice(val / (1 + vat / 100)));
    };

    const handlePurchasePriceHTChange = (val: number) => {
        setPurchasePrice(val);
        setPurchasePriceTTC(roundPrice(val * (1 + vat / 100)));
    };

    const handlePurchasePriceTTCChange = (val: number) => {
        setPurchasePriceTTC(val);
        setPurchasePrice(roundPrice(val / (1 + vat / 100)));
    };

    const handleVatChange = (newVat: number) => {
        setVat(newVat);
        setSalePriceTTC(roundPrice(salePrice * (1 + newVat / 100)));
        setPurchasePriceTTC(roundPrice(purchasePrice * (1 + newVat / 100)));
    };

    const addVariant = () => {
        const newVariant: ProductVariant = {
            id: `${Date.now()}`,
            name: `${name} - `,
            attributeValue: '',
            stockQuantity: 0
        };
        setVariants([...variants, newVariant]);
    };

    const removeVariant = (id: string) => {
        setVariants(variants.filter(v => v.id !== id));
    };

    const updateVariant = (id: string, updates: Partial<ProductVariant>) => {
        setVariants(variants.map(v => v.id === id ? { ...v, ...updates } : v));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert(t('name'));
            return;
        }

        const isService = productType === 'Service';
        
        onSave({ 
            name,
            productCode,
            barcode,
            category,
            description,
            productType,
            unitOfMeasure,
            salePrice, 
            purchasePrice, 
            vat,
            stockQuantity: isService ? 0 : stockQuantity,
            minStockAlert: isService ? 0 : minStockAlert,
            hasVariants: isService ? false : hasVariants,
            variants: (hasVariants && !isService) ? variants : []
        }, productToEdit?.id);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200" aria-modal="true">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <Plus size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{isEditMode ? t('editProduct') : t('newProduct')}</h3>
                            <p className="text-xs text-slate-500">{isEditMode ? (language === 'fr' ? 'Modifier les caractéristiques de l\'article' : 'Update item specifications') : (language === 'fr' ? 'Créer un nouvel article ou prestation' : 'Create a new item or service')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                
                <form id="productForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Plus size={14} className="text-emerald-600" /> Informations de base
                            </h4>
                            <div>
                                <label htmlFor="productName" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('name')} <span className="text-rose-500">*</span></label>
                                <input 
                                    type="text"
                                    id="productName" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    placeholder="Ex: T-shirt Coton"
                                    className="w-full"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="productType" className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
                                    <select id="productType" value={productType} onChange={(e) => setProductType(e.target.value as 'Produit' | 'Service')} className="w-full">
                                        <option value="Produit">Produit</option>
                                        <option value="Service">Service</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="modalProductCode" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('reference')}</label>
                                    <input 
                                        type="text" 
                                        id="modalProductCode" 
                                        value={productCode} 
                                        onChange={(e) => setProductCode(e.target.value)} 
                                        placeholder="Ex: REF-001"
                                        className="w-full font-mono text-sm"
                                    />
                                </div>
                            </div>

                            {/* Code Barres field */}
                            <div>
                                <label htmlFor="modalBarcode" className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <Barcode size={14} className="text-emerald-600" />
                                    <span>Code-Barres / Douchette</span>
                                </label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        id="modalBarcode" 
                                        value={barcode} 
                                        onChange={(e) => setBarcode(e.target.value)} 
                                        placeholder="Ex: 6111234567890"
                                        className="flex-1 font-mono text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsScannerOpen(true)}
                                        title="Scanner avec la caméra"
                                        className="px-3 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 rounded-xl border border-slate-200 transition-all flex items-center gap-1 font-semibold text-xs active:scale-95"
                                    >
                                        <Camera size={15} />
                                        <span className="hidden sm:inline">Scan</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBarcode(generateBarcodeNumber())}
                                        title="Générer un code-barres"
                                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all flex items-center gap-1 font-semibold text-xs active:scale-95"
                                    >
                                        <Sparkles size={14} className="text-amber-500" />
                                        <span className="hidden sm:inline">Générer</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="modalCategory" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('category')}</label>
                                <input 
                                    type="text" 
                                    id="modalCategory" 
                                    value={category} 
                                    onChange={(e) => setCategory(e.target.value)} 
                                    list="modal-categories-list"
                                    placeholder="Sélectionnez ou tapez..."
                                    className="w-full" 
                                />
                                <datalist id="modal-categories-list">
                                    {existingCategories.map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Trash2 size={14} className="rotate-180 text-emerald-600" /> {t('pricing')} & Stock
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="salePrice" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('salePrice')} (HT)</label>
                                    <input type="number" step="0.01" id="salePrice" value={salePrice} onChange={(e) => handleSalePriceHTChange(parseFloat(e.target.value) || 0)} className="w-full font-semibold" />
                                </div>
                                <div>
                                    <label htmlFor="salePriceTTC" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('salePrice')} (TTC)</label>
                                    <input type="number" step="0.01" id="salePriceTTC" value={salePriceTTC} onChange={(e) => handleSalePriceTTCChange(parseFloat(e.target.value) || 0)} className="w-full font-semibold" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                 <div>
                                    <label htmlFor="purchasePrice" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('purchasePrice')} (HT)</label>
                                    <input type="number" step="0.01" id="purchasePrice" value={purchasePrice} onChange={(e) => handlePurchasePriceHTChange(parseFloat(e.target.value) || 0)} className="w-full font-semibold" />
                                </div>
                                {productType !== 'Service' && (
                                     <div>
                                        <label id="stock-label" className="block text-xs font-semibold text-slate-700 mb-1.5">Stock Initial</label>
                                        <input 
                                            type="number" 
                                            value={stockQuantity} 
                                            onChange={(e) => !hasVariants && setStockQuantity(parseFloat(e.target.value) || 0)} 
                                            disabled={hasVariants}
                                            className={`w-full font-semibold ${hasVariants ? 'bg-slate-50 text-slate-400 italic' : ''}`} 
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="vat" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('vat')}</label>
                                    <select id="vat" value={vat} onChange={(e) => handleVatChange(parseInt(e.target.value))} className="w-full">
                                        <option value={20}>20%</option>
                                        <option value={14}>14%</option>
                                        <option value={10}>10%</option>
                                        <option value={7}>7%</option>
                                        <option value={0}>0%</option>
                                    </select>
                                </div>
                                {productType !== 'Service' && (
                                    <div>
                                        <label htmlFor="minStockAlert" className="block text-xs font-semibold text-slate-700 mb-1.5">Alerte Stock Min</label>
                                        <input 
                                            type="number" 
                                            id="minStockAlert"
                                            value={minStockAlert} 
                                            onChange={(e) => setMinStockAlert(parseFloat(e.target.value) || 0)} 
                                            className="w-full font-semibold" 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {productType !== 'Service' && (
                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Layers className="text-slate-400" size={18} />
                                    <span className="text-sm font-semibold text-slate-800">Gestion des variantes</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={hasVariants}
                                        onChange={(e) => setHasVariants(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    <span className="ml-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Activer</span>
                                </label>
                            </div>

                            {hasVariants && (
                                <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                                    <div className="grid grid-cols-12 gap-3 mb-1 px-2">
                                        <div className="col-span-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nom de la variante</div>
                                        <div className="col-span-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valeur (XL, M..)</div>
                                        <div className="col-span-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stock</div>
                                        <div className="col-span-1"></div>
                                    </div>
                                    
                                    {variants.map((variant) => (
                                        <div key={variant.id} className="grid grid-cols-12 gap-3 items-center">
                                            <div className="col-span-6">
                                                <input 
                                                    type="text"
                                                    value={variant.name}
                                                    onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                                                    placeholder="Ex: T-shirt - XL"
                                                    className="w-full text-sm"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input 
                                                    type="text"
                                                    value={variant.attributeValue}
                                                    onChange={(e) => updateVariant(variant.id, { attributeValue: e.target.value })}
                                                    placeholder="XL"
                                                    className="w-full text-sm"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input 
                                                    type="number"
                                                    value={variant.stockQuantity}
                                                    onChange={(e) => updateVariant(variant.id, { stockQuantity: parseFloat(e.target.value) || 0 })}
                                                    className="w-full text-sm font-semibold"
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeVariant(variant.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button 
                                        type="button" 
                                        onClick={addVariant}
                                        className="w-full mt-2 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all font-semibold text-xs flex items-center justify-center gap-2 active:scale-98"
                                    >
                                        <Plus size={14} /> Ajouter une variante
                                    </button>
                                    <p className="text-[11px] text-slate-400 italic text-center mt-2">
                                        Le stock total sera automatiquement calculé à partir de vos variantes.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </form>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="btn-secondary"
                    >
                        {t('cancel')}
                    </button>
                    <button 
                        type="submit" 
                        form="productForm"
                        className="btn-primary"
                    >
                        {isEditMode ? t('update') : t('save')}
                    </button>
                </div>
            </div>

            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(code) => setBarcode(code)}
                title="Scanner Code-Barres Produit"
            />
        </div>,
        document.body
    );
};

export default AddProductModal;
