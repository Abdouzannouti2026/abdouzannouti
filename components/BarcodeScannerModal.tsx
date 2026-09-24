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
  Repeat
} from 'lucide-react';
import { 
  BarcodeFormat, 
  DecodeHintType, 
  MultiFormatReader, 
  RGBLuminanceSource, 
  BinaryBitmap, 
  HybridBinarizer,
  GlobalHistogramBinarizer
} from '@zxing/library';
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

  // Scan Feedback
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);

  // Manual Input State
  const [manualCode, setManualCode] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<MultiFormatReader | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream & readers
  const stopCameraStream = useCallback(() => {
    isScanningRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
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

  // Enumerate all video cameras on the phone
  const enumerateCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      
      // Auto-select back camera if possible
      const backCameraIdx = videoInputs.findIndex(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('arrière') ||
        d.label.toLowerCase().includes('environment') ||
        d.label.toLowerCase().includes('0')
      );
      if (backCameraIdx !== -1) {
        setSelectedDeviceIndex(backCameraIdx);
      }
    } catch (e) {
      console.warn("Could not enumerate camera devices:", e);
    }
  }, []);

  // Start Camera Stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    setIsCameraReady(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(isAr ? 'المتصفح لا يدعم الوصول للكاميرا' : "Votre navigateur ne supporte pas l'accès à la caméra.");
      }

      const activeDeviceId = videoDevices[selectedDeviceIndex]?.deviceId;

      // Constraints optimized for sharp 1D barcode scanning on modern smartphones
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: activeDeviceId
          ? {
              deviceId: { exact: activeDeviceId },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 }
            }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 }
            }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Refresh camera devices list with actual labels now that permission is granted
      enumerateCameras();

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }

      // Check Torch capability and advanced focus
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
        // Try continuous focus if supported
        if (capabilities && capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          try {
            await videoTrack.applyConstraints({
              // @ts-ignore
              advanced: [{ focusMode: 'continuous' }]
            });
          } catch {}
        }
      }

      // ================= 1. NATIVE BARCODEDETECTOR API (Fastest hardware acceleration) =================
      let nativeDetector: any = null;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
          nativeDetector = new (window as any).BarcodeDetector({
            formats: supportedFormats.filter((f: string) => [
              'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'qr_code', 'data_matrix'
            ].includes(f))
          });
        } catch {
          nativeDetector = null;
        }
      }

      // ================= 2. ZXING MULTI-FORMAT READER (Pro Barcode Engine) =================
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const zxingReader = new MultiFormatReader();
      zxingReader.setHints(hints);
      zxingReaderRef.current = zxingReader;

      isScanningRef.current = true;

      // Fast Offscreen Canvases for multi-scale & cropped central scanning
      const fullCanvas = document.createElement('canvas');
      const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
      const cropCanvas = document.createElement('canvas');
      const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

      let lastFrameTime = 0;
      const TARGET_INTERVAL = 60; // ~16 FPS optimal balance between CPU & detection

      const scanLoop = async (now: number) => {
        if (!isScanningRef.current) return;

        if (now - lastFrameTime >= TARGET_INTERVAL && videoRef.current) {
          lastFrameTime = now;
          const video = videoRef.current;

          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // 1. First Pass: Hardware Native BarcodeDetector
            if (nativeDetector) {
              try {
                const barcodes = await nativeDetector.detect(video);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleBarcodeDetected(barcodes[0].rawValue);
                  return;
                }
              } catch {}
            }

            // 2. Second Pass: ZXing on Central Cropped Band (Where red laser is aimed)
            if (cropCtx && zxingReaderRef.current) {
              try {
                // Focus on 80% width and 40% height center band for super crisp 1D barcodes
                const cropW = Math.floor(vw * 0.85);
                const cropH = Math.floor(vh * 0.45);
                const cropX = Math.floor((vw - cropW) / 2);
                const cropY = Math.floor((vh - cropH) / 2);

                cropCanvas.width = cropW;
                cropCanvas.height = cropH;
                cropCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                const cropImgData = cropCtx.getImageData(0, 0, cropW, cropH);
                const luminanceSource = new RGBLuminanceSource(cropImgData.data, cropW, cropH);
                
                // Try HybridBinarizer first
                try {
                  const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
                  const result = zxingReaderRef.current.decode(binaryBitmap);
                  if (result && result.getText()) {
                    handleBarcodeDetected(result.getText());
                    return;
                  }
                } catch {
                  // Try GlobalHistogramBinarizer on difficult contrast
                  try {
                    const globalBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
                    const result = zxingReaderRef.current.decode(globalBitmap);
                    if (result && result.getText()) {
                      handleBarcodeDetected(result.getText());
                      return;
                    }
                  } catch {}
                }
              } catch {}
            }

            // 3. Third Pass: Full Frame ZXing (for QR codes and larger codes)
            if (fullCtx && zxingReaderRef.current) {
              try {
                fullCanvas.width = vw;
                fullCanvas.height = vh;
                fullCtx.drawImage(video, 0, 0, vw, vh);

                const fullImgData = fullCtx.getImageData(0, 0, vw, vh);
                const luminanceSource = new RGBLuminanceSource(fullImgData.data, vw, vh);
                const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
                const result = zxingReaderRef.current.decode(binaryBitmap);
                if (result && result.getText()) {
                  handleBarcodeDetected(result.getText());
                  return;
                }
              } catch {}
            }
          }
        }

        if (isScanningRef.current) {
          animFrameIdRef.current = requestAnimationFrame(scanLoop);
        }
      };

      animFrameIdRef.current = requestAnimationFrame(scanLoop);

    } catch (err: any) {
      console.error('Camera access error:', err);
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
  }, [selectedDeviceIndex, videoDevices, isAr, handleBarcodeDetected, stopCameraStream, enumerateCameras]);

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

  // Switch between back cameras or cycle through devices
  const switchCamera = () => {
    if (videoDevices.length > 1) {
      setSelectedDeviceIndex(prev => (prev + 1) % videoDevices.length);
    } else {
      startCameraStream();
    }
  };

  // Handle Photo Capture / Image upload fallback
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
          ? 'لم يتم التعرف على الباركود في الصورة. يرجى التأكد من وضوح خطوط الباركود والإضاءة.' 
          : 'Aucun code-barres net détecté sur la photo. Assurez-vous que les barres sont bien lisibles.');
      }
    } catch (err) {
      console.error('Error scanning from photo:', err);
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

  // Lifecycle when modal opens
  useEffect(() => {
    if (isOpen) {
      enumerateCameras();
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, selectedDeviceIndex, startCameraStream, stopCameraStream, enumerateCameras]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Main Container */}
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150 max-h-[95vh]" 
        dir={isAr ? 'rtl' : 'ltr'}
      >
        
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                {title || (isAr ? 'ماسح الباركود الاحترافي (ZXing)' : 'Scanner Code-Barres Pro (ZXing)')}
              </h3>
              {videoDevices.length > 1 && (
                <p className="text-[11px] text-slate-400 font-medium">
                  {isAr ? `الكاميرا ${selectedDeviceIndex + 1} من ${videoDevices.length}` : `Caméra ${selectedDeviceIndex + 1}/${videoDevices.length}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch Camera Button */}
            <button
              type="button"
              onClick={switchCamera}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              title={isAr ? 'تبديل الكاميرا' : 'Changer de caméra'}
            >
              <RotateCcw size={17} />
            </button>

            {/* Flashlight Button */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl border transition-colors ${
                  isTorchOn 
                    ? 'bg-amber-500 border-amber-600 text-white shadow-xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title={isTorchOn ? 'Éteindre la torche' : 'Allumer la torche'}
              >
                {isTorchOn ? <Flashlight size={17} /> : <FlashlightOff size={17} />}
              </button>
            )}

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={() => setSoundActive(prev => !prev)}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              title={soundActive ? 'Désactiver le son' : 'Activer le son'}
            >
              {soundActive ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors"
              title={isAr ? 'إغلاق' : 'Fermer'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= SCROLLABLE CONTENT BODY ================= */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(95vh-4.5rem)]">
          
          {/* CAMERA VIEWPORT */}
          <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-900">
            {/* Live Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Subtle dark vignette overlay */}
            <div className="absolute inset-0 bg-radial-[ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.65)_100%] pointer-events-none" />

            {/* High-Contrast Laser & Target Box */}
            <div className="relative z-10 w-[88%] h-[60%] border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_15px_rgba(52,211,153,0.3)] flex flex-col justify-center pointer-events-none">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

              {/* Red glowing Laser Line */}
              <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse" />
            </div>

            {/* Bottom Target Label Inside Camera */}
            <div className="absolute bottom-2.5 inset-x-4 z-10 flex justify-center pointer-events-none">
              <span className="px-3.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white font-bold text-[11px] border border-slate-800 shadow-md">
                {isAr ? 'ضع خطوط الباركود داخل المربع بوضوح' : 'Placez les barres du code dans le cadre'}
              </span>
            </div>

            {/* Success Scan Flash overlay */}
            {lastScannedCode && (
              <div className="absolute inset-0 z-20 bg-emerald-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center animate-in zoom-in-95 duration-150">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/40">
                  <CheckCircle2 size={28} />
                </div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-extrabold">
                  {isAr ? 'تمت القراءة بنجاح !' : 'CODE SCANNÉ !'}
                </span>
                <span className="mt-1 px-4 py-1.5 bg-slate-950/90 border border-emerald-400 rounded-xl text-lg font-mono font-black text-white">
                  {lastScannedCode}
                </span>
              </div>
            )}
          </div>

          {/* Camera Error Message */}
          {cameraError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={17} className="shrink-0 mt-0.5 text-rose-500" />
              <div>
                <p className="font-bold">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCameraStream}
                  className="mt-1.5 text-emerald-600 font-bold underline hover:text-emerald-700"
                >
                  {isAr ? 'إعادة محاولة تشغيل الكاميرا' : 'Réessayer d\'activer la caméra'}
                </button>
              </div>
            </div>
          )}

          {/* PRO TIP BOX (MATCHING USER SCREENSHOT) */}
          <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl text-teal-900 text-xs leading-relaxed flex items-start gap-2.5">
            <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-teal-950">
                {isAr ? 'نصيحة للمسح السريع: ' : 'Astuce pour un scan rapide : '}
              </span>
              <span className="text-teal-800">
                {isAr
                  ? 'أبعد الهاتف قليلاً عن الباركود (حوالي 25-30 سم) لتفادي الضبابية، واستخدم زر 🔄 بالأعلى للتبديل بين كاميرات الهاتف الخلفية المتعددة حتى تظهر لك كاميرا التركيز الدقيقة 1x.'
                  : 'Éloignez le téléphone de 25 à 30 cm pour une netteté maximale et utilisez le bouton 🔄 pour basculer entre les objectifs arrière jusqu\'à trouver la caméra 1x.'}
              </span>
            </div>
          </div>

          {/* MANUAL INPUT BARCODE */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Search size={14} />
              <span>{isAr ? 'بحث' : 'Rechercher'}</span>
            </button>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={isAr ? 'أو أدخل رقم الباركود يدوياً...' : 'Ou entrez le code-barres manuellement...'}
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </form>

          {/* HIGH-RES PHOTO CAPTURE BUTTON */}
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
              className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-2xl text-xs font-extrabold text-teal-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isProcessingFile ? (
                <>
                  <Loader2 size={16} className="animate-spin text-teal-600" />
                  <span>{isAr ? 'جاري فك تشفير الصورة...' : 'Décodage de la photo en cours...'}</span>
                </>
              ) : (
                <>
                  <ImageIcon size={16} className="text-teal-600" />
                  <span>{isAr ? 'التقاط صورة للباركود بكاميرا الهاتف 📸' : 'Prendre une photo nette avec l\'appareil 📸'}</span>
                </>
              )}
            </button>
          </div>

          {/* QUICK DEMO SAMPLES (FOR EASY TESTING) */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-semibold mb-2">
              {isAr ? 'سلع مسجلة سريعة للتجربة :' : 'Codes rapides pour tester :'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleBarcodeDetected('6114539455331')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-mono font-medium transition-colors"
              >
                Huile (6114539455331)
              </button>
              <button
                type="button"
                onClick={() => handleBarcodeDetected('6118000330226')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-mono font-medium transition-colors"
              >
                Spasfon (6118000330226)
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
