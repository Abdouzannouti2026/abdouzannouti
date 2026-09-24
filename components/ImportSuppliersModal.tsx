
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../contexts/LanguageContext';
import { Supplier } from '../types';

interface ImportSuppliersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (suppliers: Omit<Supplier, 'id' | 'supplierCode'>[]) => void;
}

const ImportSuppliersModal: React.FC<ImportSuppliersModalProps> = ({ isOpen, onClose, onImport }) => {
    const { t, language } = useLanguage();
    const [importType, setImportType] = useState<'Entreprise' | 'Particulier'>('Entreprise');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
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
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        throw new Error(language === 'fr' ? 'Le fichier est vide.' : 'The file is empty.');
                    }

                    const suppliersToImport: Omit<Supplier, 'id' | 'supplierCode'>[] = jsonData.map((row: any) => {
                        if (importType === 'Entreprise') {
                            const company = row.Entreprise || row.Company || row.Société || row.societe || '';
                            const name = row.Contact || row.Nom || row.Name || '';
                            const email = row.Email || row.email || '';
                            const phone = row.Téléphone || row.Phone || row.tel || '';
                            const address = row.Adresse || row.Address || '';
                            const ice = row.ICE || row.ice || '';
                            const rc = row.RC || row.rc || '';

                            return {
                                type: 'Entreprise' as const,
                                company,
                                name: name || company,
                                email,
                                phone,
                                address,
                                ice,
                                rc
                            };
                        } else {
                            const name = row['Nom Complet'] || row.Nom || row.Name || row.name || '';
                            const email = row.Email || row.email || '';
                            const phone = row.Téléphone || row.Phone || row.tel || '';
                            const address = row.Adresse || row.Address || '';

                            return {
                                type: 'Particulier' as const,
                                name,
                                company: '',
                                email,
                                phone,
                                address,
                                ice: '',
                                rc: ''
                            };
                        }
                    }).filter(s => s.name || s.company);

                    if (suppliersToImport.length === 0) {
                        throw new Error(language === 'fr' ? 'Aucun fournisseur valide trouvé.' : 'No valid suppliers found.');
                    }

                    onImport(suppliersToImport);
                    setSuccess(language === 'fr' ? `${suppliersToImport.length} fournisseurs importés.` : `${suppliersToImport.length} suppliers imported.`);
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
        let fileName = "";

        if (importType === 'Entreprise') {
            templateData = [
                {
                    "Entreprise": "Fournisseur Alpha",
                    "Contact": "Contact Name",
                    "Email": "contact@alpha.com",
                    "Téléphone": "0522000000",
                    "Adresse": "Zone Industrielle, Casablanca",
                    "ICE": "987654321000055",
                    "RC": "12345"
                }
            ];
            fileName = "template_fournisseurs_entreprise.xlsx";
        } else {
            templateData = [
                {
                    "Nom Complet": "Jean Fournisseur",
                    "Email": "jean@supplier.com",
                    "Téléphone": "0600112233",
                    "Adresse": "123 Rue de la Liberté, Rabat"
                }
            ];
            fileName = "template_fournisseurs_particulier.xlsx";
        }

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, fileName);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Upload size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {language === 'fr' ? 'Importer des fournisseurs' : 'Import Suppliers'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {!success && (
                        <div className="space-y-6">
                            {/* Type Selection */}
                            <div className="flex p-1 bg-slate-100 rounded-xl">
                                <button
                                    onClick={() => { setImportType('Entreprise'); setFile(null); }}
                                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                                        importType === 'Entreprise' 
                                        ? 'bg-white text-emerald-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Entreprise
                                </button>
                                <button
                                    onClick={() => { setImportType('Particulier'); setFile(null); }}
                                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                                        importType === 'Particulier' 
                                        ? 'bg-white text-emerald-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Particulier
                                </button>
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                                <Info className="text-blue-500 shrink-0" size={20} />
                                <div className="text-sm text-blue-700 w-full">
                                    <p className="font-bold mb-1">Format requis ({importType}) :</p>
                                    <p className="mb-3 leading-relaxed opacity-80">
                                        {importType === 'Entreprise' 
                                            ? 'Colonnes : Entreprise, Contact, Email, Téléphone, Adresse, ICE, RC'
                                            : 'Colonnes : Nom Complet, Email, Téléphone, Adresse'}
                                    </p>
                                    <button 
                                        onClick={downloadTemplate}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                                    >
                                        <FileText size={14} />
                                        Télécharger le modèle {importType}
                                    </button>
                                </div>
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

export default ImportSuppliersModal;
