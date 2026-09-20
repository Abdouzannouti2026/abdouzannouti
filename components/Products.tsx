
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Header from './Header';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Pencil, Trash2, ArrowLeft, Package, AlertTriangle, Search, Upload, ChevronLeft, ChevronRight, X, Layers, FileSpreadsheet, Barcode, Camera, Sparkles, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, CompanySettings, ProductVariant } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency, parseDecimalInput, formatDecimalForInput } from '../services/currencyService';
import ImportProductsModal from './ImportProductsModal';
import BarcodeScannerModal from './BarcodeScannerModal';
import BarcodePrintModal from './BarcodePrintModal';
import { generateBarcodeNumber, renderBarcodeSvgDataUri } from '../utils/barcode';
    // --- Helper Functions and Components ---

const Toggle = ({ enabled, setEnabled, htLabel, ttcLabel }: { enabled: boolean, setEnabled: (enabled: boolean) => void, htLabel: string, ttcLabel: string }) => (
    <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <span className={`text-sm font-medium ${!enabled ? 'text-neutral-900' : 'text-neutral-500'}`}>{htLabel}</span>
        <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${enabled ? 'bg-emerald-600' : 'bg-neutral-200'}`}
            role="switch"
            aria-checked={enabled}
        >
            <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`}
            />
        </button>
        <span className={`text-sm font-medium ${enabled ? 'text-neutral-900' : 'text-neutral-500'}`}>{ttcLabel}</span>
    </div>
);

const round = (value: number) => Math.round(value * 100) / 100;

// --- Product Form Component ---

interface ProductFormProps {
    products: Product[];
    onAddProduct: (product: Omit<Product, 'id'>) => void;
    onUpdateProduct: (product: Product) => void;
    companySettings?: CompanySettings | null;
}

