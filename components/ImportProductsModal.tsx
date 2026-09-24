
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2, Layers, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../contexts/LanguageContext';
import { Product, ProductVariant } from '../types';

interface ImportProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (products: Omit<Product, 'id'>[]) => void | Promise<void>;
    existingCategories?: string[];
}

const ImportProductsModal: React.FC<ImportProductsModalProps> = ({ isOpen, onClose, onImport, existingCategories = [] }) => {
    const { t, language } = useLanguage();
    const [file, setFile] = useState<File | null>(null);
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [importMode, setImportMode] = useState<'standard' | 'variants'>('standard');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
                setFile(selectedFile);
                setError(null);
            } else {
                setError(language === 'fr' ? 'Veuillez sélectionner un fichier Excel ou CSV.' : 'Please select an Excel or CSV file.');
                setFile(null);
            }
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        throw new Error(language === 'fr' ? 'Le fichier est vide.' : 'The file is empty.');
                    }

                    let productsToImport: Omit<Product, 'id'>[] = [];

                    if (importMode === 'standard') {
                        productsToImport = jsonData.map((row: any) => {
                            const name = row.Nom || row.Name || row.name || row.nom || '';
                            const productCode = row.Référence || row.Reference || row.ref || row.reference || '';
                            const purchasePrice = parseFloat(row["Prix d'achat"] || row.PurchasePrice || row.purchase_price || row.achat || '0');
                            const salePrice = parseFloat(row["Prix de vente"] || row.SalePrice || row.sale_price || row.vente || '0');
                            const stockQuantity = parseFloat(row.Quantité || row.Quantity || row.qty || row.quantite || '0');
                            const vat = parseFloat(row.TVA || row.VAT || row.tva || '20');
                            const description = row.Description || row.description || '';
                            const productType = (row.Type || row.type || 'Produit') as 'Produit' | 'Service';
                            const unitOfMeasure = row.Unité || row.Unit || row.unite || 'Aucune';
                            const rowCategory = row.Catégorie || row.Category || row.categorie || row.category || category;
                            const minStockAlert = parseFloat(row.Alerte_Stock || row.Stock_Min || row.MinStock || row.MinStockAlert || '5');

                            return {
                                name,
                                productCode,
                                category: rowCategory,
                                purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
                                salePrice: isNaN(salePrice) ? 0 : salePrice,
                                stockQuantity: isNaN(stockQuantity) ? 0 : stockQuantity,
                                vat: isNaN(vat) ? 20 : vat,
                                description,
                                productType,
                                unitOfMeasure,
                                minStockAlert: isNaN(minStockAlert) ? 5 : minStockAlert,
                                hasVariants: false,
                                variants: [],
                                createdAt: new Date().toISOString().split('T')[0]
                            };
                        }).filter(p => p.name);
                    } else {
                        // Variants Import Logic - Group by Parent Reference or Parent Name
                        const groups: Record<string, any[]> = {};
                        jsonData.forEach((row: any) => {
                            // Priority for group key: Référence_Parent > Parent_Reference > Nom_Parent > Parent_Name
                            const groupKey = row.Référence_Parent || row.Parent_Reference || row.Nom_Parent || row.Parent_Name || row.Nom || row.Name || 'unknown';
                            if (!groups[groupKey]) groups[groupKey] = [];
                            groups[groupKey].push(row);
                        });

                        productsToImport = Object.keys(groups).map(groupKey => {
                            const rows = groups[groupKey];
                            const parentRow = rows[0]; 
                            
                            const name = parentRow.Nom_Parent || parentRow.Parent_Name || parentRow.Nom || parentRow.Name || groupKey;
                            const category_val = parentRow.Catégorie || parentRow.Category || category;
                            const vat = parseFloat(parentRow.TVA || parentRow.VAT || '20');
                            const unitOfMeasure = parentRow.Unité || parentRow.Unit || 'Unité';
                            const minStockAlert = parseFloat(parentRow.Alerte_Stock || parentRow.Stock_Min || parentRow.MinStock || parentRow.MinStockAlert || '5');

                            const variants: ProductVariant[] = rows.map((vRow, idx) => {
                                const variantName = vRow.Nom_Variante || vRow.Variant_Name || vRow.variant || vRow.Nom || '';
                                const attrValue = vRow.Valeur_Attribut || vRow.Attribute_Value || vRow.size || vRow.taille || vRow.color || vRow.couleur || '';
                                const vQty = parseFloat(vRow.Quantité || vRow.Quantity || vRow.qty || '0');
                                const vSalePrice = parseFloat(vRow.Prix_Vente || vRow.SalePrice || vRow["Prix de vente"] || '0');
                                const vPurchasePrice = parseFloat(vRow.Prix_Achat || vRow.PurchasePrice || vRow["Prix d'achat"] || '0');
                                
                                return {
                                    id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                                    name: variantName || `${name} - ${attrValue}`,
                                    attributeValue: attrValue,
                                    stockQuantity: isNaN(vQty) ? 0 : vQty,
                                    salePrice: isNaN(vSalePrice) ? 0 : vSalePrice,
                                    purchasePrice: isNaN(vPurchasePrice) ? 0 : vPurchasePrice
                                };
                            });

                            const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
                            
                            // Prices can be defined at parent level or taken from first variant if not at parent
                            const pSalePrice = parseFloat(parentRow.Prix_Vente || parentRow.SalePrice || parentRow["Prix de vente"] || '0');
                            const pPurchasePrice = parseFloat(parentRow.Prix_Achat || parentRow.PurchasePrice || parentRow["Prix d'achat"] || '0');
                            
                            const salePrice = pSalePrice || (variants.length > 0 ? variants[0].salePrice || 0 : 0);
                            const purchasePrice = pPurchasePrice || (variants.length > 0 ? variants[0].purchasePrice || 0 : 0);

                            return {
                                name,
                                productCode: (parentRow.Référence_Parent || parentRow.Parent_Reference || (groupKey !== name ? groupKey : '')),
                                category: category_val,
                                purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
                                salePrice: isNaN(salePrice) ? 0 : salePrice,
                                stockQuantity: totalStock,
                                vat: isNaN(vat) ? 20 : vat,
                                description: parentRow.Description || parentRow.description || '',
                                productType: 'Produit' as 'Produit' | 'Service',
                                unitOfMeasure,
                                minStockAlert: isNaN(minStockAlert) ? 5 : minStockAlert,
                                hasVariants: true,
                                variants,
                                createdAt: new Date().toISOString().split('T')[0]
                            };
                        }).filter(p => p.name);
                    }

                    if (productsToImport.length === 0) {
                        throw new Error(language === 'fr' ? 'Aucun produit valide trouvé.' : 'No valid products found.');
                    }

                    await onImport(productsToImport);
                    setSuccess(language === 'fr' ? `${productsToImport.length} produits (avec leurs variantes) importés.` : `${productsToImport.length} products (with variants) imported.`);
                    setTimeout(() => {
                        onClose();
                        setFile(null);
                        setSuccess(null);
                    }, 2000);
                } catch (err: any) {
                    setError(err.message || (language === 'fr' ? "Erreur lors de la lecture du fichier." : "Error reading file."));
                } finally {
                    setLoading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            setError(language === 'fr' ? "Erreur lors de l'importation." : "Error during import.");
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        let templateData: any[] = [];
        if (importMode === 'standard') {
            templateData = [
                {
                    "Nom": "Produit Exemple",
                    "Référence": "REF001",
                    "Prix d'achat": 100,
                    "Prix de vente": 150,
                    "Quantité": 10,
                    "Alerte Stock Minimal": 5,
                    "TVA": 20,
                    "Catégorie": "Exemple",
                    "Description": "Description du produit",
                    "Type": "Produit",
                    "Unité": "Unité"
                }
            ];
        } else {
            templateData = [
                {
                    "Référence_Parent": "T-SHIRT-001",
                    "Nom_Parent": "T-shirt Coton Premium",
                    "Nom_Variante": "T-shirt Coton - XL",
                    "Valeur_Attribut": "XL",
                    "Quantité": 5,
                    "Alerte Stock Minimal": 5,
                    "Prix de vente": 150,
                    "Prix d'achat": 80,
                    "TVA": 20,
                    "Catégorie": "Vêtements"
                },
                {
                    "Référence_Parent": "T-SHIRT-001",
                    "Nom_Parent": "T-shirt Coton Premium",
                    "Nom_Variante": "T-shirt Coton - M",
                    "Valeur_Attribut": "M",
                    "Quantité": 8,
                    "Alerte Stock Minimal": 5,
                    "Prix de vente": 150,
                    "Prix d'achat": 80,
                    "TVA": 20,
                    "Catégorie": "Vêtements"
                }
            ];
        }
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        const filename = importMode === 'standard' ? "template_produits_standard.xlsx" : "template_produits_variantes.xlsx";
        XLSX.writeFile(wb, filename);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Upload size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {language === 'fr' ? 'Importer des produits' : 'Import Products'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {!success && (
                        <div className="space-y-4">
                            {/* Mode Switcher */}
                            <div className="flex p-1 bg-slate-100 rounded-xl">
                                <button 
                                    onClick={() => setImportMode('standard')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                        importMode === 'standard' 
                                        ? 'bg-white text-emerald-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <FileText size={16} />
                                    {language === 'fr' ? 'Import Standard' : 'Standard Import'}
                                </button>
                                <button 
                                    onClick={() => setImportMode('variants')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                        importMode === 'variants' 
                                        ? 'bg-white text-emerald-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <Layers size={16} />
                                    {language === 'fr' ? 'Avec Variantes' : 'With Variants'}
                                </button>
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                                <Info className="text-blue-500 shrink-0" size={20} />
                                <div className="text-sm text-blue-700">
                                    <p className="font-bold mb-1">
                                        {importMode === 'standard' 
                                            ? (language === 'fr' ? 'Format Standard :' : 'Standard Format:')
                                            : (language === 'fr' ? 'Format Variantes :' : 'Variants Format:')
                                        }
                                    </p>
                                    <p className="mb-2 leading-relaxed">
                                        {importMode === 'standard' 
                                            ? (language === 'fr' 
                                                ? 'Colonnes : Nom, Référence, Prix d\'achat, Prix de vente, Quantité, TVA, Catégorie.' 
                                                : 'Columns: Name, Reference, Purchase Price, Sale Price, Quantity, VAT, Category.')
                                            : (language === 'fr'
                                                ? 'Colonnes : Nom_Parent, Référence_Parent, Nom_Variante, Valeur_Attribut, Quantité, Prix de vente, Prix d\'achat, TVA, Catégorie. Les lignes avec la même Référence_Parent seront regroupées.'
                                                : 'Columns: Parent_Name, Parent_Reference, Variant_Name, Attribute_Value, Quantity, Sale Price, Purchase Price, VAT, Category. Rows with same Parent_Reference will be grouped.')
                                        }
                                    </p>
                                    <button 
                                        onClick={downloadTemplate}
                                        className="text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1"
                                    >
                                        <FileText size={14} />
                                        {language === 'fr' ? 'Télécharger le modèle complet' : 'Download Full Template'}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    {language === 'fr' ? 'Catégorie par défaut' : 'Default Category'}
                                </label>
                                <input 
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    list="import-categories-list"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all font-medium"
                                />
                                <datalist id="import-categories-list">
                                    {existingCategories.map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                                    file ? 'border-emerald-500 bg-emerald-50 shadow-inner' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                                }`}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden" 
                                    accept=".xlsx,.xls,.csv"
                                />
                                <div className={`p-4 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Upload size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-slate-700">
                                        {file ? file.name : (language === 'fr' ? 'Cliquez pour choisir un fichier' : 'Click to choose a file')}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        XLSX, XLS, CSV (Max 5MB)
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600 animate-shake">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {success && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
                                <CheckCircle2 size={48} className="animate-in zoom-in duration-300" />
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-slate-800">
                                    {success}
                                </p>
                                <p className="text-sm text-slate-500 mt-2">
                                    {language === 'fr' ? 'Mise à jour de votre inventaire...' : 'Updating your inventory...'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {!success && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-all active:scale-95"
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            disabled={!file || loading}
                            onClick={handleImport}
                            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                            {language === 'fr' ? 'Lancer l\'importation' : 'Start Import'}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ImportProductsModal;
