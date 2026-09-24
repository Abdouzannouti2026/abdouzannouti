import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Barcode, Check } from 'lucide-react';
import { Product } from '../types';
import { renderBarcodeSvgDataUri } from '../utils/barcode';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency, roundPrice } from '../services/currencyService';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({ isOpen, onClose, product }) => {
  const { language } = useLanguage();
  const [copies, setCopies] = useState<number>(12);
  const [showPrice, setShowPrice] = useState<boolean>(true);

  if (!isOpen || !product) return null;

  const barcodeUri = renderBarcodeSvgDataUri(product.barcode || product.productCode || '000000000000', true);

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop: clicking outside is disabled to prevent accidental data loss */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"></div>
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Screen only */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {language === 'fr' ? 'Imprimer Étiquettes Code-Barres' : 'Print Barcode Labels'}
              </h3>
              <p className="text-xs text-slate-400">
                {product.name} ({product.barcode || product.productCode})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Options - Screen only */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                {language === 'fr' ? 'Nombre d’étiquettes' : 'Label Count'}
              </label>
              <select
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value, 10))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1 étiquette</option>
                <option value={6}>6 étiquettes</option>
                <option value={12}>12 étiquettes</option>
                <option value={24}>24 étiquettes</option>
                <option value={48}>48 étiquettes</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>{language === 'fr' ? 'Afficher le prix' : 'Show price'}</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all ml-auto"
          >
            <Printer size={16} />
            <span>{language === 'fr' ? 'Imprimer / Télécharger' : 'Print / Download'}</span>
          </button>
        </div>

        {/* Label Preview Sheet (Also printed directly via CSS) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
            {Array.from({ length: copies }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-slate-300 rounded-2xl p-3 flex flex-col items-center justify-between text-center shadow-sm print:border-slate-300 print:shadow-none print:break-inside-avoid"
              >
                <div className="w-full truncate text-[11px] font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">
                  {product.name}
                </div>

                <div className="w-full flex justify-center py-1">
                  <img src={barcodeUri} alt="barcode" className="max-h-16 w-full object-contain" />
                </div>

                {showPrice && (
                  <div className="text-[11px] font-black text-emerald-700 mt-1">
                    {formatCurrency(roundPrice(product.salePrice * (1 + (product.vat !== undefined ? product.vat : 0) / 100)))} <span className="text-[9px]">TTC</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BarcodePrintModal;