const ProductForm = ({ products, onAddProduct, onUpdateProduct, companySettings }: ProductFormProps) => {
    const { t, language, isRTL } = useLanguage();
    const { productId } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(productId);
    
    const existingProduct = useMemo(() => 
        productId ? products.find((p: Product) => p.id === productId) : null,
        [products, productId]
    );

    const [name, setName] = useState('');
    const [productCode, setProductCode] = useState('');
    const [barcode, setBarcode] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [productType, setProductType] = useState<'Produit' | 'Service'>('Produit');
    const [unitOfMeasure, setUnitOfMeasure] = useState('Aucune');
    const [vat, setVat] = useState(companySettings?.defaultTva ?? 20);

    // Variants state
    const [hasVariants, setHasVariants] = useState(false);
    const [variants, setVariants] = useState<ProductVariant[]>([]);

    const [minStockAlertStr, setMinStockAlertStr] = useState('5');

    // Extract categories for datalist
    const categoriesList = useMemo(() => {
        const cats = products
            .map(p => p.category)
            .filter((c): c is string => Boolean(c));
        return Array.from(new Set(cats)).sort();
    }, [products]);

    // Using string states for all numeric inputs to preserve decimal separators and trailing zeros during typing
    const [salePriceHTStr, setSalePriceHTStr] = useState('0');
    const [salePriceTTCStr, setSalePriceTTCStr] = useState('0');
    const [purchasePriceHTStr, setPurchasePriceHTStr] = useState('0');
    const [purchasePriceTTCStr, setPurchasePriceTTCStr] = useState('0');
    const [stockQuantityStr, setStockQuantityStr] = useState('0');
    const [imageUrl, setImageUrl] = useState('');

    const [salePriceIsTTC, setSalePriceIsTTC] = useState(false);
    const [purchasePriceIsTTC, setPurchasePriceIsTTC] = useState(false);

    useEffect(() => {
        if (isEditMode && existingProduct) {
            setName(existingProduct.name);
            setProductCode(existingProduct.productCode);
            setBarcode(existingProduct.barcode || '');
            setDescription(existingProduct.description || '');
            setCategory(existingProduct.category || '');
            setProductType(existingProduct.productType === 'Service' ? 'Service' : 'Produit');
            setUnitOfMeasure(existingProduct.unitOfMeasure || 'Aucune');
            setHasVariants(!!existingProduct.hasVariants);
            setVariants(existingProduct.variants || []);
            setVat(existingProduct.vat);
            
            const sPriceHT = existingProduct.salePrice;
            const pPriceHT = existingProduct.purchasePrice;
            const vatRate = 1 + (existingProduct.vat / 100);

            setSalePriceHTStr(formatDecimalForInput(sPriceHT, language));
            setSalePriceTTCStr(formatDecimalForInput(round(sPriceHT * vatRate), language));
            setPurchasePriceHTStr(formatDecimalForInput(pPriceHT, language));
            setPurchasePriceTTCStr(formatDecimalForInput(round(pPriceHT * vatRate), language));
            setStockQuantityStr(formatDecimalForInput(existingProduct.stockQuantity || 0, language));
            setMinStockAlertStr(formatDecimalForInput(existingProduct.minStockAlert === undefined ? 5 : existingProduct.minStockAlert, language));
            setImageUrl(existingProduct.imageUrl || '');
        } else if (!isEditMode) {
             setVat(companySettings?.defaultTva ?? (language === 'es' ? 21 : 20));
             setMinStockAlertStr('5');
        }
    }, [isEditMode, existingProduct, language]);

    // Update total stock when variants change
    useEffect(() => {
        if (hasVariants && variants.length > 0) {
            const total = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
            setStockQuantityStr(formatDecimalForInput(total, language));
        }
    }, [variants, hasVariants, language]);

    // Update TTC strings when VAT changes
    useEffect(() => {
        const vatRate = 1 + (vat / 100);
        const sHT = parseDecimalInput(salePriceHTStr);
        const pHT = parseDecimalInput(purchasePriceHTStr);
        
        setSalePriceTTCStr(formatDecimalForInput(round(sHT * vatRate), language));
        setPurchasePriceTTCStr(formatDecimalForInput(round(pHT * vatRate), language));
    }, [vat, language]);
    
    const handlePriceInputChange = (value: string, type: 'sale' | 'purchase', from: 'ht' | 'ttc') => {
        const vatRate = 1 + (vat / 100);
        const numericValue = parseDecimalInput(value);

        if (type === 'sale') {
            if (from === 'ht') {
                setSalePriceHTStr(value);
                setSalePriceTTCStr(formatDecimalForInput(round(numericValue * vatRate), language));
            } else {
                setSalePriceTTCStr(value);
                setSalePriceHTStr(formatDecimalForInput(round(numericValue / vatRate), language));
            }
        } else {
            if (from === 'ht') {
                setPurchasePriceHTStr(value);
                setPurchasePriceTTCStr(formatDecimalForInput(round(numericValue * vatRate), language));
            } else {
                setPurchasePriceTTCStr(value);
                setPurchasePriceHTStr(formatDecimalForInput(round(numericValue / vatRate), language));
            }
        }
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
    
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    const MAX_SIZE = 300; // Super small size
                    
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Convert to highly compressed JPEG
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.15); 
                        resolve(compressedDataUrl);
                    } else {
                        resolve(event.target?.result as string);
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const compressedImage = await compressImage(file);
            setImageUrl(compressedImage);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isService = productType === 'Service';
        const productData = {
            name, productCode, barcode, description, category, productType, unitOfMeasure, vat,
            salePrice: parseDecimalInput(salePriceHTStr),
            purchasePrice: parseDecimalInput(purchasePriceHTStr),
            stockQuantity: isService ? 0 : parseDecimalInput(stockQuantityStr),
            minStockAlert: isService ? 0 : (parseDecimalInput(minStockAlertStr) || 0),
            hasVariants: isService ? false : hasVariants,
            variants: (hasVariants && !isService) ? variants : [],
            imageUrl
        };
        if (isEditMode && existingProduct) {
            onUpdateProduct({ ...existingProduct, ...productData });
        } else {
            onAddProduct(productData);
        }
        navigate('/products');
    };
    
    return (
        <div className="pb-20 md:pb-0">
            <Header title={isEditMode ? t('editProduct') : t('newProduct')} />
            
            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                 <div className="bg-white p-4 md:p-6 shadow-sm ring-1 ring-neutral-200 rounded-xl md:rounded-lg">
                    <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-4 mb-6">{t('generalInfo')}</h3>
                    <div className="grid grid-cols-1 gap-5 md:gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="productName" className="block text-sm font-medium text-neutral-700">{t('name')} *</label>
                            <textarea 
                                id="productName" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder={t('productPlaceholder')} 
                                className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm resize-y" 
                                rows={1}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="productCode" className="block text-sm font-medium text-neutral-700">{t('reference')}</label>
                            <input type="text" id="productCode" value={productCode} onChange={e => setProductCode(e.target.value)} placeholder={t('refPlaceholder')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm"/>
                        </div>
                        <div>
                            <label htmlFor="productBarcode" className="block text-sm font-medium text-neutral-700 flex items-center gap-1.5">
                                <Barcode size={16} className="text-emerald-600" />
                                <span>Code-Barres / Douchette</span>
                            </label>
                            <div className="mt-1 flex gap-2">
                                <input 
                                    type="text" 
                                    id="productBarcode" 
                                    value={barcode} 
                                    onChange={e => setBarcode(e.target.value)} 
                                    placeholder="Ex: 6111234567890" 
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsScannerOpen(true)}
                                    title="Scanner avec la caméra"
                                    className="px-3 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 rounded-lg border border-slate-200 transition-all flex items-center gap-1 font-bold text-xs"
                                >
                                    <Camera size={16} />
                                    <span className="hidden sm:inline">Scan</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBarcode(generateBarcodeNumber())}
                                    title="Générer un code-barres"
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all flex items-center gap-1 font-bold text-xs"
                                >
                                    <Sparkles size={14} className="text-amber-500" />
                                    <span className="hidden sm:inline">Générer</span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-neutral-700">Catégorie (Optionnel)</label>
                            <input 
                                type="text" 
                                id="category" 
                                value={category} 
                                onChange={e => setCategory(e.target.value)} 
                                list="categories-list"
                                placeholder="Sélectionnez ou tapez..." 
                                className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm"
                            />
                            <datalist id="categories-list">
                                {categoriesList.map(cat => (
                                    <option key={cat} value={cat} />
                                ))}
                            </datalist>
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-neutral-700">{t('description')}</label>
                            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={t('description')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                        </div>
                        <div className="sm:col-span-2 mt-2">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Image du produit/service</label>
                            <div className="flex items-start gap-4">
                                {imageUrl ? (
                                    <div className="relative w-24 h-24 border rounded-md overflow-hidden bg-white group shadow-sm flex items-center justify-center">
                                        <img src={imageUrl} alt="Product preview" className="max-w-full max-h-full object-contain" />
                                        <button
                                            type="button"
                                            onClick={() => setImageUrl('')}
                                            className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-neutral-300 rounded-md bg-neutral-50 cursor-pointer hover:bg-neutral-100 hover:border-emerald-400 transition-colors">
                                        <Upload size={20} className="text-neutral-400 mb-1" />
                                        <span className="text-[10px] text-neutral-500">Ajouter</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                                <div className="text-xs text-neutral-500 flex flex-col justify-center h-24 gap-1">
                                    <p>Taille optimale pour sauvegarder : JPEG compressé</p>
                                    <p>Dimensions max : 300x300 (redimensionnement auto).</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="productType" className="block text-sm font-medium text-neutral-700">{t('type')}</label>
                            <select id="productType" value={productType} onChange={e => setProductType(e.target.value as any)} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm">
                                <option value="Produit">{t('pProduct')}</option>
                                <option value="Service">{t('pService')}</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="unitOfMeasure" className="block text-sm font-medium text-neutral-700">{t('unitOfMeasure')}</label>
                            <select id="unitOfMeasure" value={unitOfMeasure} onChange={e => setUnitOfMeasure(e.target.value)} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm">
                                <option value="Aucune">{t('uNone')}</option>
                                <option value="Unité">{t('uUnit')}</option>
                                <option value="kg">{t('uKg')}</option>
                                <option value="L">{t('uL')}</option>
                                <option value="m">{t('uM')}</option>
                                <option value="Tonne">{t('uTon')}</option>
                                <option value="m3">{t('uM3')}</option>
                            </select>
                        </div>
                        {productType !== 'Service' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="stockQuantity" className="block text-sm font-medium text-neutral-700">{t('stock')}</label>
                                    <input 
                                        type="text" 
                                        id="stockQuantity" 
                                        value={stockQuantityStr} 
                                        onChange={e => setStockQuantityStr(e.target.value)} 
                                        disabled={hasVariants}
                                        className={`mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm ${hasVariants ? 'bg-slate-50 text-slate-400 italic cursor-not-allowed' : ''}`} 
                                    />
                                    <p className="mt-1 text-xs text-neutral-500">{t('stockUpdateNote')}</p>
                                </div>
                                <div>
                                    <label htmlFor="minStockAlertStr" className="block text-sm font-medium text-neutral-700">Alerte Stock Minimal</label>
                                    <input 
                                        type="number" 
                                        id="minStockAlertStr"
                                        value={minStockAlertStr} 
                                        onChange={e => setMinStockAlertStr(e.target.value)} 
                                        className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                        {productType !== 'Service' && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-neutral-900 font-bold">
                                        <Plus size={20} className="text-emerald-500" />
                                        <span>Gestion des variantes</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={hasVariants}
                                            onChange={(e) => setHasVariants(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>

                                {hasVariants && (
                                    <div className="space-y-4 bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200 shadow-inner">
                                        <div className="grid grid-cols-12 gap-4 px-2 hidden md:grid">
                                            <div className="col-span-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Valeur / Attribut (ex: XL, Rouge..)</div>
                                            <div className="col-span-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Quantité Stock</div>
                                            <div className="col-span-1"></div>
                                        </div>
                                        
                                        {variants.map((variant) => (
                                            <div key={variant.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-white p-3 md:p-0 md:bg-transparent rounded-lg border border-slate-200 md:border-none shadow-sm md:shadow-none">
                                                <div className="md:col-span-8">
                                                    <label className="block md:hidden text-[11px] font-bold text-slate-400 uppercase mb-1">Attribut</label>
                                                    <input 
                                                        type="text"
                                                        value={variant.attributeValue}
                                                        onChange={(e) => updateVariant(variant.id, { attributeValue: e.target.value })}
                                                        placeholder="Ex: XL"
                                                        className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="block md:hidden text-[11px] font-bold text-slate-400 uppercase mb-1">Stock</label>
                                                    <input 
                                                        type="number"
                                                        value={variant.stockQuantity}
                                                        onChange={(e) => updateVariant(variant.id, { stockQuantity: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 text-center transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="md:col-span-1 flex justify-end">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeVariant(variant.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <button 
                                            type="button" 
                                            onClick={addVariant}
                                            className="w-full mt-2 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all font-bold text-sm flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} /> Ajouter une ligne variante
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                 </div>

                 <div className="bg-white p-4 md:p-6 shadow-sm ring-1 ring-neutral-200 rounded-xl md:rounded-lg">
                    <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-4 mb-6">{t('pricing')}</h3>
                    <div className="space-y-6">
                        {/* Sale Price */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-md font-medium text-neutral-800">{t('salePrice')}</h4>
                                <Toggle enabled={salePriceIsTTC} setEnabled={setSalePriceIsTTC} htLabel="HT" ttcLabel="TTC" />
                            </div>
                            <div className="max-w-md">
                                {salePriceIsTTC ? (
                                    <div>
                                        <label htmlFor="salePriceTTC" className="block text-sm font-medium text-neutral-700">{t('salePrice')} TTC</label>
                                        <input type="text" id="salePriceTTC" value={salePriceTTCStr} onChange={e => handlePriceInputChange(e.target.value, 'sale', 'ttc')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="salePriceHT" className="block text-sm font-medium text-neutral-700">{t('salePrice')} HT</label>
                                        <input type="text" id="salePriceHT" value={salePriceHTStr} onChange={e => handlePriceInputChange(e.target.value, 'sale', 'ht')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Purchase Price */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-md font-medium text-neutral-800">{t('purchasePrice')}</h4>
                                <Toggle enabled={purchasePriceIsTTC} setEnabled={setPurchasePriceIsTTC} htLabel="HT" ttcLabel="TTC" />
                            </div>
                            <div className="max-w-md">
                                {purchasePriceIsTTC ? (
                                    <div>
                                        <label htmlFor="purchasePriceTTC" className="block text-sm font-medium text-neutral-700">{t('purchasePrice')} TTC</label>
                                        <input type="text" id="purchasePriceTTC" value={purchasePriceTTCStr} onChange={e => handlePriceInputChange(e.target.value, 'purchase', 'ttc')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="purchasePriceHT" className="block text-sm font-medium text-neutral-700">{t('purchasePrice')} HT</label>
                                        <input type="text" id="purchasePriceHT" value={purchasePriceHTStr} onChange={e => handlePriceInputChange(e.target.value, 'purchase', 'ht')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* VAT */}
                        <div>
                            <label htmlFor="vat" className="block text-sm font-medium text-neutral-700">{t('vat')} (%)</label>
                            <select id="vat" value={vat} onChange={e => setVat(parseInt(e.target.value))} className="mt-1 block w-full max-w-xs rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm">
                                <option value="21">21%</option>
                                <option value="20">20%</option>
                                <option value="14">14%</option>
                                <option value="10">10%</option>
                                <option value="7">7%</option>
                                <option value="4">4%</option>
                                <option value="0">0%</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-4">
                    <button type="button" onClick={() => navigate('/products')} className="w-full sm:w-auto inline-flex justify-center items-center gap-x-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]">
                        <ArrowLeft size={20} className="rtl:rotate-180" />
                        {t('backToList')}
                    </button>
                    <button type="submit" className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]">
                        {t('saveProduct')}
                    </button>
                </div>
            </form>

            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(code) => setBarcode(code)}
                title="Scanner Code-Barres Produit"
            />
        </div>
    );
};


// --- Product List Component ---

interface ProductListProps {
    products: Product[];
    onAddProduct: (product: Omit<Product, 'id'>) => void;
    onAddProducts: (products: Omit<Product, 'id'>[]) => void;
    onDeleteProduct: (productId: string) => void;
    onDeleteProducts: (productIds: string[]) => void;
    companySettings?: CompanySettings | null;
}

const ProductList = ({ products, onAddProduct, onAddProducts, onDeleteProduct, onDeleteProducts, companySettings }: ProductListProps) => {
    const { t, language, isRTL } = useLanguage();
    const navigate = useNavigate();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [productIdToDelete, setProductIdToDelete] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [printingProduct, setPrintingProduct] = useState<Product | null>(null);
    const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'out' | 'low' | 'ok'>('all');
    const [hoveredImage, setHoveredImage] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Categories logic
    const categories = useMemo(() => {
        const cats = products
            .map(p => p.category)
            .filter((c): c is string => Boolean(c));
        return Array.from(new Set(cats)).sort();
    }, [products]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const filteredProducts = products.filter(product => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
            product.name.toLowerCase().includes(term) ||
            product.productCode.toLowerCase().includes(term) ||
            (product.barcode && product.barcode.toLowerCase().includes(term)) ||
            (product.category && product.category.toLowerCase().includes(term))
        );
        
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        
        // Stock logic
        let matchesStock = true;
        const stock = Number(product.stockQuantity || 0);
        const threshold = Number(product.minStockAlert !== undefined && product.minStockAlert !== null ? product.minStockAlert : 5);
        
        if (product.productType !== 'Service') {
            const isOut = stock <= 0;
            const isLow = !isOut && stock <= threshold;
            const isOk = stock > threshold;
            
            if (stockFilter === 'out') {
                matchesStock = isOut;
            } else if (stockFilter === 'low') {
                matchesStock = isLow;
            } else if (stockFilter === 'ok') {
                matchesStock = isOk;
            }
        } else {
            // Services
            if (stockFilter !== 'all') {
                matchesStock = false;
            }
        }
        
        return matchesSearch && matchesCategory && matchesStock;
    });

    const handleExportExcel = () => {
        const dataRows = filteredProducts.map((product) => {
            const stock = Number(product.stockQuantity || 0);
            const threshold = Number(product.minStockAlert !== undefined && product.minStockAlert !== null ? product.minStockAlert : 5);
            let stockStatus = '';
            if (product.productType === 'Service') {
                stockStatus = language === 'fr' ? 'Service' : 'Service';
            } else if (stock <= 0) {
                stockStatus = language === 'fr' ? 'Rupture de stock' : 'Out of Stock';
            } else if (stock <= threshold) {
                stockStatus = language === 'fr' ? 'Stock Faible' : 'Low Stock';
            } else {
                stockStatus = language === 'fr' ? 'En Stock' : 'In Stock';
            }

            const vatRate = 1 + (product.vat / 100);
            const salePriceTTC = round(product.salePrice * vatRate);
            const purchasePrice = product.purchasePrice || 0;
            const stockValHT = product.productType === 'Service' ? 0 : round(purchasePrice * stock);
            const stockValTTC = product.productType === 'Service' ? 0 : round(salePriceTTC * stock);

            return {
                [language === 'fr' ? 'Référence' : 'Reference']: product.productCode || '',
                [language === 'fr' ? 'Nom du produit/service' : 'Name']: product.name,
                [language === 'fr' ? 'Catégorie' : 'Category']: product.category || '',
                [language === 'fr' ? 'Type' : 'Type']: product.productType,
                [language === 'fr' ? 'Unité' : 'Unit']: product.unitOfMeasure && product.unitOfMeasure !== 'Aucune' ? product.unitOfMeasure : '',
                [language === 'fr' ? "Prix d'achat HT" : 'Purchase Price HT']: product.purchasePrice || 0,
                [language === 'fr' ? 'Prix de vente HT' : 'Sale Price HT']: product.salePrice || 0,
                [language === 'fr' ? 'TVA (%)' : 'VAT (%)']: product.vat,
                [language === 'fr' ? 'Prix de vente TTC' : 'Sale Price TTC']: salePriceTTC,
                [language === 'fr' ? 'Quantité en Stock' : 'Stock Quantity']: product.productType === 'Service' ? '-' : stock,
                [language === 'fr' ? 'Alerte Stock Minimal' : 'Min Stock Alert']: product.productType === 'Service' ? '-' : threshold,
                [language === 'fr' ? 'Statut du Stock' : 'Stock Status']: stockStatus,
                [language === 'fr' ? 'Valeur Stock HT' : 'Stock Value HT']: product.productType === 'Service' ? 0 : stockValHT,
                [language === 'fr' ? 'Valeur Stock TTC' : 'Stock Value TTC']: product.productType === 'Service' ? 0 : stockValTTC,
                [language === 'fr' ? 'Variantes' : 'Variants']: product.hasVariants && product.variants && product.variants.length > 0 
                    ? product.variants.map(v => `${v.attributeValue || v.name} (${v.stockQuantity})`).join(', ') 
                    : ''
            };
        });

        // Create worksheet and workbook
        const worksheet = XLSX.utils.json_to_sheet(dataRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, language === 'fr' ? 'Produits' : 'Products');

        // Column widths auto-adjustment
        if (dataRows.length > 0) {
            const maxKeys = Object.keys(dataRows[0]);
            const colWidths = maxKeys.map(key => {
                let maxLen = key.length;
                dataRows.forEach(row => {
                    const val = (row as any)[key];
                    if (val !== undefined && val !== null) {
                        maxLen = Math.max(maxLen, String(val).length);
                    }
                });
                return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
            });
            worksheet['!cols'] = colWidths;
        }

        const fileName = language === 'fr' ? 'exportation_produits.xlsx' : 'products_export.xlsx';
        XLSX.writeFile(workbook, fileName);
    };

    // Reset to first page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, stockFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push('...');
            }
            
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    const handleDeleteClick = (productId: string) => {
        setProductIdToDelete(productId);
        setIsConfirmOpen(true);
    };

    const confirmDeletion = async () => {
        if (productIdToDelete) {
            await onDeleteProduct(productIdToDelete);
        }
        setIsConfirmOpen(false);
        setProductIdToDelete(null);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProductIds(filteredProducts.map(p => p.id));
        } else {
            setSelectedProductIds([]);
        }
    };

    const handleSelectProduct = (productId: string) => {
        setSelectedProductIds(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId) 
                : [...prev, productId]
        );
    };

    const handleBulkDelete = () => {
        setIsBulkConfirmOpen(true);
    };

    const confirmBulkDeletion = async () => {
        await onDeleteProducts(selectedProductIds);
        setSelectedProductIds([]);
        setIsBulkConfirmOpen(false);
    };

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <Header title={t('products')}>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="btn-secondary px-3.5 py-2.5"
                        title={language === 'fr' ? 'Exporter en Excel' : 'Export to Excel'}
                    >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        <span className="hidden sm:inline">{language === 'fr' ? 'Exporter' : 'Export'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsImportOpen(true)}
                        className="btn-secondary px-3.5 py-2.5"
                    >
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('import')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/products/new')}
                        className="btn-primary px-3.5 py-2.5"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('newProduct')}</span>
                        <span className="sm:hidden">{t('add')}</span>
                    </button>
                </div>
            </Header>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDeletion}
            />

            <ConfirmationModal
                isOpen={isBulkConfirmOpen}
                onClose={() => setIsBulkConfirmOpen(false)}
                onConfirm={confirmBulkDeletion}
            />

            {isImportOpen && (
                <ImportProductsModal 
                    isOpen={isImportOpen}
                    onClose={() => setIsImportOpen(false)}
                    existingCategories={categories}
                    onImport={async (importedProducts) => {
                        if (onAddProducts) {
                            await onAddProducts(importedProducts);
                        } else {
                            for (const product of importedProducts) {
                                await onAddProduct(product);
                            }
                        }
                    }}
                />
            )}

            <div className="space-y-4">
                {/* Category Tabs */}
                {categories.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                                selectedCategory === 'all' 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {language === 'fr' ? 'Tout' : 'All'}
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat === selectedCategory ? 'all' : cat)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                                    selectedCategory === cat 
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Stock Status Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                        onClick={() => setStockFilter('all')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            stockFilter === 'all'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <Layers size={14} />
                        {language === 'fr' ? 'Tous les Stocks' : 'All Stocks'}
                    </button>
                    <button
                        onClick={() => setStockFilter('out')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            stockFilter === 'out'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-rose-600 border-rose-200/80 hover:bg-rose-50'
                        }`}
                    >
                        <X size={14} />
                        {language === 'fr' ? 'Rupture de Stock' : 'Out of Stock'}
                        <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'out' ? 'bg-white/20' : 'bg-rose-100'}`}>
                            {products.filter(p => p.productType !== 'Service' && Number(p.stockQuantity || 0) <= 0).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setStockFilter('low')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            stockFilter === 'low'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-amber-600 border-amber-200/80 hover:bg-amber-50'
                        }`}
                    >
                        <AlertTriangle size={14} />
                        {language === 'fr' ? 'Stock Critique' : 'Low Stock'}
                        <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'low' ? 'bg-white/20' : 'bg-amber-100'}`}>
                            {products.filter(p => {
                                const stock = Number(p.stockQuantity || 0);
                                const threshold = Number(p.minStockAlert !== undefined && p.minStockAlert !== null ? p.minStockAlert : 5);
                                return p.productType !== 'Service' && stock > 0 && stock <= threshold;
                            }).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setStockFilter('ok')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            stockFilter === 'ok'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-emerald-600 border-emerald-200/80 hover:bg-emerald-50'
                        }`}
                    >
                        <Package size={14} />
                        {language === 'fr' ? 'Stock OK' : 'Stock OK'}
                        <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'ok' ? 'bg-white/20' : 'bg-emerald-100'}`}>
                            {products.filter(p => {
                                const stock = Number(p.stockQuantity || 0);
                                const threshold = Number(p.minStockAlert !== undefined && p.minStockAlert !== null ? p.minStockAlert : 5);
                                return p.productType !== 'Service' && stock > threshold;
                            }).length}
                        </span>
                    </button>
                </div>

                {/* Search and Bulk Actions */}
                <div className="table-wrapper">
                    <div className="p-4 border-b border-slate-200/80 bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex w-full md:max-w-md gap-2">
                            <div className="relative flex-1">
                                <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'}`}>
                                   <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={language === 'fr' ? 'Rechercher par nom, réf, code-barres...' : 'Search by name, ref, barcode...'}
                                    className={`block w-full rounded-xl border-slate-200 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'pr-10' : 'pl-10'}`}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsGlobalScannerOpen(true)}
                                title={language === 'fr' ? 'Rechercher par Code-Barres / Douchette' : 'Search by Barcode'}
                                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200/80 transition-colors flex items-center gap-1.5 shrink-0"
                            >
                                <Camera size={16} />
                                <span className="hidden sm:inline">{language === 'fr' ? 'Scanner' : 'Scan'}</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                            <div className="md:hidden flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                                <input
                                    type="checkbox"
                                    checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-semibold text-slate-600">{t('selectAll')}</span>
                            </div>
                            <div className="hidden md:flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="select-all"
                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                                    onChange={handleSelectAll}
                                />
                                <label htmlFor="select-all" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                                    {t('selectAll')}
                                </label>
                            </div>

                            {selectedProductIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleBulkDelete}
                                    className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 border border-rose-200/80 hover:bg-rose-100 transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {language === 'es' ? `Eliminar (${selectedProductIds.length})` : `Supprimer (${selectedProductIds.length})`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead>
                                <tr>
                                    <th scope="col" className="table-th px-6 w-12 text-left"></th>
                                    <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('reference')}</th>
                                    <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('name')}</th>
                                    <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>Catégorie</th>
                                    <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('stock')}</th>
                                    <th scope="col" className={`table-th px-6 ${isRTL ? 'text-left' : 'text-right'}`}>{t('totalHT')}</th>
                                    <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('vat')}</th>
                                    <th scope="col" className="table-th px-6 text-right"><span className="sr-only">{t('actions')}</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {paginatedProducts.length > 0 ? (
                                    paginatedProducts.map((product: Product) => (
                                        <React.Fragment key={product.id}>
                                            <tr className={`hover:bg-slate-50/80 transition-colors duration-150 ${selectedProductIds.includes(product.id) ? 'bg-emerald-50/30' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                        checked={selectedProductIds.includes(product.id)}
                                                        onChange={() => handleSelectProduct(product.id)}
                                                    />
                                                </td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm font-mono text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{product.productCode}</td>
                                                <td className={`px-6 py-4 text-sm font-semibold text-slate-900 whitespace-pre-line ${isRTL ? 'text-right' : 'text-left'}`}>
                                                    <div className="flex items-center gap-3">
                                                        {product.imageUrl ? (
                                                            <div 
                                                                className="w-10 h-10 shrink-0 cursor-pointer"
                                                                onMouseEnter={() => setHoveredImage(product.imageUrl || null)}
                                                                onMouseLeave={() => setHoveredImage(null)}
                                                                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                                            >
                                                                <img 
                                                                    src={product.imageUrl} 
                                                                    alt="" 
                                                                    className="w-full h-full object-cover rounded-xl border border-slate-200 bg-white"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                                                                <Package size={18} />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span>{product.name}</span>
                                                            {product.hasVariants && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold uppercase mt-1 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full w-fit">
                                                                    <Layers size={10} /> {product.variants?.length || 0} {language === 'fr' ? 'variantes' : 'variants'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                    {product.category ? (
                                                        <span className="badge-neutral">
                                                            {product.category}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                                    {product.productType === 'Service' ? (
                                                        <span className="text-slate-400 italic text-xs">{t('pService')}</span>
                                                    ) : (
                                                        <span className={(product.stockQuantity || 0) <= (product.minStockAlert || 5) ? 'badge-danger' : 'badge-success'}>
                                                            {(product.stockQuantity || 0) <= (product.minStockAlert || 5) && <AlertTriangle className="w-3 h-3"/>}
                                                            {formatDecimalForInput(product.stockQuantity || 0, language)} {product.unitOfMeasure !== 'Aucune' ? product.unitOfMeasure : ''}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(product.salePrice, companySettings)}</td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{product.vat}%</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                                    <div className={`flex items-center justify-end gap-1.5 ${isRTL ? 'space-x-reverse' : ''}`}>
                                                        <button 
                                                            onClick={() => navigate(`/products/edit/${product.id}`)} 
                                                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title={t('edit')}
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteClick(product.id)} 
                                                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title={t('delete')}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expandable variants if any */}
                                            {product.hasVariants && product.variants && product.variants.length > 0 && (
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan={8} className="px-14 py-2.5">
                                                        <div className="flex flex-wrap gap-2 py-1">
                                                            {product.variants.map((variant) => (
                                                                <div key={variant.id} className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                                                                    <span className="font-semibold text-slate-700">{variant.attributeValue}</span>
                                                                    <span className="text-slate-300">|</span>
                                                                    <span className={`font-mono ${variant.stockQuantity <= 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                                                                        {variant.stockQuantity}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                 ) : (
                                    <tr>
                                         <td colSpan={8} className="py-16 px-6">
                                            <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                                                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3.5">
                                                    <Package className="h-7 w-7" strokeWidth={1.5} />
                                                </div>
                                                <h3 className="text-base font-bold text-slate-800">
                                                    {searchTerm ? t('noFinancialData') : t('noProducts')}
                                                </h3>
                                                {!searchTerm && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {t('firstProductPrompt')}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {paginatedProducts.length > 0 ? (
                            paginatedProducts.map((product: Product) => (
                                <div 
                                    key={product.id} 
                                    className={`p-4 transition-colors ${selectedProductIds.includes(product.id) ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'}`}
                                    onClick={() => handleSelectProduct(product.id)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="pt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    checked={selectedProductIds.includes(product.id)}
                                                    onChange={() => handleSelectProduct(product.id)}
                                                />
                                            </div>
                                            {product.imageUrl ? (
                                                <div 
                                                    className="w-12 h-12 shrink-0 cursor-pointer"
                                                    onMouseEnter={() => setHoveredImage(product.imageUrl || null)}
                                                    onMouseLeave={() => setHoveredImage(null)}
                                                    onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                                >
                                                    <img 
                                                        src={product.imageUrl} 
                                                        alt="" 
                                                        className="w-full h-full object-cover rounded-xl border border-slate-200 bg-white"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 shrink-0 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                                                    <Package size={20} />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-slate-900 whitespace-pre-line">{product.name}</h4>
                                                {product.hasVariants && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {product.variants?.map(v => (
                                                            <span key={v.id} className="badge-neutral text-[10px] py-0.2">
                                                                {v.attributeValue}: {v.stockQuantity}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">{product.productCode}</p>
                                                
                                                <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                    {product.productType === 'Service' ? (
                                                        <span className="text-xs text-slate-400 italic">{t('pService')}</span>
                                                    ) : (
                                                        <span className={(product.stockQuantity || 0) <= (product.minStockAlert || 5) ? 'badge-danger' : 'badge-success'}>
                                                            {t('stock')}: {formatDecimalForInput(product.stockQuantity || 0, language)}
                                                        </span>
                                                    )}
                                                    <span className="badge-info">
                                                        {formatCurrency(product.salePrice, companySettings)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                onClick={() => navigate(`/products/edit/${product.id}`)} 
                                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(product.id)} 
                                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center">
                                <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-500">{t('noProducts')}</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination UI */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-200/80">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="btn-secondary px-3 py-1.5 text-xs"
                                >
                                    {isRTL ? 'التالي' : 'Précédent'}
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="btn-secondary px-3 py-1.5 text-xs"
                                >
                                    {isRTL ? 'السابق' : 'Suivant'}
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs text-slate-500">
                                        Affichage de <span className="font-semibold text-slate-800">{startIndex + 1}</span> à <span className="font-semibold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredProducts.length)}</span> sur <span className="font-semibold text-slate-800">{filteredProducts.length}</span> produits
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {getPageNumbers().map((page, i) => (
                                        <React.Fragment key={i}>
                                            {page === '...' ? (
                                                <span className="px-3 py-1.5 text-xs text-slate-400 font-medium">
                                                    ...
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => setCurrentPage(page as number)}
                                                    className={`min-w-[34px] h-[34px] flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${currentPage === page ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {page}
                                                </button>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {hoveredImage && (
                <div 
                    className="fixed z-[9999] pointer-events-none shadow-2xl p-1 bg-white rounded-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 hidden md:block"
                    style={{ 
                        left: `${mousePos.x + 20}px`, 
                        top: `${Math.min(mousePos.y - 150, window.innerHeight - 320)}px`,
                        width: '300px',
                        height: '300px'
                    }}
                >
                    <img 
                        src={hoveredImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover rounded-xl"
                    />
                </div>
            )}

            <BarcodePrintModal
                isOpen={!!printingProduct}
                onClose={() => setPrintingProduct(null)}
                product={printingProduct}
            />

            <BarcodeScannerModal
                isOpen={isGlobalScannerOpen}
                onClose={() => setIsGlobalScannerOpen(false)}
                onScan={(code) => setSearchTerm(code)}
                title="Recherche par Code-Barres"
            />
        </div>
    );
};


// --- Main Router Component ---

interface ProductsProps {
    products: Product[];
    onAddProduct: (product: Omit<Product, 'id'>) => void;
    onAddProducts: (products: Omit<Product, 'id'>[]) => void;
    onUpdateProduct: (product: Product) => void;
    onDeleteProduct: (productId: string) => void;
    onDeleteProducts: (productIds: string[]) => void;
    companySettings?: CompanySettings | null;
}

const Products: React.FC<ProductsProps> = (props) => {
    const location = useLocation();
    const isListView = location.pathname === '/products';

    if (isListView) {
        return <ProductList {...props} />;
    } else {
        return <ProductForm {...props} />;
    }
};

export default Products;
