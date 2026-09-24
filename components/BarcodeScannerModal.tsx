import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Flashlight, 
  FlashlightOff, 
  SwitchCamera, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Zap, 
  AlertCircle, 
  Keyboard, 
  Scan, 
  Camera, 
  Sparkles,
  Repeat
} from 'lucide-react';
import { 
  BarcodeFormat, 
  DecodeHintType, 
  MultiFormatReader, 
  RGBLuminanceSource, 
  BinaryBitmap, 
  HybridBinarizer 
} from '@zxing/library';
import { playBeepSound } from '../utils/barcode';
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

  // Mode: 'camera' | 'manual'
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  
  // Camera & Stream State
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isContinuous, setIsContinuous] = useState<boolean>(continuous);
  const [soundActive, setSoundActive] = useState<boolean>(true);

  // Scan Feedback
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);

  // Manual Input State
  const [manualCode, setManualCode] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<MultiFormatReader | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Stop camera stream & readers
  const stopCameraStream = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (zxingReaderRef.current) {
      zxingReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    setIsTorchOn(false);
    setHasTorch(false);
    isScanningRef.current = false;
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
        navigator.vibrate([70, 40, 70]);
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
        stopCameraStream();
        onClose();
      }, 350);
    } else {
      // Continuous scan: briefly flash code and keep scanning
      setTimeout(() => {
        setLastScannedCode(null);
      }, 1500);
    }
  }, [isContinuous, soundActive, onScan, onClose, stopCameraStream]);

  // Start Camera Stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    setIsCameraReady(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(language === 'ar' ? 'المتصفح لا يدعم الوصول للكاميرا' : "Votre navigateur ne supporte pas l'accès à la caméra.");
      }

      // Constraints for high performance barcode scanning on mobile
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          // @ts-ignore
          focusMode: { ideal: 'continuous' }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }

      // Check Torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      }

      // ================= 1. NATIVE BARCODEDETECTOR API (Fastest hardware acceleration) =================
      let nativeDetector: any = null;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
          nativeDetector = new (window as any).BarcodeDetector({
            formats: supportedFormats.filter((f: string) => [
              'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'itf', 'data_matrix'
            ].includes(f))
          });
        } catch {
          nativeDetector = null;
        }
      }

      // ================= 2. ZXING MULTI-FORMAT READER (Universal Fallback) =================
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

      const zxingReader = new MultiFormatReader();
      zxingReader.setHints(hints);
      zxingReaderRef.current = zxingReader;

      isScanningRef.current = true;

      // Canvas for high-speed frame sampling
      const sampleCanvas = document.createElement('canvas');
      const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

      // Scan Loop (~20 to 30 FPS)
      const processFrame = async () => {
        if (!isScanningRef.current || !videoRef.current) return;

        const video = videoRef.current;
        if (video.readyState < 2 || video.videoWidth === 0) {
          return;
        }

        // Try Native BarcodeDetector first
        if (nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleBarcodeDetected(barcodes[0].rawValue);
              return;
            }
          } catch {
            // fallback to zxing
          }
        }

        // ZXing Fallback via canvas sampling
        if (sampleCtx && zxingReaderRef.current) {
          try {
            sampleCanvas.width = video.videoWidth;
            sampleCanvas.height = video.videoHeight;
            sampleCtx.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);

            const imgData = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
            const luminanceSource = new RGBLuminanceSource(
              imgData.data,
              sampleCanvas.width,
              sampleCanvas.height
            );
            const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
            const result = zxingReaderRef.current.decode(binaryBitmap);
            if (result && result.getText()) {
              handleBarcodeDetected(result.getText());
            }
          } catch {
            // Frame did not contain a decoded barcode, loop continues
          }
        }
      };

      // Set scanning interval
      scanIntervalRef.current = window.setInterval(processFrame, 65);

    } catch (err: any) {
      console.error('Camera access error:', err);
      let errorMsg = language === 'ar' 
        ? 'تعذر تشغيل الكاميرا. يرجى التأكد من السماح للتطبيق باستخدام الكاميرا في إعدادات المتصفح.'
        : "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = language === 'ar'
          ? 'تم رفض إذن الكاميرا. يرجى تفعيل إذن الكاميرا من إعدادات المتصفح.'
          : "L'autorisation d'accès à la caméra a été refusée.";
      }
      setCameraError(errorMsg);
      setActiveTab('manual');
    }
  }, [cameraFacing, language, handleBarcodeDetected, stopCameraStream]);

  // Toggle Torch (Flashlight)
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
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

  // Switch between front/back camera
  const switchCameraFacing = () => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Restart camera when switching facing mode or when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab, cameraFacing, startCameraStream, stopCameraStream]);

  // Auto focus manual input when tab switched
  useEffect(() => {
    if (activeTab === 'manual') {
      setTimeout(() => manualInputRef.current?.focus(), 150);
    }
  }, [activeTab]);

  // Handle manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleBarcodeDetected(manualCode.trim());
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Main Container - Fullscreen on Mobile ("Chada telephone kaml") */}
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-slate-950 sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-800 flex flex-col overflow-hidden text-white">
        
        {/* ================= HEADER OVERLAY ================= */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white leading-tight flex items-center gap-2">
                <span>{title || (language === 'ar' ? 'مسح الباركود بالكاميرا' : 'Scanner Code-Barres')}</span>
                {scanCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                    +{scanCount}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300">
                {activeTab === 'camera' 
                  ? (language === 'ar' ? 'كاميرا الهاتف المباشرة' : 'Caméra Smartphone HD') 
                  : (language === 'ar' ? 'إدخال يدوي' : 'Saisie manuelle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mode Tabs (Camera / Manual) */}
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex items-center">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'camera' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Caméra"
              >
                <Camera size={13} />
                <span className="hidden sm:inline">{language === 'ar' ? 'كاميرا' : 'Caméra'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'manual' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Manuel"
              >
                <Keyboard size={13} />
                <span className="hidden sm:inline">{language === 'ar' ? 'يدوي' : 'Manuel'}</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-600 border border-slate-800 hover:border-rose-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={language === 'ar' ? 'إغلاق' : 'Fermer'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= CAMERA VIEWPORT (IMMERSIVE FULL SCREEN) ================= */}
        {activeTab === 'camera' && (
          <div className="relative flex-1 w-full min-h-[420px] sm:min-h-[480px] bg-black flex items-center justify-center overflow-hidden">
            
            {/* Live Video Element spanning full viewport */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Darker subtle gradient border edges to focus the scan area */}
            <div className="absolute inset-0 bg-radial-[ellipse_at_center,_transparent_45%,_rgba(2,6,23,0.7)_100%] pointer-events-none" />

            {/* Full-width Wide Laser Barcode Target Overlay */}
            <div className="relative z-10 w-[88%] max-w-lg aspect-[16/10] sm:aspect-[16/9] flex flex-col items-center justify-between p-4 pointer-events-none">
              
              {/* Corner Brackets (Wide viewfinder) */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />

              {/* Glowing animated vertical sweep laser line */}
              <div className="absolute inset-x-2 top-0 bottom-0 overflow-hidden flex flex-col justify-center pointer-events-none">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_16px_#10b981] animate-bounce duration-1000" />
              </div>

              {/* Scanning status hint badge */}
              <div className="mt-auto px-4 py-1.5 rounded-full bg-slate-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs backdrop-blur-md flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {language === 'ar' ? 'ضع خطوط الباركود داخل الإطار' : 'Placez le code-barres dans la zone'}
                </span>
              </div>
            </div>

            {/* Success Scan Flash overlay */}
            {lastScannedCode && (
              <div className="absolute inset-0 z-20 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-150">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-slate-950 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <span className="text-xs uppercase tracking-widest text-emerald-300 font-black">
                  {language === 'ar' ? 'تمت القراءة بنجاح !' : 'CODE-BARRES SCANNÉ !'}
                </span>
                <span className="mt-2 px-5 py-2 bg-slate-950/90 border-2 border-emerald-400 rounded-2xl text-xl sm:text-2xl font-mono font-black text-white shadow-xl">
                  {lastScannedCode}
                </span>
                {isContinuous && (
                  <span className="mt-3 text-xs text-emerald-200 font-medium">
                    {language === 'ar' ? 'متابعة المسح...' : 'Prêt pour le prochain article...'}
                  </span>
                )}
              </div>
            )}

            {/* Floating Camera Controls (Torch, Switch Camera, Sound, Continuous) */}
            <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between pointer-events-auto">
              
              {/* Left Controls: Sound + Continuous toggle */}
              <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSoundActive(prev => !prev)}
                  className={`p-2.5 rounded-xl transition-all ${
                    soundActive ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={soundActive ? 'Désactiver le bip' : 'Activer le bip'}
                >
                  {soundActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsContinuous(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isContinuous 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Scanner plusieurs articles d'affilée"
                >
                  <Repeat size={14} className={isContinuous ? 'animate-spin' : ''} />
                  <span>{language === 'ar' ? 'مسح متتابع' : 'Continu'}</span>
                </button>
              </div>

              {/* Right Controls: Torch + Switch Camera */}
              <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2.5 rounded-xl transition-all ${
                      isTorchOn 
                        ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={isTorchOn ? 'Éteindre le flash' : 'Allumer le flash (Lampe torche)'}
                  >
                    {isTorchOn ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={switchCameraFacing}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
                  title="Changer de caméra (Avant / Arrière)"
                >
                  <SwitchCamera size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MANUAL / DOUCHETTE TAB ================= */}
        {activeTab === 'manual' && (
          <div className="p-6 space-y-6 flex-1 flex flex-col justify-center bg-slate-950">
            
            {/* Notice if camera was denied */}
            {cameraError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <p className="font-bold">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('camera');
                      startCameraStream();
                    }}
                    className="mt-2 text-emerald-400 font-bold underline hover:text-emerald-300 cursor-pointer"
                  >
                    {language === 'ar' ? 'إعادة محاولة تشغيل الكاميرا' : 'Réessayer d\'activer la caméra'}
                  </button>
                </div>
              </div>
            )}

            {/* Manual Form */}
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <Keyboard size={16} className="text-emerald-400" />
                  <span>{language === 'ar' ? 'أدخل كود الباركود يدوياً أو بالدوشيت' : 'Saisie du Code-Barres ou Douchette'}</span>
                </span>
              </label>

              <div className="flex gap-2">
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: 6111234567890...' : 'Ex: 6111234567890...'}
                  className="flex-1 bg-slate-900 border-2 border-slate-800 focus:border-emerald-500 rounded-2xl px-5 py-3.5 text-base text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-emerald-950 active:scale-95 cursor-pointer"
                >
                  {language === 'ar' ? 'تأكيد' : 'Valider'}
                </button>
              </div>
            </form>

            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 text-xs text-slate-400 leading-relaxed flex items-center gap-3">
              <Zap size={20} className="text-emerald-400 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'يمكنك أيضاً استخدام قارئ الباركود (Douchette USB/Bluetooth) في أي وقت مباشرة بدون الحاجة لفتح هذه النافذة.'
                  : 'Vous pouvez aussi utiliser votre douchette USB ou Bluetooth directement à tout moment.'}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default BarcodeScannerModal;
