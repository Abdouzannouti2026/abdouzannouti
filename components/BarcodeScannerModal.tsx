import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard, Volume2, CheckCircle2, Zap, AlertCircle, Upload, Usb, Wifi, Info } from 'lucide-react';
import { playBeepSound, scanBarcodeFromFile } from '../utils/barcode';
import { useLanguage } from '../contexts/LanguageContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title,
  continuous = false
}) => {
  const { language } = useLanguage();
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Global keydown listener for Douchette scanner in background
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in input element, let the input handle it
      if (document.activeElement === inputRef.current) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim().length > 2) {
          e.preventDefault();
          const code = buffer.trim();
          handleSuccessfulScan(code);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSuccessfulScan = (code: string) => {
    if (!code) return;
    playBeepSound();
    setLastScanned(code);
    onScan(code);

    if (!continuous) {
      onClose();
    } else {
      setTimeout(() => setLastScanned(null), 1500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessfulScan(manualCode.trim());
      setManualCode('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    try {
      const code = await scanBarcodeFromFile(file);
      if (code) {
        handleSuccessfulScan(code);
      } else {
        setFileError(language === 'fr' ? 'Aucun code-barres lisible trouvé sur cette photo.' : 'No readable barcode found in this image.');
      }
    } catch (err) {
      console.warn('File scan error:', err);
      setFileError(language === 'fr' ? 'Impossible de lire le code-barres sur cette photo.' : 'Could not decode barcode from this image.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {title || (language === 'fr' ? 'Lecteur Code-Barres / Douchette' : 'Douchette Barcode Reader')}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'fr' ? 'Douchette USB / Bluetooth & Saisie Manuelle' : 'USB / Bluetooth Douchette & Manual Entry'}
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

        <div className="p-6 space-y-5">
          {/* Active Reader Status Box */}
          <div className="relative w-full p-5 bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-inner flex flex-col items-center justify-center text-center">
            {/* Pulsing indicator */}
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Usb className="w-6 h-6 animate-pulse" />
            </div>

            <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              {language === 'fr' ? 'Douchette Prête & En Écoute' : 'Douchette Ready & Active'}
            </span>

            <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              {language === 'fr' 
                ? 'Pointez votre douchette USB ou Bluetooth vers le code-barres et appuyez sur le bouton.'
                : 'Point your USB or Bluetooth douchette at the barcode and press the trigger.'}
            </p>

            {/* Success flash overlay */}
            {lastScanned && (
              <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-150">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-2 animate-bounce" />
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  {language === 'fr' ? 'Code Scanné !' : 'Barcode Scanned!'}
                </span>
                <span className="mt-1 px-4 py-1.5 bg-emerald-900/60 border border-emerald-500/50 rounded-xl text-lg font-mono font-bold text-white">
                  {lastScanned}
                </span>
              </div>
            )}
          </div>

          {/* Guide: How to connect Douchette */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Info size={16} className="text-emerald-400 shrink-0" />
              <span>{language === 'fr' ? 'Comment connecter votre Douchette à FacturaGo ?' : 'How to connect your Douchette to FacturaGo?'}</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 pl-6 list-disc leading-relaxed">
              <li>
                <strong className="text-slate-300">Douchette USB :</strong> {language === 'fr' ? 'Branchez simplement le câble USB à votre PC. Elle est immédiatement détectée sans aucun logiciel !' : 'Simply plug the USB cable into your PC. It works instantly without drivers!'}
              </li>
              <li>
                <strong className="text-slate-300">Douchette Bluetooth / Sans fil :</strong> {language === 'fr' ? 'Appairez-la avec votre PC/Tablette via Bluetooth. Elle fonctionne comme un clavier أوتوماتيكي.' : 'Pair it with your PC/Tablet via Bluetooth. It acts like an automatic keyboard.'}
              </li>
              <li>
                <strong className="text-slate-300">{language === 'fr' ? 'Scan Direct dans l\'App :' : 'Direct Scanning:'}</strong> {language === 'fr' ? 'Même بدون فتح هذه النافذة, يمكنك المسح بالدوشيت مباشرة في صفحة المبيعات أو المخزون.' : 'You can scan directly on any sales or stock page without opening this window.'}
              </li>
            </ul>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Keyboard size={14} className="text-emerald-400" />
                <span>{language === 'fr' ? 'Saisie Manuelle ou Test' : 'Manual Entry / Test'}</span>
              </span>
              <span className="text-[10px] text-slate-500 normal-case font-normal">
                {language === 'fr' ? 'Tapez ou scannez ici' : 'Type or scan here'}
              </span>
            </label>
            
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={language === 'fr' ? 'Ex: 6111234567890...' : 'Ex: 6111234567890...'}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-900/30"
              >
                {language === 'fr' ? 'Valider' : 'Submit'}
              </button>
            </div>
          </form>

          {/* Secondary File upload option */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-[11px] font-medium text-slate-300 rounded-xl transition-all border border-slate-700/60"
            >
              <Upload size={13} className="text-emerald-400" />
              <span>{language === 'fr' ? 'Tester avec une photo de code-barres' : 'Test with a barcode photo'}</span>
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Volume2 size={13} className="text-emerald-400" />
              <span>{language === 'fr' ? 'Bip sonore actif' : 'Beep active'}</span>
            </div>
          </div>

          {fileError && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BarcodeScannerModal;

