import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Flashlight, 
  FlashlightOff, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Camera, 
  Lightbulb,
  Image as ImageIcon,
  Loader2,
  Scan
} from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
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
  const isAr = language === 'ar';

  // Video and Device State
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number>(0);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [isContinuous, setIsContinuous] = useState<boolean>(continuous);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  // Scan Feedback
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);

  // Manual Input State
  const [manualCode, setManualCode] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(false);

  // Stop camera stream & ZXing reader
  const stopScanner = useCallback(() => {
    if (scannerControlsRef.current) {
      try {
        scannerControlsRef.current.stop();
      } catch {}
      scannerControlsRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      } catch {}
    }
    setIsCameraReady(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Successful scan handler
  const handleBarcodeDetected = useCallback((code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const now = Date.now();
    // Debounce duplicate scans within 1.5 seconds if continuous mode
    if (lastScannedRef.current.code === cleanCode && (now - lastScannedRef.current.time) < 1500) {
      return;
    }

    lastScannedRef.current = { code: cleanCode, time: now };

    // Haptic vibration feedback on phone
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {}
    }

    // Beep sound
    if (soundActive) {
      playBeepSound();
    }

    setLastScannedCode(cleanCode);
    setScanCount(prev => prev + 1);
    onScan(cleanCode);

    if (!isContinuous) {
      // Single scan: close after short confirmation
      setTimeout(() => {
        stopScanner();
        onClose();
      }, 400);
    } else {
      // Continuous scan: briefly flash code and keep scanning
      setTimeout(() => {
        setLastScannedCode(null);
      }, 1500);
    }
  }, [isContinuous, soundActive, onScan, onClose, stopScanner]);

  // Start ZXing Browser Multi-Format Scanner directly on the video element
  const startScanner = useCallback(async (deviceIndexToUse: number) => {
    stopScanner();
    setCameraError(null);
    setIsCameraReady(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(isAr ? 'المتصفح لا يدعم الوصول للكاميرا' : "Votre navigateur ne supporte pas l'accès à la caméra.");
      }

      // Initialize ZXing reader with optimal barcode formats & TRY_HARDER
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints, 80); // 80ms interval between scans (~12 FPS)
      readerRef.current = codeReader;

      // Enumerate available video inputs
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      const targetDevice = videoInputs[deviceIndexToUse];
      const videoConstraints: MediaTrackConstraints = targetDevice?.deviceId
        ? {
            deviceId: { exact: targetDevice.deviceId },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          }
        : {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          };

      if (!videoRef.current) return;

      // Start ZXing decoding stream
      const controls = await codeReader.decodeFromConstraints(
        { video: videoConstraints, audio: false },
        videoRef.current,
        (result, error) => {
          if (result && result.getText()) {
            handleBarcodeDetected(result.getText());
          }
        }
      );

      scannerControlsRef.current = controls;
      setIsCameraReady(true);

      // Check Torch and Autofocus
      setTimeout(() => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          if (track) {
            const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
            if (capabilities && capabilities.torch) {
              setHasTorch(true);
            }
          }
        }
      }, 500);

    } catch (err: any) {
      console.error('ZXing Scanner launch error:', err);
      let errorMsg = isAr 
        ? 'تعذر تشغيل الكاميرا. يرجى التأكد من السماح للتطبيق باستخدام الكاميرا في إعدادات المتصفح.'
        : "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = isAr
          ? 'تم رفض إذن الكاميرا. يرجى تفعيل إذن الكاميرا من إعدادات المتصفح.'
          : "L'autorisation d'accès à la caméra a été refusée.";
      }
      setCameraError(errorMsg);
    }
  }, [isAr, handleBarcodeDetected, stopScanner]);

  // Toggle Torch (Flashlight)
  const toggleTorch = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const newState = !isTorchOn;
        await track.applyConstraints({
          // @ts-ignore
          advanced: [{ torch: newState }]
        });
        setIsTorchOn(newState);
      } catch (e) {
        console.warn('Torch toggle failed', e);
      }
    }
  };

  // Switch between back cameras (e.g. 1x vs 0.5x)
  const switchCamera = () => {
    if (videoDevices.length > 1) {
      const nextIdx = (selectedDeviceIndex + 1) % videoDevices.length;
      setSelectedDeviceIndex(nextIdx);
      startScanner(nextIdx);
    } else {
      startScanner(0);
    }
  };

  // Handle Photo Capture fallback
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      const decoded = await scanBarcodeFromFile(file);
      if (decoded) {
        handleBarcodeDetected(decoded);
      } else {
        alert(isAr 
          ? 'لم يتم العثور على باركود واضح في الصورة. يرجى التأكد من وضوح الخطوط والإضاءة.' 
          : 'Aucun code-barres détecté. Assurez-vous que l\'image est bien nette et éclairée.');
      }
    } catch (err) {
      console.error('Error scanning photo:', err);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleBarcodeDetected(manualCode.trim());
      setManualCode('');
    }
  };

  // Open / Close Lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      startScanner(selectedDeviceIndex);
    } else {
      stopScanner();
    }

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black text-white select-none overflow-hidden animate-in fade-in duration-200">
      
      {/* ================= FULL SCREEN LIVE CAMERA VIEWPORT ================= */}
      <div className="relative flex-1 w-full h-full bg-black overflow-hidden flex items-center justify-center">
        
        {/* The Live Video Element occupying the whole screen */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Ambient Dark Gradient Overlays for UI readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />

        {/* Wide Full-Width Horizontal Scanning Guide Overlay */}
        <div className="relative z-10 w-[92%] max-w-lg aspect-[16/10] sm:aspect-[16/9] border-2 border-dashed border-emerald-400/70 rounded-3xl flex flex-col items-center justify-between p-4 pointer-events-none shadow-[0_0_30px_rgba(52,211,153,0.25)]">
          {/* Corner Brackets */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl shadow-[0_0_10px_#10b981]" />
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl shadow-[0_0_10px_#10b981]" />
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl shadow-[0_0_10px_#10b981]" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl shadow-[0_0_10px_#10b981]" />

          {/* Animated Sweeping Horizontal Red Laser */}
          <div className="absolute inset-x-2 top-0 bottom-0 overflow-hidden flex flex-col justify-center">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_16px_#f43f5e] animate-bounce duration-1000" />
          </div>

          {/* Center hint label */}
          <div className="mt-auto px-4 py-1.5 rounded-full bg-black/75 border border-emerald-500/40 text-emerald-300 font-bold text-xs backdrop-blur-md flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {isAr ? 'ضع خطوط الباركود داخل الإطار بوضوح' : 'Placez le code-barres dans le cadre'}
            </span>
          </div>
        </div>

        {/* Success Scan Flash overlay */}
        {lastScannedCode && (
          <div className="absolute inset-0 z-30 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500 text-black flex items-center justify-center mb-3 shadow-[0_0_40px_rgba(16,185,129,0.7)] animate-bounce">
              <CheckCircle2 size={44} />
            </div>
            <span className="text-xs uppercase tracking-widest text-emerald-300 font-black">
              {isAr ? 'تمت قراءة الباركود بنجاح !' : 'CODE-BARRES SCANNÉ !'}
            </span>
            <span className="mt-2 px-6 py-2.5 bg-black/90 border-2 border-emerald-400 rounded-2xl text-2xl sm:text-3xl font-mono font-black text-white shadow-2xl">
              {lastScannedCode}
            </span>
          </div>
        )}

        {/* Camera Error Modal Message */}
        {cameraError && (
          <div className="absolute inset-x-4 top-24 z-20 p-4 bg-rose-950/90 border border-rose-500/60 rounded-3xl text-rose-200 text-xs backdrop-blur-md flex items-start gap-3 shadow-2xl">
            <AlertCircle size={20} className="shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={() => startScanner(selectedDeviceIndex)}
                className="mt-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs"
              >
                {isAr ? 'إعادة المحاولة' : 'Réessayer'}
              </button>
            </div>
          </div>
        )}

        {/* ================= TOP FLOATING HEADER ================= */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 sm:p-6" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-white leading-tight">
                {title || (isAr ? 'ماسح الباركود (ZXing)' : 'Scanner Code-Barres (ZXing)')}
              </h3>
              {videoDevices.length > 1 && (
                <p className="text-[10px] text-emerald-300">
                  {isAr ? `العدسة ${selectedDeviceIndex + 1}/${videoDevices.length}` : `Objectif ${selectedDeviceIndex + 1}/${videoDevices.length}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch Camera Button 🔄 */}
            <button
              type="button"
              onClick={switchCamera}
              className="p-3 rounded-2xl bg-black/60 hover:bg-black/90 active:scale-95 border border-white/10 hover:border-emerald-500 text-white transition-all shadow-lg"
              title={isAr ? 'تبديل الكاميرا (1x / 0.5x)' : 'Basculer d\'objectif (1x / 0.5x)'}
            >
              <RotateCcw size={18} />
            </button>

            {/* Flashlight Button */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-3 rounded-2xl border transition-all shadow-lg active:scale-95 ${
                  isTorchOn 
                    ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)]' 
                    : 'bg-black/60 border-white/10 text-white hover:bg-black/90'
                }`}
                title={isTorchOn ? 'Éteindre la torche' : 'Allumer la torche'}
              >
                {isTorchOn ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
              </button>
            )}

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={() => setSoundActive(prev => !prev)}
              className="p-3 rounded-2xl bg-black/60 hover:bg-black/90 border border-white/10 text-white transition-all shadow-lg active:scale-95"
              title={soundActive ? 'Désactiver le son' : 'Activer le son'}
            >
              {soundActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-3 rounded-2xl bg-black/60 hover:bg-rose-600 border border-white/10 hover:border-rose-500 text-white transition-all shadow-lg active:scale-95 cursor-pointer"
              title={isAr ? 'إغلاق' : 'Fermer'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= BOTTOM FLOATING BAR & CONTROLS ================= */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 sm:p-6 space-y-3" dir={isAr ? 'rtl' : 'ltr'}>
          
          {/* Fast Tip Box */}
          <div className="p-3 bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 text-[11px] leading-relaxed flex items-center gap-2.5 text-slate-200 shadow-xl">
            <Lightbulb size={16} className="text-amber-400 shrink-0" />
            <span>
              {isAr
                ? 'أبعد الهاتف قليلاً (حوالي 25 سم) لتوضيح الصورة، واستخدم زر 🔄 بالأعلى للتبديل بين عدسات الكاميرا حتى تظهر لك كاميرا 1x الدقيقة.'
                : 'Éloignez le téléphone de 25 cm pour une netteté maximale et utilisez 🔄 pour choisir la caméra 1x.'}
            </span>
          </div>

          {/* Action Row: Manual Input & Photo Capture */}
          <div className="flex flex-col sm:flex-row gap-2">
            
            {/* Direct Search Barcode Input */}
            <form onSubmit={handleManualSubmit} className="flex-1 flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={isAr ? 'أو أدخل رقم الباركود يدوياً...' : 'Ou entrez le code manuellement...'}
                className="flex-1 bg-black/70 backdrop-blur-md border border-white/15 focus:border-emerald-400 rounded-2xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <Search size={14} />
                <span>{isAr ? 'بحث' : 'Rechercher'}</span>
              </button>
            </form>

            {/* High-Resolution Photo Capture Button Fallback */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isProcessingFile}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-2.5 bg-black/70 hover:bg-black/90 active:scale-95 backdrop-blur-md border border-white/15 hover:border-emerald-400 rounded-2xl text-xs font-bold text-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isProcessingFile ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-emerald-400" />
                    <span>{isAr ? 'جاري التحليل...' : 'Décodage...'}</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={15} className="text-emerald-400" />
                    <span>{isAr ? 'التقاط صورة للباركود 📸' : 'Prendre une photo 📸'}</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>,
    document.body
  );
};

export default BarcodeScannerModal;
