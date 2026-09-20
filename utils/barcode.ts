import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

/**
 * Barcode utility functions: SVG rendering, barcode generation, audio beep, image decoding.
 */

/**
 * Scan barcode from an uploaded image File using ZXing MultiFormatReader + Native BarcodeDetector
 */
export async function scanBarcodeFromFile(file: File): Promise<string | null> {
  // 1. Try ZXing BrowserMultiFormatReader
  try {
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
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    const objectUrl = URL.createObjectURL(file);

    try {
      const img = new Image();
      img.src = objectUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const result = await reader.decodeFromImageElement(img);
      URL.revokeObjectURL(objectUrl);
      if (result && result.getText()) {
        return result.getText();
      }
    } catch (zxingErr) {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (e) {
    // ZXing fallback
  }

  // 2. Fallback to native BarcodeDetector API if available
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector();
      const bitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(bitmap);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch (detectorErr) {
      // ignore
    }
  }

  return null;
}


// Generate EAN-13 / 12-digit random numeric barcode
export function generateBarcodeNumber(prefix: string = '611'): string {
  // 611 is Morocco country code prefix for EAN-13
  const randomDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const baseCode = `${prefix}${randomDigits}`; // 11 digits
  
  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < baseCode.length; i++) {
    const digit = parseInt(baseCode[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${baseCode}${checkDigit}`;
}

// Play feedback beep sound on successful scan
export function playBeepSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Web Audio API might be restricted or unsupported
  }
}

/**
 * Encodes string to Code 128 B pattern representation for SVG rendering.
 */
const CODE128B_PATTERNS: { [key: number]: string } = {
  0: "212222", 1: "222122", 2: "222221", 3: "121223", 4: "121322", 5: "131222",
  6: "122213", 7: "122312", 8: "132212", 9: "221213", 10: "221312", 11: "231212",
  12: "112232", 13: "122132", 14: "122231", 15: "113222", 16: "123122", 17: "123221",
  18: "223211", 19: "221132", 20: "221231", 21: "213212", 22: "223112", 23: "312131",
  24: "311222", 25: "321122", 26: "321221", 27: "312212", 28: "322112", 29: "322211",
  30: "212123", 31: "212321", 32: "232121", 33: "111323", 34: "131123", 35: "131321",
  36: "112313", 37: "132113", 38: "132311", 39: "211313", 40: "231113", 41: "231311",
  42: "112133", 43: "112331", 44: "132131", 45: "113123", 46: "113321", 47: "133121",
  48: "313121", 49: "211331", 50: "231131", 51: "213113", 52: "213311", 53: "213131",
  54: "311123", 55: "311321", 56: "331121", 57: "312113", 58: "312311", 59: "332111",
  60: "314111", 61: "221411", 62: "431111", 63: "111224", 64: "111422", 65: "121124",
  66: "121421", 67: "141122", 68: "141221", 69: "112214", 70: "112412", 71: "122114",
  72: "122411", 73: "142112", 74: "142211", 75: "241211", 76: "221114", 77: "413111",
  78: "241112", 79: "134111", 80: "111242", 81: "121142", 82: "121241", 83: "114212",
  84: "124112", 85: "124211", 86: "411212", 87: "421112", 88: "421211", 89: "212141",
  90: "214121", 91: "412121", 92: "111143", 93: "111341", 94: "131141", 95: "114113",
  96: "114311", 97: "411113", 98: "411311", 99: "113141", 100: "114131", 101: "311141",
  102: "411131", 103: "211412", 104: "211214", 105: "211232" // Start B = 104, Stop = 106 ("2331112")
};

export function renderBarcodeSvgDataUri(code: string, showText: boolean = true): string {
  if (!code) return '';
  const cleanCode = code.trim();
  if (!cleanCode) return '';

  // Code 128 Set B calculation
  const startB = 104;
  let checksum = startB;
  const elements: number[] = [startB];

  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    const code128Val = charCode - 32;
    if (code128Val >= 0 && code128Val <= 95) {
      elements.push(code128Val);
      checksum += code128Val * (i + 1);
    } else {
      // fallback for non-ASCII
      const fallbackVal = 0;
      elements.push(fallbackVal);
      checksum += fallbackVal * (i + 1);
    }
  }

  const checkVal = checksum % 103;
  elements.push(checkVal);

  // Build bar modules string
  let moduleString = "";
  for (const elem of elements) {
    moduleString += CODE128B_PATTERNS[elem] || "212222";
  }
  moduleString += "2331112"; // Stop pattern

  // Generate SVG bars
  const quietZone = 10;
  let x = quietZone;
  let rectsSvg = "";
  const barHeight = showText ? 40 : 50;

  for (let i = 0; i < moduleString.length; i++) {
    const width = parseInt(moduleString[i], 10);
    const isBar = i % 2 === 0;
    if (isBar) {
      rectsSvg += `<rect x="${x}" y="5" width="${width}" height="${barHeight}" fill="#0f172a" />`;
    }
    x += width;
  }

  const totalWidth = x + quietZone;
  const totalHeight = showText ? 65 : 55;

  const textSvg = showText 
    ? `<text x="${totalWidth / 2}" y="58" font-family="monospace" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">${cleanCode}</text>`
    : '';

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%"><rect width="100%" height="100%" fill="#ffffff"/>${rectsSvg}${textSvg}</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}
