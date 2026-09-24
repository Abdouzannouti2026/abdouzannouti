import {
  CompanySettings,
  Invoice,
  Quote,
  DeliveryNote,
  PurchaseOrder,
  Client,
  Supplier,
  LineItem,
  DocumentColumn,
  CreditNote,
} from "../types";
import { translations } from "../i18n/translations";
import html2pdf from "html2pdf.js";
import { getCurrencyByCode, roundPrice } from "./currencyService";
import { renderBarcodeSvgDataUri } from "../utils/barcode";

export interface DocumentData {
  id: string;
  documentId?: string;
  date: string;
  lineItems: LineItem[];
  subTotal?: number;
  vatAmount?: number;
  totalAmount?: number;
  amount?: number;
  amountPaid?: number;
  paymentAmount?: number;
  notes?: string;
  subject?: string;
  paymentMethod?: string;
  checkNumber?: string;
  bankName?: string;
  reference?: string;
  purchaseOrderNumber?: string;
  dueDate?: string;
  expiryDate?: string;
  expectedDate?: string;
  invoiceId?: string; // For Credit Notes
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  showDimensions?: boolean;
}

export interface PDFOptions {
  showPrices?: boolean;
  isPDFDownload?: boolean;
  fontSize?: number | "compact" | "small" | "normal" | "large" | "xlarge";
}

export type DocumentType =
  | "Facture"
  | "Devis"
  | "Bon de Livraison"
  | "Bon de Commande"
  | "Avoir";

// --- Utilitaires de conversion Chiffres vers Lettres (Français) ---

const UNITS = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
];
const TEENS = [
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante-dix",
  "quatre-vingt",
  "quatre-vingt-dix",
];

const convertGroup = (n: number, isEnd: boolean): string => {
  if (n === 0) return "";
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];

  const ten = Math.floor(n / 10);
  const unit = n % 10;

  if (ten === 7 || ten === 9) {
    const base = TENS[ten - 1];
    const sub = unit + 10;
    if (unit === 1 && ten === 7) return `${base}-et-onze`;
    return `${base}-${TEENS[unit]}`;
  }

  const tenString = TENS[ten];

  if (unit === 0) {
    if (ten === 8 && isEnd) return "quatre-vingts";
    return tenString;
  }

  if (unit === 1 && ten < 8) return `${tenString}-et-un`;

  return `${tenString}-${UNITS[unit]}`;
};

const numberToWordsFr = (amount: number, settings?: CompanySettings | null): string => {
  const currencyCode = settings?.defaultCurrencyCode || 'MAD';
  const currencyConfig = getCurrencyByCode(currencyCode);
  
  // Plural unit name from currency service or default
  const pluralUnit = (currencyConfig?.pluralNameFr || 'dirhams').toLowerCase();
  
  // Singular unit name (e.g. "dirham", "euro", "dinar algérien")
  let singularUnit = pluralUnit;
  if (pluralUnit === "dinars algériens") {
    singularUnit = "dinar algérien";
  } else if (pluralUnit === "livres sterling") {
    singularUnit = "livre sterling";
  } else if (pluralUnit.endsWith("s")) {
    singularUnit = pluralUnit.slice(0, -1);
  }

  // Subunit names (e.g. "centime", "centimes", "cents", "pence")
  const pluralSubunit = (currencyConfig?.subUnitNameFr || 'centimes').toLowerCase();
  let singularSubunit = pluralSubunit;
  if (pluralSubunit.endsWith("s")) {
    singularSubunit = pluralSubunit.slice(0, -1);
  }

  // Round amount to 2 decimal places to avoid floating point precision issues (e.g. 9999.996 -> 10000.00)
  const totalCents = Math.round(Math.abs(amount) * 100);
  const integerPart = Math.floor(totalCents / 100);
  const decimalPart = totalCents % 100;

  if (integerPart === 0 && decimalPart === 0) return `Zéro ${singularUnit}`;

  const convertIntegerGroup = (n: number, isEnd: boolean): string => {
    let str = "";
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundreds > 0) {
      if (hundreds === 1) str += "cent ";
      else if (remainder === 0 && isEnd) str += `${UNITS[hundreds]} cents `;
      else str += `${UNITS[hundreds]} cent `;
    }

    if (remainder > 0) {
      str += convertGroup(remainder, isEnd);
    }

    return str.trim();
  };

  const convertInteger = (n: number): string => {
    if (n === 0) return "";

    let words = "";

    // Billions
    const billions = Math.floor(n / 1000000000);
    let remainder = n % 1000000000;
    if (billions > 0) {
      words +=
        (billions === 1
          ? "un milliard"
          : `${convertIntegerGroup(billions, true)} milliards`) + " ";
    }

    // Millions
    const millions = Math.floor(remainder / 1000000);
    remainder %= 1000000;
    if (millions > 0) {
      words +=
        (millions === 1
          ? "un million"
          : `${convertIntegerGroup(millions, true)} millions`) + " ";
    }

    // Thousands
    const thousands = Math.floor(remainder / 1000);
    const remainderThousand = remainder % 1000;
    if (thousands > 0) {
      if (thousands === 1) words += "mille ";
      else words += `${convertIntegerGroup(thousands, false)} mille `;
    }

    // Hundreds
    if (remainderThousand > 0) {
      words += convertIntegerGroup(remainderThousand, true);
    }

    return words.trim();
  };

  let result = "";
  if (integerPart === 0) {
    result = `zéro ${singularUnit}`;
  } else {
    result =
      convertInteger(integerPart) +
      " " + (integerPart === 1 ? singularUnit : pluralUnit);
  }

  if (decimalPart > 0) {
    const subWord = convertIntegerGroup(decimalPart, true);
    result += ` et ${subWord} ${decimalPart > 1 ? pluralSubunit : singularSubunit}`;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
};

const DEFAULT_COLUMNS: DocumentColumn[] = [
  { id: "reference", label: "Réf", visible: false, order: 0 },
  { id: "name", label: "Désignation", visible: true, order: 1 },
  { id: "quantity", label: "Qté", visible: true, order: 2 },
  { id: "unit", label: "Unité", visible: true, order: 3 },
  { id: "unitPrice", label: "P.U. HT", visible: true, order: 4 },
  { id: "vat", label: "TVA", visible: true, order: 5 },
  { id: "total", label: "Total HT", visible: true, order: 6 },
  { id: "avoir", label: "AV", visible: false, order: 7 },
];

export const isAvoirCol = (c: any): boolean => {
  if (!c) return false;
  const cid = String(c.id || "").toLowerCase().trim();
  const clbl = String(c.label || "").toLowerCase().trim();
  return (
    cid === "avoir" ||
    cid === "av" ||
    cid === "qteavoir" ||
    cid === "qte_avoir" ||
    cid.includes("avoir") ||
    clbl === "av" ||
    clbl === "qté avoir" ||
    clbl === "qte avoir" ||
    clbl.includes("avoir") ||
    clbl.includes("إرجاع") ||
    clbl.includes("ارجاع")
  );
};

export const generateDocumentHTML = (
  docType: DocumentType,
  doc: DocumentData,
  originalSettings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: PDFOptions,
): string => {
  const lang = localStorage.getItem("app_language") || "fr";
  const defaultCompanyName = "";
  
  const settings = originalSettings ? {
    ...originalSettings,
    companyName: originalSettings.companyName || defaultCompanyName
  } : {
    id: "default",
    companyName: defaultCompanyName,
    primaryColor: "#10b981",
    showAmountInWords: true,
    priceDisplayMode: "HT",
    address: "",
    phone: "",
    email: "",
    website: "",
    ice: "",
    rc: "",
    fiscalId: "",
    patente: "",
    cnss: "",
    capital: "",
  } as CompanySettings;

  // Safe recipient resolution with fallback to document client / counter client
  const safeRecipient: Client | Supplier = recipient || {
    id: (doc as any)?.clientId || (doc as any)?.supplierId || 'client-comptoir',
    name: (doc as any)?.clientName || (doc as any)?.supplierName || (lang === 'ar' ? 'زبون كونتوار' : 'Client Comptoir'),
    clientCode: (doc as any)?.clientCode || 'POS-001',
    address: (doc as any)?.clientAddress || 'Vente directe au comptoir',
    phone: (doc as any)?.clientPhone || '',
    email: (doc as any)?.clientEmail || '',
    type: 'Particulier',
    ice: (doc as any)?.clientIce || ''
  } as Client;

  recipient = safeRecipient;
  const dict = (translations as any)[lang] || translations["fr"];
  const showPrices = options?.showPrices !== false;
  const showAmountInWords = settings.showAmountInWords !== false;
  const isModeTTC = settings.priceDisplayMode === "TTC";

  // Dynamic font sizing scale for all documents (Invoices, Quotes, Delivery Notes, POs, etc.)
  const fontScale = (() => {
    const optVal = options?.fontSize ?? settings.documentFontSize;
    if (typeof optVal === "number" && optVal > 0) {
      return Math.max(0.7, Math.min(1.5, optVal / 100));
    }
    if (optVal === "compact" || optVal === "small") return 0.85;
    if (optVal === "large") return 1.15;
    if (optVal === "xlarge") return 1.3;
    return 1.0;
  })();

  const fs = (basePx: number): string => `${Math.round(basePx * fontScale * 10) / 10}px`;

  const lineItems = Array.isArray(doc.lineItems) ? doc.lineItems : [];
  const calculationMode = lineItems[0]?.calculationMode || "piece";
  const legacyShowDimensions =
    (doc as any).showDimensions || lineItems[0]?.showDimensions;

  const isM2 =
    calculationMode === "m2" ||
    (legacyShowDimensions && calculationMode === "piece");
  const isML = calculationMode === "ml";
  const isKg = calculationMode === "kg";
  const isDays =
    doc.lineItems.some((item) => item.calculationMode === "days") ||
    doc.lineItems[0]?.calculationMode === "days";

  const getLineMultiplier = (item: any) => {
    const mode = item.calculationMode || doc.lineItems[0]?.calculationMode;

    const getDaysExtraction = (i: any) => {
      const raw = i.days || i.jours || i.jour || i.itemDays || i.nb_jours;
      const parsed = Number(raw);
      return parsed > 0 ? parsed : 1;
    };

    if (mode === "m2")
      return (Number(item.length) || 1) * (Number(item.height) || 1);
    if (mode === "ml") return Number(item.length) || 1;
    if (mode === "kg") return Number(item.weight) || 1;
    if (mode === "days") return getDaysExtraction(item);

    // Fallback for legacy items without calculationMode
    if (isM2) return (Number(item.length) || 1) * (Number(item.height) || 1);
    if (isML) return Number(item.length) || 1;
    if (isKg) return Number(item.weight) || 1;
    if (isDays) return getDaysExtraction(item);

    return 1;
  };

  let totalAmount = 0;
  let subTotal = 0;
  let vatAmount = 0;
  let discountAmount = 0;

  if (isModeTTC) {
    const totalTTCUnrounded = doc.lineItems.reduce((acc, item) => {
      const lineMultiplier = getLineMultiplier(item);
      const unitTTC = Math.round(item.unitPrice * (1 + (item.vat || 0) / 100) * 100) / 100;
      return acc + (unitTTC * item.quantity * lineMultiplier);
    }, 0);
    let currentTotalTTC = Math.round(totalTTCUnrounded * 100) / 100;

    if (doc.discountType && doc.discountValue && doc.discountValue > 0) {
      if (doc.discountType === "percentage") {
        discountAmount = currentTotalTTC * (doc.discountValue / 100);
      } else {
        discountAmount = doc.discountValue;
      }
    }
    totalAmount = Math.round((currentTotalTTC - discountAmount) * 100) / 100;

    const subTotalUnrounded = doc.lineItems.reduce((acc, item) => {
      const lineMultiplier = getLineMultiplier(item);
      const unitTTC = Math.round(item.unitPrice * (1 + (item.vat || 0) / 100) * 100) / 100;
      const lineTTC = unitTTC * item.quantity * lineMultiplier;
      return acc + (lineTTC / (1 + (item.vat || 0) / 100));
    }, 0);
    const subTotalAfterDiscount = subTotalUnrounded - (doc.discountType === "percentage" ? subTotalUnrounded * ((doc.discountValue || 0) / 100) : (doc.discountValue || 0));
    subTotal = Math.round(subTotalAfterDiscount * 100) / 100;
    vatAmount = Math.round((totalAmount - subTotal) * 100) / 100;
  } else {
    const subTotalUnrounded = doc.lineItems.reduce(
      (acc, item) =>
        acc + item.unitPrice * item.quantity * getLineMultiplier(item),
      0,
    );
    if (doc.discountType && doc.discountValue && doc.discountValue > 0) {
      if (doc.discountType === "percentage") {
        discountAmount = subTotalUnrounded * (doc.discountValue / 100);
      } else {
        discountAmount = doc.discountValue;
      }
    }

    const subTotalAfterDiscountUnrounded = subTotalUnrounded - discountAmount;

    const vatAmountUnrounded = doc.lineItems.reduce((acc, item) => {
      const itemTotalHT =
        item.unitPrice * item.quantity * getLineMultiplier(item);
      const itemDiscount =
        subTotalUnrounded > 0 ? (itemTotalHT / subTotalUnrounded) * discountAmount : 0;
      const itemBaseForVat = itemTotalHT - itemDiscount;
      return acc + itemBaseForVat * (item.vat / 100);
    }, 0);

    totalAmount = Math.round((subTotalAfterDiscountUnrounded + vatAmountUnrounded) * 100) / 100;
    subTotal = Math.round(subTotalAfterDiscountUnrounded * 100) / 100;
    vatAmount = Math.round((totalAmount - subTotal) * 100) / 100;
  }

  // Extract custom labels with defaults from translations
  const labels = settings.documentLabels || {};

  // Core Labels for Totals using the specific pdf prefixes
  let txtTotalHt = labels.totalHt || dict.pdfTotalHT || "Total HT";
  let txtTotalTax = labels.totalTax || dict.pdfTotalTax || "Total TVA";
  let txtTotalNet = labels.totalNet || dict.pdfTotalNet || "Net à Payer";

  let txtAmountInWords =
    labels.amountInWordsPrefix ||
    dict.pdfAmountPrefix ||
    "Arrêté le présent document à la somme de :";
  if (docType === "Facture") {
    txtAmountInWords = txtAmountInWords.replace(
      "le présent document",
      "le présent bon",
    ).replace(
      "la présente facture",
      "le présent bon",
    );
  } else {
    txtAmountInWords = txtAmountInWords.replace(
      "document",
      docType.toLowerCase(),
    );
  }
  let txtSigSender =
    labels.signatureSender || dict.pdfSigSender || "Signature Expéditeur";
  let txtSigRecipient =
    labels.signatureRecipient || dict.pdfSigRecipient || "Signature & Cachet";

  // Strict ICE -> NIF mapping for Spanish
  const taxIdLabel =
    dict.ice || (lang === "es" ? "NIF" : lang === "en" ? "Tax ID" : "ICE");

  let primaryColor = settings.primaryColor || "#10b981";
  if (primaryColor.includes("oklch")) primaryColor = "#10b981";
  let headerTextColor = settings.headerTextColor || "#ffffff";
  let tableHeaderBgColor = settings.tableHeaderBgColor || primaryColor;
  const showTableBorders = settings.showTableBorders !== false;
  const clientPosition = settings.clientPosition || "right";

  const dateStr = new Date(doc.date).toLocaleDateString(
    lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
  );

  let amountInLetters = "";
  if (lang === "fr") {
    amountInLetters = numberToWordsFr(totalAmount, settings);
  } else if (lang === "en") {
    amountInLetters = numberToWordsEn(totalAmount, settings);
  } else if (lang === "es") {
    amountInLetters = numberToWordsEs(totalAmount, settings);
  } else {
    amountInLetters = `${totalAmount.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} ${settings?.defaultCurrencyCode || 'MAD'}`;
  }

  const displayId = doc.documentId || doc.id;
  const isDeliveryNote = docType === "Bon de Livraison";

  // Document Titles translation
  let titleDisplay = docType === "Facture" ? "BON" : docType.toUpperCase();
  if (lang === "es") {
    if (docType === "Facture") titleDisplay = "BON";
    else if (docType === "Devis") titleDisplay = "PRESUPUESTO";
    else if (docType === "Bon de Livraison") titleDisplay = "ALBARÁN";
    else if (docType === "Bon de Commande") titleDisplay = "PEDIDO";
    else if (docType === "Avoir") titleDisplay = "NOTA DE CRÉDITO";
  } else if (lang === "en") {
    if (docType === "Facture") titleDisplay = "BON";
    else if (docType === "Devis") titleDisplay = "QUOTE";
    else if (docType === "Bon de Livraison") titleDisplay = "DELIVERY NOTE";
    else if (docType === "Bon de Commande") titleDisplay = "PURCHASE ORDER";
    else if (docType === "Avoir") titleDisplay = "CREDIT NOTE";
  } else if (docType === "Avoir") {
    titleDisplay = "FACTURE D’AVOIR";
  }

  let activeColumns: DocumentColumn[] = [];
  if (settings.documentColumns && settings.documentColumns.length > 0) {
    // Robust merge: ensure all default columns are present (important for newly added columns like 'unit')
    activeColumns = DEFAULT_COLUMNS.map((defCol) => {
      const savedCol = settings.documentColumns?.find((c) => c.id === defCol.id);
      if (savedCol) {
        return { ...defCol, ...savedCol };
      }
      return defCol;
    })
      .filter(
        (c) =>
          c.visible ||
          (c.id === "reference" &&
            doc.lineItems.some((item) => !!item.productCode)),
      )
      .sort((a, b) => a.order - b.order);
  } else {
    activeColumns = DEFAULT_COLUMNS.filter(
      (c) =>
        c.visible ||
        (c.id === "reference" &&
          doc.lineItems.some((item) => !!item.productCode)),
    );
  }

  // CRITICAL USER REQUIREMENT:
  // "la colonne dyal avoir wakha tkon active makhashash tban f les facture devis bl bon de commande tban ghir mnin nsawb avoirs"
  // The 'avoir' column, even if active/visible in settings, MUST NOT appear on Factures, Devis, BL, or Bon de Commande!
  // It must ONLY appear when creating or viewing Avoirs (Facture d'Avoir)!
  if (docType !== "Avoir") {
    activeColumns = activeColumns.filter((c) => !isAvoirCol(c));
  } else {
    // When docType === "Avoir":
    // Check if the avoir column should be shown. If items have invoiceQuantity,
    // ensure both quantity (Qté Facturée) and avoir (Qté Avoir / Retour) are present in the table!
    const hasInvoiceQty = doc.lineItems.some((item) => item.invoiceQuantity !== undefined);
    const hasAvoirCol = activeColumns.some((c) => isAvoirCol(c));
    if (hasInvoiceQty && !hasAvoirCol) {
      const qtyIdx = activeColumns.findIndex((c) => c.id === "quantity");
      const insertAt = qtyIdx !== -1 ? qtyIdx + 1 : activeColumns.length;
      activeColumns.splice(insertAt, 0, {
        id: "avoir",
        label: lang === "ar" ? "كمية الإرجاع" : "AV",
        visible: true,
        order: 2.05,
      });
    }
  }

  if (isDeliveryNote && !showPrices) {
    activeColumns = activeColumns.filter(
      (c) =>
        c.id === "name" ||
        c.id === "quantity" ||
        c.id === "reference" ||
        c.id === "unit",
    );
  }

  if (isM2) {
    const qtyIndex = activeColumns.findIndex((c) => c.id === "quantity");
    if (qtyIndex !== -1) {
      activeColumns.splice(
        qtyIndex + 1,
        0,
        {
          id: "length" as any,
          label: lang === "es" ? "Ancho" : lang === "en" ? "Width" : "Larg.",
          visible: true,
          order: 2.1,
        },
        {
          id: "height" as any,
          label: lang === "es" ? "Alto" : lang === "en" ? "Height" : "Haut.",
          visible: true,
          order: 2.2,
        },
        { id: "m2" as any, label: "M²", visible: true, order: 2.3 },
      );
    }
  } else if (isML) {
    const qtyIndex = activeColumns.findIndex((c) => c.id === "quantity");
    if (qtyIndex !== -1) {
      activeColumns.splice(
        qtyIndex + 1,
        0,
        {
          id: "length" as any,
          label: lang === "es" ? "Largo" : lang === "en" ? "Length" : "Long.",
          visible: true,
          order: 2.1,
        },
        { id: "ml" as any, label: "ML", visible: true, order: 2.2 },
      );
    }
  } else if (isKg) {
    const qtyIndex = activeColumns.findIndex((c) => c.id === "quantity");
    if (qtyIndex !== -1) {
      activeColumns.splice(
        qtyIndex + 1,
        0,
        {
          id: "weight",
          label:
            lang === "es"
              ? "Peso (kg)"
              : lang === "en"
                ? "Weight (kg)"
                : "Poids (kg)",
          visible: true,
          order: 2.1,
        },
      );
    }
  } else if (isDays) {
    const qtyIndex = activeColumns.findIndex((c) => c.id === "quantity");
    if (qtyIndex !== -1) {
      activeColumns.splice(qtyIndex + 1, 0, {
        id: "days",
        label:
          lang === "es"
            ? "Días"
            : lang === "en"
              ? "Days"
              : dict.uDay || "Jours",
        visible: true,
        order: 2.1,
      });
    }
  }

  // Override labels for Language context
  activeColumns = activeColumns
    .map((col) => {
      let label = col.label;
      if (isDeliveryNote && !showPrices) {
        if (col.id === "unitPrice" || col.id === "vat" || col.id === "total")
          return null;
      }
      if (col.id === "unit") {
        label = dict.unit || "Unité";
      } else if (lang === "es") {
        if (col.id === "unitPrice")
          label = isModeTTC ? "P.U. Total" : "P.U. Base";
        if (col.id === "total")
          label = isModeTTC ? "Total con IVA" : "Base imponible";
        if (col.id === "vat") label = "IVA";
        if (col.id === "name") label = "Descripción";
        if (col.id === "quantity") label = "Cant.";
      } else if (lang === "en") {
        if (col.id === "unitPrice")
          label = isModeTTC ? "Unit Price (Incl.)" : "Unit Price";
        if (col.id === "total") label = isModeTTC ? "Total (Incl.)" : "Total";
        if (col.id === "vat") label = "VAT";
        if (col.id === "name") label = "Description";
        if (col.id === "quantity") label = "Qty";
      } else if (lang === "ar") {
        if (col.id === "unitPrice")
          label = isModeTTC ? (dict.puTTCLabel || "سعر الوحدة (شامل الضريبة)") : (dict.unitPrice || "سعر الوحدة");
        if (col.id === "total")
          label = isModeTTC ? (dict.totalTTCLabel || "المجموع الإجمالي") : (dict.totalHTLabel || "المجموع (بدون ضريبة)");
        if (col.id === "vat") label = dict.vat || "الضريبة";
        if (col.id === "name") label = dict.description || "الوصف";
        if (col.id === "quantity") label = dict.quantity || "الكمية";
      } else if (isModeTTC) {
        if (col.id === "unitPrice") {
          if (/H\.?T\.?/i.test(label)) {
            label = label.replace(/H\.?T\.?/gi, "TTC");
          } else if (!/TTC/i.test(label)) {
            if (/prix/i.test(label)) {
              label = label === label.toUpperCase() ? "PRIX TTC" : "Prix TTC";
            } else {
              label = "P.U. TTC";
            }
          }
        }
        if (col.id === "total") {
          if (/H\.?T\.?/i.test(label)) {
            label = label.replace(/H\.?T\.?/gi, "TTC");
          } else if (!/TTC/i.test(label)) {
            label = label === label.toUpperCase() ? "TOTAL TTC" : "Total TTC";
          }
        }
      } else {
        if (col.id === "unitPrice") {
          if (/T\.?T\.?C\.?/i.test(label)) {
            label = label.replace(/T\.?T\.?C\.?/gi, "HT");
          }
        }
        if (col.id === "total") {
          if (/T\.?T\.?C\.?/i.test(label)) {
            label = label.replace(/T\.?T\.?C\.?/gi, "HT");
          }
        }
      }
      return { ...col, label };
    })
    .filter(Boolean) as DocumentColumn[];

  let extraDateLabel = "";
  let extraDateValue = "";
  let secondDateLabel = "";
  let secondDateValue = "";

  if (
    docType === "Bon de Commande" &&
    (doc.expectedDate || doc.lineItems[0]?.expectedDate)
  ) {
    const dateVal = doc.expectedDate || doc.lineItems[0]?.expectedDate;
    extraDateLabel =
      lang === "es"
        ? "Entrega prevista"
        : lang === "en"
          ? "Expected delivery"
          : "Livraison prévue";
    extraDateValue = new Date(dateVal).toLocaleDateString(
      lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
    );
  } else if (
    docType === "Devis" &&
    (doc.expiryDate || doc.lineItems[0]?.expiryDate)
  ) {
    const dateVal = doc.expiryDate || doc.lineItems[0]?.expiryDate;
    extraDateLabel =
      lang === "es"
        ? "Válido hasta"
        : lang === "en"
          ? "Valid until"
          : "Valable jusqu'au";
    extraDateValue = new Date(dateVal).toLocaleDateString(
      lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
    );
  } else if (
    docType === "Facture" &&
    (doc.dueDate || doc.lineItems[0]?.dueDate)
  ) {
    const dateVal = doc.dueDate || doc.lineItems[0]?.dueDate;
    extraDateLabel =
      lang === "es" ? "Vencimiento" : lang === "en" ? "Due date" : "Échéance";
    extraDateValue = new Date(dateVal).toLocaleDateString(
      lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
    );
  }

  // Handle due date for Bon de Commande
  if (
    docType === "Bon de Commande" &&
    (doc.dueDate || doc.lineItems[0]?.dueDate)
  ) {
    const dateVal = doc.dueDate || doc.lineItems[0]?.dueDate;
    secondDateLabel =
      lang === "es" ? "Vencimiento" : lang === "en" ? "Due date" : "Échéance";
    secondDateValue = new Date(dateVal).toLocaleDateString(
      lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
    );
  }

  const docSubject = doc.subject || doc.lineItems[0]?.subject || "";
  const docPaymentMethod = doc.paymentMethod || doc.lineItems[0]?.paymentMethod || "";
  const docCheckNumber = doc.checkNumber || doc.lineItems[0]?.checkNumber || "";
  const docBankName = doc.bankName || doc.lineItems[0]?.bankName || "";

  const logoHtml = settings.logo
    ? `<img src="${settings.logo}" style="max-height: 120px; max-width: ${settings.logoWidth || 200}px; object-fit: contain;" />`
    : `<h1 style="font-size: ${fs(24)}; font-weight: bold; color: ${primaryColor}; margin: 0;">${settings.companyName}</h1>`;

  const recipientName = recipient.name;
  const recipientCompany = recipient.company
    ? `<div style="font-weight: bold;">${recipient.company}</div>`
    : "";
  const recipientEmail = recipient.email ? `<div>${recipient.email}</div>` : "";
  const recipientPhone = recipient.phone ? `<div>${recipient.phone}</div>` : "";
  const recipientAddress = recipient.address
    ? `<div style="margin-bottom:2px;">${recipient.address.replace(/\n/g, "<br/>")}</div>`
    : "";
  const recipientIce = recipient.ice
    ? `<div>${taxIdLabel}: ${recipient.ice}</div>`
    : "";

  const companyAddress = settings.address
    ? settings.address.replace(/\n/g, "<br/>")
    : "";
  const companyContact = [settings.phone, settings.email, settings.website]
    .filter(Boolean)
    .join(" | ");

  const capitalDisplay = settings.capital ? `Capital: ${settings.capital}` : "";
  const legalIds = [
    settings.ice ? `${taxIdLabel}: ${settings.ice}` : "",
    settings.rc ? `RC: ${settings.rc}` : "",
    settings.fiscalId ? `IF: ${settings.fiscalId}` : "",
    settings.patente ? `TP: ${settings.patente}` : "",
    settings.cnss ? `CNSS: ${settings.cnss}` : "",
    capitalDisplay,
  ]
    .filter(Boolean)
    .join(" &nbsp;|&nbsp; ");

  // Helper to identify the days/jours column robustly
  const isDaysCol = (c: any) => {
    const cid = String(c.id || "").toLowerCase();
    const clbl = String(c.label || "").toLowerCase();
    // Matching: any ID or Label containing 'jour', 'day', 'día', 'dias', 'يوم', or 'أيام'
    return (
      cid.includes("day") ||
      cid.includes("jour") ||
      clbl.includes("jour") ||
      clbl.includes("day") ||
      clbl.includes("día") ||
      clbl.includes("dias") ||
      clbl.includes("يوم") ||
      clbl.includes("أيام")
    );
  };

  const headerRowHtml = activeColumns
    .map((col, idx) => {
      let align = "left";
      let width = "";
      if (col.id === "reference") {
        align = "left";
        width = "width: 10%;";
      } else if (col.id === "name") {
        align = "left";
        width = "width: auto; min-width: 45%;";
      } else if (col.id === "quantity") {
        align = "center";
        width = "width: 7%;";
      } else if (isDaysCol(col)) {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "length") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "height") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "m2") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "ml") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "weight") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "totalWeight") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "avoir" || isAvoirCol(col)) {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "vat") {
        align = "center";
        width = "width: 6%;";
      } else if (col.id === "unit") {
        align = "center";
        width = "width: 8%;";
      } else if (col.id === "unitPrice") {
        align = "right";
        width = "width: 12%;";
      } else if (col.id === "total") {
        align = "right";
        width = "width: 12%;";
      }

      const isFirst = idx === 0;
      const isLast = idx === activeColumns.length - 1;
      const borderStyle = showTableBorders && !isLast ? "border-right: 1px solid rgba(255, 255, 255, 0.3);" : "";

      let displayLabel = col.label;
      if (docType === "Avoir") {
        if (col.id === "quantity" && doc.lineItems.some((i) => i.invoiceQuantity !== undefined)) {
          displayLabel = lang === "ar" ? "الكمية المفوترة" : "Qté Facturée";
        } else if (col.id === "avoir" || isAvoirCol(col)) {
          displayLabel = col.label || (lang === "ar" ? "كمية الإرجاع" : "AV");
        }
      }

      return `<th style="padding: ${options?.isPDFDownload ? "6px 12px 14px 12px" : "10px 12px"}; text-align: ${align}; vertical-align: middle; line-height: 1.2; font-size: ${fs(11)}; text-transform: uppercase; white-space: nowrap; letter-spacing: 0.05em; ${borderStyle} ${width}">${displayLabel}</th>`;
    })
    .join("");

  const rowsHtml = doc.lineItems
    .map((item, index) => {
      const cellsHtml = activeColumns
        .map((col, cIdx) => {
          let content = "";
          let align = "left";
          let style = "";

          const isFirst = cIdx === 0;
          const isLast = cIdx === activeColumns.length - 1;
          const borderRight = showTableBorders && !isLast ? "border-right: 1px solid #cbd5e1;" : "";
          const cellBorder = `border-bottom: 1px solid #cbd5e1; ${borderRight}`;

          const unitPriceTTC = roundPrice(item.unitPrice * (1 + item.vat / 100));
          const totalTTC =
            roundPrice(item.quantity *
            getLineMultiplier(item) *
            unitPriceTTC);

          // SYNC DISPLAY VALUE WITH CALCULATION MULTIPLIER
          const multiplier = getLineMultiplier(item);
          const isItemInDaysMode =
            item.calculationMode === "days" ||
            doc.lineItems[0]?.calculationMode === "days";

          // Aggressive extraction for display fallback
          const extraction =
            item.days ||
            (item as any).jours ||
            (item as any).jour ||
            (item as any).itemDays ||
            (item as any).nb_jours ||
            0;
          const fallbackDaysValue =
            Number(extraction) > 0 ? Number(extraction) : 1;

          // If the calculation mode is days, we MUST use the multiplier that produced the correct total
          const finalDaysDisplayValue = isItemInDaysMode
            ? multiplier
            : fallbackDaysValue;

          if (isDaysCol(col)) {
            content = String(finalDaysDisplayValue);
            align = "center";
            style = `font-size: ${fs(10.5)}; font-weight: 700; color: #111827;`;
          } else if (isAvoirCol(col)) {
            const returnQty = (item as any).avoirQuantity ?? (item as any).returnQuantity ?? (item as any).returnedQuantity ?? item.quantity;
            content = returnQty != null && returnQty !== "" ? String(returnQty) : "-";
            align = "center";
            style = `font-size: ${fs(10.5)}; font-weight: 700; color: #16a34a;`;
          } else {
            switch (col.id as any) {
              case "reference":
                content = item.productCode || "-";
                align = "left";
                style = `font-size: ${fs(10.5)}; color: #4b5563;`;
                break;
              case "name":
                content = `
                            <div style="font-weight: 500; color: #111827; font-size: ${fs(10.5)}; line-height: 1.2; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap;">${item.name}</div>
                            ${item.description ? `<div style="font-size: ${fs(9)}; color: #6b7280; margin-top: 2px; line-height: 1.1; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap;">${item.description}</div>` : ""}
                        `;
                break;
              case "quantity":
                if (docType === "Avoir" && item.invoiceQuantity !== undefined) {
                  content = item.invoiceQuantity.toString();
                } else {
                  content = item.quantity.toString();
                }
                align = "center";
                style = `font-weight: 700; font-size: ${fs(10.5)};`;
                break;
              case "unit":
                content = item.unit || "-";
                align = "center";
                style = `font-size: ${fs(9.5)}; color: #4b5563;`;
                break;
              case "length":
                content = (item.length || 1).toString();
                align = "center";
                style = `font-size: ${fs(10.5)};`;
                break;
              case "height":
                content = (item.height || 1).toString();
                align = "center";
                style = `font-size: ${fs(10.5)};`;
                break;
              case "m2":
                content = (
                  item.quantity *
                  (Number(item.length) || 1) *
                  (Number(item.height) || 1)
                ).toLocaleString("fr-MA", { maximumFractionDigits: 2 });
                align = "center";
                style = `font-size: ${fs(10.5)}; font-weight: 500;`;
                break;
              case "ml":
                content = (
                  item.quantity * (Number(item.length) || 1)
                ).toLocaleString("fr-MA", { maximumFractionDigits: 2 });
                align = "center";
                style = `font-size: ${fs(10.5)}; font-weight: 500;`;
                break;
              case "weight":
                content = (item.weight || 1).toString();
                align = "center";
                style = `font-size: ${fs(10.5)};`;
                break;
              case "totalWeight":
                content = (
                  item.quantity * (Number(item.weight) || 1)
                ).toLocaleString("fr-MA", { maximumFractionDigits: 2 });
                align = "center";
                style = `font-size: ${fs(10.5)}; font-weight: 500;`;
                break;
              case "unitPrice":
                content = (
                  isModeTTC ? unitPriceTTC : item.unitPrice
                ).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
                align = "right";
                style = `font-size: ${fs(10.5)};`;
                break;
              case "vat":
                content = `${item.vat}%`;
                align = "center";
                style = `font-size: ${fs(10.5)};`;
                break;
              case "total":
                const subTotalItem =
                  item.quantity * multiplier * item.unitPrice;
                content = (isModeTTC ? totalTTC : subTotalItem).toLocaleString(
                  "fr-MA",
                  { minimumFractionDigits: 2 },
                );
                align = "right";
                style = `font-weight: 700; font-size: ${fs(10.5)};`;
                break;
              case "avoir":
              case "av":
              case "AV":
              case "qteAvoir":
              case "qte_avoir":
                const returnQty = (item as any).avoirQuantity ?? (item as any).returnQuantity ?? (item as any).returnedQuantity ?? item.quantity;
                content = returnQty != null && returnQty !== "" ? String(returnQty) : "-";
                align = "center";
                style = `font-size: ${fs(10.5)}; font-weight: 700; color: #16a34a;`;
                break;
              case "days":
                content = String(finalDaysDisplayValue);
                align = "center";
                style = `font-size: ${fs(10.5)}; font-weight: 700;`;
                break;
              default:
                content = "-";
                break;
            }
          }

          return `<td style="padding: ${options?.isPDFDownload ? "6px 12px 14px 12px" : "10px 12px"}; ${cellBorder} text-align: ${align}; vertical-align: middle; ${style}">${content}</td>`;
        })
        .join("");

      return `<tr class="item-row" style="background-color: ${index % 2 === 0 ? "#fff" : "#f9fafb"};">${cellsHtml}</tr>`;
    })
    .join("");

  let paymentInfoHtml = "";
  if ((docType === "Facture" || docType === "Bon de Livraison" || docType === "Bon de Commande") && showPrices) {
    const paid = doc.amountPaid || doc.paymentAmount || 0;
    const remaining = totalAmount - paid;
    if (paid > 0) {
      paymentInfoHtml = `
                <div style="margin-top: 10px; font-size: ${fs(12)}; color: #059669;">
                    ${lang === "es" ? "Ya pagado" : lang === "en" ? "Already paid" : "Déjà réglé"} : <b>${paid.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</b>
                    ${remaining > 0.1 ? `<br/><span style="color: #d97706;">${lang === "es" ? "Importe pendiente" : lang === "en" ? "Balance due" : "Reste à payer"} : <b>${remaining.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</b></span>` : `<br/><span style="color: #059669; font-weight: bold;">${lang === "es" ? "Liquidado" : lang === "en" ? "Settled" : "Soldé"}</span>`}
                </div>
            `;
    }
  }

  const isInfoOnLeft = settings.documentInfoPosition === "left";

  const docInfoHtml = `
        <div style="font-size: ${fs(26)}; font-weight: bold; text-transform: uppercase; color: ${primaryColor}; margin-bottom: 10px;">${titleDisplay}</div>
        <div style="font-size: ${fs(16)}; font-weight: 600; color: #111827;">N° ${displayId}</div>
        <div style="margin-top: 10px; font-size: ${fs(12)};">
            <div>${dict.date || "Date"} : <b>${dateStr}</b></div>
            ${extraDateLabel ? `<div>${extraDateLabel} : <b>${extraDateValue}</b></div>` : ""}
            ${secondDateLabel ? `<div>${secondDateLabel} : <b>${secondDateValue}</b></div>` : ""}
            ${doc.purchaseOrderNumber ? `<div>${dict.purchaseOrderNumber || "N° BC"} : <b>${doc.purchaseOrderNumber}</b></div>` : ""}
            ${doc.invoiceId ? `<div>${lang === "es" ? "Ref. Factura" : lang === "en" ? "Invoice Ref" : "Réf. Facture"} : <b>${doc.invoiceId}</b></div>` : ""}
        </div>
    `;

  const topHeaderHtml = isInfoOnLeft
    ? `
        <div style="margin-bottom: 20px;">
            <div style="width: 100%; margin-bottom: 20px;">
                ${logoHtml}
                <div style="margin-top: 15px; font-size: ${fs(12)}; line-height: 1.5;">
                    <div style="font-weight: 600; font-size: ${fs(14)}; margin-bottom: 4px;">${settings.companyName}</div>
                    ${companyAddress}<br/>
                    <div style="margin-top: 5px; color: #6b7280;">${companyContact}</div>
                </div>
            </div>
            <div style="text-align: left; margin-top: 20px;">
                ${docInfoHtml}
            </div>
        </div>
    `
    : `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 50%;">
                ${logoHtml}
                <div style="margin-top: 15px; font-size: ${fs(12)}; line-height: 1.5;">
                    <div style="font-weight: 600; font-size: ${fs(14)}; margin-bottom: 4px;">${settings.companyName}</div>
                    ${companyAddress}<br/>
                    <div style="margin-top: 5px; color: #6b7280;">${companyContact}</div>
                </div>
            </div>
            <div style="width: 45%; text-align: right;">
                ${docInfoHtml}
            </div>
        </div>
    `;

  const clientInfoHtml = `
        <div style="display: flex; justify-content: ${clientPosition === 'left' ? 'flex-start' : 'flex-end'}; margin-bottom: 20px;">
            <div style="width: 45%; background-color: #f9fafb; padding: ${options?.isPDFDownload ? "8px 16px 12px 16px" : "12px 16px"}; border-radius: 6px; border: 1px solid #e5e7eb; line-height: 1.4; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start;">
                <div style="font-size: ${fs(10)}; text-transform: uppercase; font-weight: 700; color: #9ca3af; margin-bottom: 6px; line-height: 1;">${dict.pdfAddressedTo || "Adressé à"}</div>
                <div style="font-size: ${fs(14)}; color: #111827; font-weight: 600;">
                    ${recipientCompany}
                    ${recipientName ? `<div style="${recipientCompany ? "font-weight: normal; margin-top: 2px;" : ""} line-height: 1.2;">${recipientName}</div>` : ""}
                </div>
                ${
                  recipientAddress ||
                  recipientIce ||
                  recipientEmail ||
                  recipientPhone
                    ? `
                <div style="margin-top: 6px; font-size: ${fs(12)}; color: #4b5563;">
                    ${recipientAddress}
                    ${recipientIce}
                    ${recipientEmail}
                    ${recipientPhone}
                </div>
                `
                    : ""
                }
            </div>
        </div>
    `;

  const itemsTableHtml = `
        <table style="width: 100%; border-collapse: collapse; border-spacing: 0; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: ${tableHeaderBgColor}; color: ${headerTextColor}; -webkit-print-color-adjust: exact;">
                    ${headerRowHtml}
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;

  // Financials Block
  const financialsHtml = `
        <div class="totals-section" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; font-size: ${fs(12)};">
            <div style="width: 55%; padding-top: 10px;">
                ${
                  showAmountInWords
                    ? `
                    <div style="background-color: #f3f4f6; padding: ${options?.isPDFDownload ? "3px 12px 13px 12px" : "10px 12px"}; border-radius: 4px; border-left: 3px solid ${primaryColor}; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start;">
                        <div style="font-size: ${fs(11)}; color: #6b7280; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; line-height: 1.2;">${txtAmountInWords}</div>
                        <div style="font-size: ${fs(13)}; color: #111827; font-weight: 600; font-style: italic; line-height: 1.2;">
                            ${amountInLetters}
                        </div>
                    </div>
                `
                    : ""
                }
                ${
                  settings.defaultPaymentTerms
                    ? `
                    <div style="margin-top: 10px; font-size: ${fs(11)}; color: #4b5563;">
                        ${settings.defaultPaymentTerms}
                    </div>
                `
                    : ""
                }
                ${
                  doc.notes
                    ? `
                    <div style="margin-top: 15px; font-size: ${fs(11)}; color: #6b7280; white-space: pre-wrap;">
                        <span style="font-weight: 600;">${dict.notes || "Notes"}:</span> ${doc.notes}
                    </div>
                `
                    : ""
                }
            </div>
            <div style="width: 40%;">
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-size: ${fs(12)};">
                    <span>${txtTotalHt}</span>
                    <span style="font-weight: 600;">${subTotal.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                </div>
                ${
                  discountAmount > 0
                    ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-size: ${fs(12)};">
                    <span>${dict.globalDiscount || "Remise exceptionnelle"} ${doc.discountType === "percentage" ? `(-${doc.discountValue}%)` : ""}</span>
                    <span style="font-weight: 600; color: #dc2626;">- ${discountAmount.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                </div>
                `
                    : ""
                }
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-size: ${fs(12)};">
                    <span>${txtTotalTax}</span>
                    <span>${vatAmount.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0 4px 0; font-size: ${fs(16)}; color: #000000; font-weight: bold; margin-top: 4px;">
                    <span>${txtTotalNet}</span>
                    <span>${totalAmount.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                </div>
                ${paymentInfoHtml}
            </div>
        </div>
    `;

  const notesOnlyHtml = doc.notes
    ? `
        <div style="margin-bottom: 20px; font-size: ${fs(11)}; color: #6b7280;">
            <span style="font-weight: 600;">${dict.notes || "Notes"}:</span> ${doc.notes}
        </div>
    `
    : "";

  const signaturesHtml = `
        <div class="totals-section" style="display: flex; justify-content: flex-end; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: ${fs(12)};">
            <div style="width: 45%; text-align: center;">
                <div style="font-weight: bold; margin-bottom: 5px; text-decoration: underline;">${txtSigRecipient}</div>
                ${settings.showSignatureRecipient && settings.stamp ? `<img src="${settings.stamp}" style="max-height: 300px; width: ${settings.stampWidth || 220}px; object-fit: contain; margin-top: 2px;" />` : settings.showSignatureRecipient ? '<div style="height: 80px;"></div>' : ""}
            </div>
        </div>
    `;

  let totalsHtml = "";
  if (isDeliveryNote && !showPrices) {
    totalsHtml =
      notesOnlyHtml + (settings?.showSignatureRecipient ? signaturesHtml : "");
  } else if (
    docType === "Facture" ||
    docType === "Devis" ||
    docType === "Avoir" ||
    isDeliveryNote
  ) {
    totalsHtml =
      financialsHtml + (settings?.showSignatureRecipient ? signaturesHtml : "");
  } else {
    totalsHtml = financialsHtml + (settings?.showSignatureRecipient ? signaturesHtml : "");
  }

  const footerHtml = `
        <div style="text-align: center; padding-top: 2px; margin-top: auto;">
            ${settings.footerNotes ? `<div style="font-size: ${fs(11)}; color: #000000; margin-bottom: 4px; white-space: pre-wrap; font-style: normal;">${settings.footerNotes}</div>` : ""}
            <div style="font-size: ${fs(10)}; color: #000000; font-weight: normal; letter-spacing: 0.02em;">
                ${legalIds}
            </div>
        </div>
    `;

  // --- Pagination Logic ---
  const items = [...doc.lineItems];

  const getCellsHtml = (item: any) => {
    return activeColumns
      .map((col, cIdx) => {
        let content = "";
        let align = "left";
        let style = "";

        const isFirst = cIdx === 0;
        const isLast = cIdx === activeColumns.length - 1;
        const borderRight = showTableBorders && !isLast ? "border-right: 1px solid #cbd5e1;" : "";
        const cellBorder = `border-bottom: 1px solid #cbd5e1; ${borderRight}`;

        const unitPriceTTC = roundPrice(item.unitPrice * (1 + item.vat / 100));
        const totalTTC =
          roundPrice(item.quantity *
          getLineMultiplier(item) *
          unitPriceTTC);

        // SYNC DISPLAY VALUE WITH CALCULATION MULTIPLIER
        const multiplier = getLineMultiplier(item);
        const isItemInDaysMode =
          item.calculationMode === "days" ||
          doc.lineItems[0]?.calculationMode === "days";
        const extraction =
          item.days ||
          (item as any).jours ||
          (item as any).jour ||
          (item as any).itemDays ||
          (item as any).nb_jours ||
          0;
        const fallbackDaysValue =
          Number(extraction) > 0 ? Number(extraction) : 1;
        const finalDaysDisplayValue = isItemInDaysMode
          ? multiplier
          : fallbackDaysValue;

        if (isDaysCol(col)) {
          content = String(finalDaysDisplayValue);
          align = "center";
          style = `font-size: ${fs(10.5)}; font-weight: 700; color: #111827;`;
        } else if (isAvoirCol(col)) {
          const returnQty = (item as any).avoirQuantity ?? (item as any).returnQuantity ?? (item as any).returnedQuantity ?? item.quantity;
          content = returnQty != null && returnQty !== "" ? String(returnQty) : "-";
          align = "center";
          style = `font-size: ${fs(10.5)}; font-weight: 700; color: #16a34a;`;
        } else {
          switch (col.id as any) {
            case "reference":
              content = item.productCode || "-";
              align = "left";
              style = `font-size: ${fs(10.5)}; color: #4b5563;`;
              break;
            case "name":
              content = `
                        <div style="font-weight: 500; color: #111827; font-size: ${fs(10.5)}; line-height: 1.2; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap;">${item.name}</div>
                        ${item.description ? `<div style="font-size: ${fs(9)}; color: #6b7280; margin-top: 2px; line-height: 1.1; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap;">${item.description}</div>` : ""}
                    `;
              break;
            case "quantity":
              if (docType === "Avoir" && item.invoiceQuantity !== undefined) {
                content = item.invoiceQuantity.toString();
              } else {
                content = item.quantity.toString();
              }
              align = "center";
              style = `font-weight: 700; font-size: ${fs(10.5)};`;
              break;
            case "unit":
              content = item.unit || "-";
              align = "center";
              style = `font-size: ${fs(9.5)}; color: #4b5563;`;
              break;
            case "length" as any:
              content = (item.length || 1).toString();
              align = "center";
              style = `font-size: ${fs(10.5)};`;
              break;
            case "height" as any:
              content = (item.height || 1).toString();
              align = "center";
              style = `font-size: ${fs(10.5)};`;
              break;
            case "m2" as any:
              content = (
                item.quantity *
                (item.length || 1) *
                (item.height || 1)
              ).toLocaleString("fr-MA", { maximumFractionDigits: 2 });
              align = "center";
              style = `font-size: ${fs(10.5)}; font-weight: 500;`;
              break;
            case "ml" as any:
              content = (item.quantity * (item.length || 1)).toLocaleString(
                "fr-MA",
                { maximumFractionDigits: 2 },
              );
              align = "center";
              style = `font-size: ${fs(10.5)}; font-weight: 500;`;
              break;
            case "weight" as any:
              content = (item.weight || 1).toString();
              align = "center";
              style = `font-size: ${fs(10.5)};`;
              break;
            case "totalWeight" as any:
              content = (item.quantity * (item.weight || 1)).toLocaleString(
                "fr-MA",
                { maximumFractionDigits: 2 },
              );
              align = "center";
              style = `font-size: ${fs(10.5)}; font-weight: 500;`;
              break;
            case "unitPrice":
              content = (
                isModeTTC ? unitPriceTTC : item.unitPrice
              ).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
              align = "right";
              style = `font-size: ${fs(10.5)};`;
              break;
            case "vat":
              content = `${item.vat}%`;
              align = "center";
              style = `font-size: ${fs(10.5)};`;
              break;
            case "total":
              content = (
                isModeTTC
                  ? totalTTC
                  : item.quantity * getLineMultiplier(item) * item.unitPrice
              ).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
              align = "right";
              style = `font-weight: 700; font-size: ${fs(10.5)};`;
              break;
            case "avoir":
            case "av":
            case "AV":
            case "qteAvoir":
            case "qte_avoir":
              const returnQty = (item as any).avoirQuantity ?? (item as any).returnQuantity ?? (item as any).returnedQuantity ?? item.quantity;
              content = returnQty != null && returnQty !== "" ? String(returnQty) : "-";
              align = "center";
              style = `font-size: ${fs(10.5)}; font-weight: 700; color: #16a34a;`;
              break;
            case "days":
              content = String(finalDaysDisplayValue);
              align = "center";
              style = `font-size: ${fs(10.5)}; font-weight: 700;`;
              break;
            default:
              content = "-";
              break;
          }
        }

        return `<td style="padding: ${options?.isPDFDownload ? "6px 12px 14px 12px" : "10px 12px"}; ${cellBorder} text-align: ${align}; vertical-align: middle; ${style}">${content}</td>`;
      })
      .join("");
  };

  // 1. EXACT DOM MEASUREMENT PAGINATION
  const allRowsHtml = items
    .map((item) => `<tr>${getCellsHtml(item)}</tr>`)
    .join("");

  const measureBox = document.createElement("div");
  measureBox.style.position = "absolute";
  measureBox.style.left = "-9999px";
  measureBox.style.top = "0";
  measureBox.style.visibility = "hidden";
  measureBox.style.width = "210mm";
  measureBox.style.overflow = "hidden";
  measureBox.innerHTML = `
        <div style="width: 210mm; min-width: 210mm; max-width: 210mm; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: ${fs(13)}; box-sizing: border-box; padding: 15mm 15mm 28mm 15mm; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">
            <div id="measure-header" style="position: relative; z-index: 2;">
                ${topHeaderHtml}
                ${clientInfoHtml}
                <div style="display: flex; gap: 40px; margin-bottom: 15px; flex-wrap: wrap;">
                    ${docSubject ? `<div style="font-weight: 600;">Objet : <span style="font-weight: normal;">${docSubject}</span></div>` : ""}
                    ${docPaymentMethod ? `<div style="font-weight: 600;">Mode de paiement : <span style="font-weight: normal;">${docPaymentMethod} ${docPaymentMethod === 'Chèque' && docCheckNumber ? `(N° ${docCheckNumber}${docBankName ? ` - ${docBankName}` : ''})` : ''}</span></div>` : ""}
                </div>
            </div>
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px;">
                <thead id="measure-thead">
                    <tr>${headerRowHtml}</tr>
                </thead>
                <tbody id="measure-tbody">
                    ${allRowsHtml}
                </tbody>
            </table>
            <div id="measure-totals">
                ${totalsHtml}
            </div>
        </div>
        <div id="measure-a4" style="height: 297mm;"></div>
        <div id="measure-padd" style="height: 43mm;"></div>
    `;

  document.body.appendChild(measureBox);

  const headerHeight =
    document.getElementById("measure-header")?.offsetHeight || 0;
  const theadHeight =
    document.getElementById("measure-thead")?.offsetHeight || 0;
  const totalsHeight =
    document.getElementById("measure-totals")?.offsetHeight || 0;

  const tbody = document.getElementById("measure-tbody");
  const rowHeightsPx = tbody
    ? Array.from(tbody.children).map((el) => (el as HTMLElement).offsetHeight)
    : items.map(() => 40);

    const a4FullHeight =
    document.getElementById("measure-a4")?.offsetHeight || 1120;
  
  // Calculate padding based on 15mm top + 28mm bottom = 43mm total padding
  const paddingHeights = (a4FullHeight * 43) / 297;

  if (document.body.contains(measureBox)) {
    document.body.removeChild(measureBox);
  }

  // True Usable Pixel Height
  // Using a slightly more conservative safety margin for visual breathing room and to prevent extra pages
  // We subtract 20px (~5mm) extra for a small buffer before the footer
  const maxUsableHeight = a4FullHeight - paddingHeights - 8;
  const SAFETY_MARGIN = 4; // allow for small rendering variations

  // 2. Pack items into chunks optimally
  const itemChunks: any[][] = [];
  let tempIndex = 0;

  while (tempIndex < items.length) {
    let currentHeight = headerHeight + theadHeight + 20; // 20px for table margin-bottom
    const chunk: any[] = [];

    while (tempIndex < items.length) {
      const rh = rowHeightsPx[tempIndex] || 35;

      if (
        currentHeight + rh + SAFETY_MARGIN > maxUsableHeight &&
        chunk.length > 0
      ) {
        break;
      }

      chunk.push(items[tempIndex]);
      currentHeight += rh;
      tempIndex++;
    }
    itemChunks.push(chunk);
  }

  // 3. Check if Totals fit on the last page
  const lastChunk = itemChunks[itemChunks.length - 1] || [];
  let lastChunkHeight = headerHeight + theadHeight + 20; // Matches table margin-bottom
  const lastChunkStartIndex = items.length - lastChunk.length;
  for (let i = 0; i < lastChunk.length; i++) {
    lastChunkHeight += rowHeightsPx[lastChunkStartIndex + i];
  }

  if (lastChunkHeight + totalsHeight + SAFETY_MARGIN > maxUsableHeight) {
    // If the last page is nearly full, move the last item to a new page to join the totals
    if (lastChunk.length > 1) {
      const lastItem = itemChunks[itemChunks.length - 1].pop();
      itemChunks.push([lastItem]);
    } else {
      itemChunks.push([]); // Totals get pushed to their own new page
    }
  }

  const totalPages = itemChunks.length;
  const pages: string[] = [];
  const watermarkLogo = settings.backgroundLogo;

  itemChunks.forEach((pageItems, index) => {
    const pageNum = index + 1;
    const isLastPage = pageNum === totalPages;

    const pageRowsHtml = pageItems
      .map((item, idx) => {
        const cellsHtml = getCellsHtml(item);
        return `<tr class="item-row">${cellsHtml}</tr>`;
      })
      .join("");

    const pageHtml = `
            <div class="pdf-page" style="width: 210mm; height: 296.5mm; max-height: 296.5mm; background: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: ${fs(13)}; color: #374151; display: flex; flex-direction: column; box-sizing: border-box; padding: 15mm 15mm 28mm 15mm; position: relative; overflow: hidden; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; ${isLastPage ? "" : "page-break-after: always;"}">
                <style>
                    * { box-sizing: border-box; }
                    .content-grow { flex: 1; z-index: 2; position: relative; }
                    
                    /* Rich Text Formatting Styles */
                    p { margin: 0 0 4px 0; padding: 0; }
                    p:last-child { margin-bottom: 0; }
                    .ql-size-small { font-size: 0.75em; }
                    .ql-size-large { font-size: 1.5em; }
                    .ql-size-huge { font-size: 2.5em; }
                    .ql-align-center { text-align: center; }
                    .ql-align-right { text-align: right; }
                    .ql-align-justify { text-align: justify; }
                    strong, b { font-weight: bold; }
                    em, i { font-style: italic; }
                    u { text-decoration: underline; }
                </style>
                
                ${
                  watermarkLogo && (settings.showLogoWatermark ?? true)
                    ? `
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${settings.backgroundLogoWidth ? `${settings.backgroundLogoWidth}px` : '85%'}; max-width: 90%; z-index: 0; opacity: ${settings.logoWatermarkOpacity ?? 0.07}; pointer-events: none; text-align: center;">
                        <img src="${watermarkLogo}" style="width: 100%; height: auto; max-height: 200mm; object-fit: contain;" />
                    </div>
                `
                    : ""
                }

                <div style="position: relative; z-index: 2;">
                    ${topHeaderHtml}
                    ${clientInfoHtml}
                    <div style="display: flex; gap: 40px; margin-bottom: 15px; flex-wrap: wrap;">
                        ${docSubject ? `<div style="font-weight: 600;">${dict.pdfSubject || "Objet"} : <span style="font-weight: normal;">${docSubject}</span></div>` : ""}
                        ${docPaymentMethod ? `<div style="font-weight: 600;">${dict.paymentMethod || "Mode de paiement"} : <span style="font-weight: normal;">${docPaymentMethod} ${docPaymentMethod === 'Chèque' && docCheckNumber ? `(N° ${docCheckNumber}${docBankName ? ` - ${docBankName}` : ''})` : ''}</span></div>` : ""}
                    </div>
                </div>

                <div class="content-grow" style="display: flex; flex-direction: column; border-left: 0.5px solid #d1d5db; border-right: 0.5px solid #d1d5db; border-bottom: 0.5px solid #d1d5db;">
                    ${
                      pageItems.length > 0
                        ? `
                      <table style="width: 100%; border-collapse: collapse; border-spacing: 0;">
                          <thead>
                              <tr style="background-color: ${tableHeaderBgColor}; color: ${headerTextColor}; -webkit-print-color-adjust: exact;">
                                  ${headerRowHtml}
                              </tr>
                          </thead>
                          <tbody>
                              ${pageRowsHtml}
                          </tbody>
                      </table>
                    `
                        : ""
                    }
                    <div style="flex-grow: 1;"></div>
                </div>
                ${isLastPage ? `<div style="margin-top: 20px;">${totalsHtml}</div>` : ""}

                <div style="position: absolute; bottom: 4mm; left: 15mm; right: 15mm; padding-top: 4px; border-top: 1px solid #000000; z-index: 2; background: white;">
                    ${footerHtml}
                    <div style="text-align: right; font-size: ${fs(9)}; color: #9ca3af; margin-top: 5px;">Page ${pageNum} / ${totalPages}</div>
                </div>
            </div>
        `;

    pages.push(pageHtml);
  });

  if (document.body.contains(measureBox)) {
    document.body.removeChild(measureBox);
  }

  return `<div id="pdf-container">${pages.join("")}</div>`;
};

export const generatePDFBlob = async (
  docType: DocumentType,
  doc: DocumentData,
  settings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: PDFOptions,
): Promise<Blob> => {
  const template = generateDocumentHTML(docType, doc, settings, recipient, {
    ...options,
    isPDFDownload: true,
  });

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = template;

  document.body.appendChild(container);

  try {
    const contentElement = container.firstElementChild;

    const opt: any = {
      margin: 0,
      image: { type: "jpeg", quality: 1 },
      pagebreak: { mode: ["css", "legacy"] },
      html2canvas: {
        scale: options?.isPDFDownload ? 2 : 1.5,
        useCORS: true,
        logging: false,
        letterRendering: true,
        width: 794,
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          // Remove all oklch color references from styles to prevent html2canvas crash
          const styleTags = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styleTags.length; i++) {
            styleTags[i].innerHTML = styleTags[i].innerHTML.replace(
              /oklch\([^)]+\)/g,
              "#000000",
            );
          }
          // Also check for link tags that might contain oklch
          const linkTags = clonedDoc.getElementsByTagName("link");
          for (let i = linkTags.length - 1; i >= 0; i--) {
            if (linkTags[i].rel === "stylesheet") {
              linkTags[i].parentNode?.removeChild(linkTags[i]);
            }
          }
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    return await (html2pdf() as any).set(opt).from(contentElement).output('blob');
  } finally {
    document.body.removeChild(container);
  }
};

export const generatePDF = async (
  docType: DocumentType,
  doc: DocumentData,
  settings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: PDFOptions,
): Promise<void> => {
  const template = generateDocumentHTML(docType, doc, settings, recipient, {
    ...options,
    isPDFDownload: true,
  });
  const displayId = doc.documentId || doc.id;

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = template;

  document.body.appendChild(container);

  try {
    const contentElement = container.firstElementChild;

    const opt: any = {
      margin: 0,
      filename: `${docType.toLowerCase()}_${displayId}.pdf`,
      image: { type: "jpeg", quality: 1 },
      pagebreak: { mode: ["css", "legacy"] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        width: 794,
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          // Remove all oklch color references from styles to prevent html2canvas crash
          const styleTags = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styleTags.length; i++) {
            styleTags[i].innerHTML = styleTags[i].innerHTML.replace(
              /oklch\([^)]+\)/g,
              "#000000",
            );
          }
          // Also check for link tags that might contain oklch
          const linkTags = clonedDoc.getElementsByTagName("link");
          for (let i = linkTags.length - 1; i >= 0; i--) {
            if (linkTags[i].rel === "stylesheet") {
              linkTags[i].parentNode?.removeChild(linkTags[i]);
            }
          }
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    await (html2pdf() as any).set(opt).from(contentElement).save();
  } finally {
    document.body.removeChild(container);
  }
};

export const printDocument = (
  docType: DocumentType,
  doc: DocumentData,
  settings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: PDFOptions,
): void => {
  const lang = localStorage.getItem("app_language") || "fr";
  const dict = (translations as any)[lang] || translations["fr"];
  const htmlContent = generateDocumentHTML(
    docType,
    doc,
    settings,
    recipient,
    options,
  );
  const displayId = doc.documentId || doc.id;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(`
            <html>
                <head>
                    <title>${docType} #${displayId}</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        @media print {
                            @page { margin: 0; size: A4; }
                            body { -webkit-print-color-adjust: exact; }
                            tr.item-row { page-break-inside: avoid; }
                        }
                        /* Rich Text Formatting Styles */
                        p { margin: 0 0 4px 0; padding: 0; }
                        p:last-child { margin-bottom: 0; }
                        .ql-size-small { font-size: 0.75em; }
                        .ql-size-large { font-size: 1.5em; }
                        .ql-size-huge { font-size: 2.5em; }
                        .ql-align-center { text-align: center; }
                        .ql-align-right { text-align: right; }
                        .ql-align-justify { text-align: justify; }
                        strong, b { font-weight: bold; }
                        em, i { font-style: italic; }
                        u { text-decoration: underline; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
            </html>
        `);
    printWindow.document.close();

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  } else {
    alert(
      "Veuillez autoriser les pop-ups pour utiliser la fonction d'impression directe.",
    );
  }
};

// --- English Number to Words ---
const numberToWordsEn = (amount: number, settings?: CompanySettings | null): string => {
  const units = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ];
  const teens = [
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const scales = ["", "thousand", "million", "billion"];

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    let res = "";
    if (n >= 100) {
      res += units[Math.floor(n / 100)] + " hundred ";
      n %= 100;
    }
    if (n >= 20) {
      res +=
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + units[n % 10] : "");
    } else if (n >= 10) {
      res += teens[n - 10];
    } else if (n > 0) {
      res += units[n];
    }
    return res.trim();
  };

  const currencyCode = settings?.defaultCurrencyCode || 'MAD';
  let mainUnitSingular = "dirham";
  let mainUnitPlural = "dirhams";
  let subUnitSingular = "centime";
  let subUnitPlural = "centimes";

  if (currencyCode === "DZD") {
    mainUnitSingular = "Algerian dinar";
    mainUnitPlural = "Algerian dinars";
    subUnitSingular = "centime";
    subUnitPlural = "centimes";
  } else if (currencyCode === "EUR") {
    mainUnitSingular = "euro";
    mainUnitPlural = "euros";
    subUnitSingular = "cent";
    subUnitPlural = "cents";
  } else if (currencyCode === "USD") {
    mainUnitSingular = "dollar";
    mainUnitPlural = "dollars";
    subUnitSingular = "cent";
    subUnitPlural = "cents";
  } else if (currencyCode === "GBP") {
    mainUnitSingular = "pound";
    mainUnitPlural = "pounds";
    subUnitSingular = "penny";
    subUnitPlural = "pence";
  }

  // Round amount to 2 decimal places to avoid floating point precision issues
  const totalCents = Math.round(Math.abs(amount) * 100);
  const integerPart = Math.floor(totalCents / 100);
  const decimalPart = totalCents % 100;

  if (integerPart === 0 && decimalPart === 0) return `Zero ${mainUnitPlural}`;

  let words = "";
  let num = integerPart;
  let scaleIdx = 0;

  while (num > 0) {
    const group = num % 1000;
    if (group > 0) {
      words =
        convertGroup(group) +
        (scales[scaleIdx] ? " " + scales[scaleIdx] : "") +
        (words ? " " + words : "");
    }
    num = Math.floor(num / 1000);
    scaleIdx++;
  }

  let result = words.trim() + " " + (integerPart === 1 ? mainUnitSingular : mainUnitPlural);
  if (decimalPart > 0) {
    result += " and " + convertGroup(decimalPart) + " " + (decimalPart === 1 ? subUnitSingular : subUnitPlural);
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
};

// --- Spanish Number to Words ---
const numberToWordsEs = (amount: number, settings?: CompanySettings | null): string => {
  const units = [
    "",
    "un",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
  ];
  const tens = [
    "",
    "diez",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ];
  const special = {
    11: "once",
    12: "doce",
    13: "trece",
    14: "catorce",
    15: "quince",
    21: "veintiuno",
    22: "veintidós",
    23: "veintitrés",
    24: "veinticuatro",
    25: "veinticinco",
  };

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    if (n === 100) return "cien";
    let res = "";
    if (n >= 100) {
      const h = Math.floor(n / 100);
      if (h === 1) res += "ciento ";
      else if (h === 5) res += "quinientos ";
      else if (h === 7) res += "setecientos ";
      else if (h === 9) res += "novecientos ";
      else res += units[h] + "cientos ";
      n %= 100;
    }
    if (n > 0) {
      if ((special as any)[n]) res += (special as any)[n];
      else if (n >= 10 && n < 20) res += "dieci" + units[n - 10];
      else if (n >= 20 && n < 30) res += "veinti" + units[n - 20];
      else if (n >= 30) {
        res +=
          tens[Math.floor(n / 10)] +
          (n % 10 !== 0 ? " y " + units[n % 10] : "");
      } else {
        res += units[n];
      }
    }
    return res.trim();
  };

  const currencyCode = settings?.defaultCurrencyCode || 'MAD';
  let mainUnitSingular = "dirham";
  let mainUnitPlural = "dirhams";
  let subUnitSingular = "céntimo";
  let subUnitPlural = "céntimos";

  if (currencyCode === "DZD") {
    mainUnitSingular = "dinar argelino";
    mainUnitPlural = "dinares argelinos";
    subUnitSingular = "céntimo";
    subUnitPlural = "céntimos";
  } else if (currencyCode === "EUR") {
    mainUnitSingular = "euro";
    mainUnitPlural = "euros";
    subUnitSingular = "céntimo";
    subUnitPlural = "céntimos";
  } else if (currencyCode === "USD") {
    mainUnitSingular = "dólar";
    mainUnitPlural = "dólares";
    subUnitSingular = "centavo";
    subUnitPlural = "centavos";
  } else if (currencyCode === "GBP") {
    mainUnitSingular = "libra";
    mainUnitPlural = "libras";
    subUnitSingular = "penique";
    subUnitPlural = "peniques";
  }

  // Round amount to 2 decimal places to avoid floating point precision issues
  const totalCents = Math.round(Math.abs(amount) * 100);
  const integerPart = Math.floor(totalCents / 100);
  const decimalPart = totalCents % 100;

  if (integerPart === 0 && decimalPart === 0) return `Cero ${mainUnitPlural}`;

  let words = "";
  if (integerPart === 0) words = "cero";
  else if (integerPart === 1) words = "un";
  else if (integerPart < 1000) words = convertGroup(integerPart);
  else {
    const thousands = Math.floor(integerPart / 1000);
    const remainder = integerPart % 1000;
    words =
      (thousands === 1 ? "mil" : convertGroup(thousands) + " mil") +
      " " +
      convertGroup(remainder);
  }

  let result = words.trim() + " " + (integerPart === 1 ? mainUnitSingular : mainUnitPlural);
  return result.charAt(0).toUpperCase() + result.slice(1);
};

export interface ThermalTicketOptions {
  width?: '80mm' | '58mm' | string;
  customWidthMm?: number;
  fontStyle?: 'modern' | 'mono';
  logoSize?: 'small' | 'medium' | 'none';
  showLogo?: boolean;
  showCompanyInfo?: boolean;
  showIce?: boolean;
  showBarcode?: boolean;
  showCustomer?: boolean;
  showPaymentMethod?: boolean;
  footerNotes?: string;
  copies?: number;
  isPrintMode?: boolean;
}

export const generateThermalTicketHtml = (
  doc: DocumentData,
  settings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: ThermalTicketOptions,
): string => {
  const lang = localStorage.getItem("app_language") || "fr";
  const currencySymbol = getCurrencyByCode(settings?.defaultCurrencyCode || 'MAD').symbol;
  const displayId = doc.documentId || doc.id;
  const dateStr = doc.date ? new Date(doc.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : new Date().toLocaleString();

  const widthType = options?.width || settings?.defaultThermalTicketWidth || '80mm';
  const widthMm = widthType === '58mm' ? 58 : (options?.customWidthMm || 80);
  const is58 = widthMm <= 60;
  const innerWidthMm = is58 ? 56 : (widthMm - 4);

  const fontStyle = options?.fontStyle || 'modern';
  const logoSize = options?.logoSize || 'small';
  const showLogo = options?.showLogo !== false && logoSize !== 'none' && !!settings?.logo;
  const showCompanyInfo = options?.showCompanyInfo !== false;
  const showIce = options?.showIce !== false && !!settings?.ice;
  const showBarcode = options?.showBarcode !== false;
  const showCustomer = options?.showCustomer !== false;
  const showPaymentMethod = options?.showPaymentMethod !== false && !!doc.paymentMethod;

  const getLineMultiplier = (item: any) => {
    const mode = item.calculationMode;
    if (mode === 'm2') return (Number(item.length) || 1) * (Number(item.height) || 1);
    if (mode === 'ml') return Number(item.length) || 1;
    if (item.unit === 'm2' && item.length && item.height) {
      return item.length * item.height;
    }
    return 1;
  };

  const isModeTTC = settings?.priceDisplayMode === 'TTC';
  let totalTTC = 0;
  let subTotal = 0;
  let vatAmount = 0;
  let discountAmount = 0;
  let totalArticlesQty = 0;

  if (isModeTTC) {
    const totalTTCUnrounded = doc.lineItems.reduce((acc, item) => {
      const lineMultiplier = getLineMultiplier(item);
      totalArticlesQty += Number(item.quantity) || 0;
      const unitTTC = Math.round(item.unitPrice * (1 + (item.vat || 0) / 100) * 100) / 100;
      return acc + (unitTTC * item.quantity * lineMultiplier);
    }, 0);
    let currentTotalTTC = Math.round(totalTTCUnrounded * 100) / 100;

    if (doc.discountType && doc.discountValue && doc.discountValue > 0) {
      if (doc.discountType === "percentage") {
        discountAmount = currentTotalTTC * (doc.discountValue / 100);
      } else {
        discountAmount = doc.discountValue;
      }
    }
    totalTTC = Math.round((currentTotalTTC - discountAmount) * 100) / 100;

    const subTotalUnrounded = doc.lineItems.reduce((acc, item) => {
      const lineMultiplier = getLineMultiplier(item);
      const unitTTC = Math.round(item.unitPrice * (1 + (item.vat || 0) / 100) * 100) / 100;
      const lineTTC = unitTTC * item.quantity * lineMultiplier;
      return acc + (lineTTC / (1 + (item.vat || 0) / 100));
    }, 0);
    const subTotalAfterDiscount = subTotalUnrounded - (doc.discountType === "percentage" ? subTotalUnrounded * ((doc.discountValue || 0) / 100) : (doc.discountValue || 0));
    subTotal = Math.round(subTotalAfterDiscount * 100) / 100;
    vatAmount = Math.round((totalTTC - subTotal) * 100) / 100;
  } else {
    const subTotalUnrounded = doc.lineItems.reduce(
      (acc, item) => {
        totalArticlesQty += Number(item.quantity) || 0;
        return acc + item.unitPrice * item.quantity * getLineMultiplier(item);
      },
      0,
    );
    if (doc.discountType && doc.discountValue && doc.discountValue > 0) {
      if (doc.discountType === "percentage") {
        discountAmount = subTotalUnrounded * (doc.discountValue / 100);
      } else {
        discountAmount = doc.discountValue;
      }
    }

    const subTotalAfterDiscountUnrounded = subTotalUnrounded - discountAmount;

    const vatAmountUnrounded = doc.lineItems.reduce((acc, item) => {
      const itemTotalHT =
        item.unitPrice * item.quantity * getLineMultiplier(item);
      const itemDiscount =
        subTotalUnrounded > 0 ? (itemTotalHT / subTotalUnrounded) * discountAmount : 0;
      const itemBaseForVat = itemTotalHT - itemDiscount;
      return acc + itemBaseForVat * (item.vat / 100);
    }, 0);

    totalTTC = Math.round((subTotalAfterDiscountUnrounded + vatAmountUnrounded) * 100) / 100;
    subTotal = Math.round(subTotalAfterDiscountUnrounded * 100) / 100;
    vatAmount = Math.round((totalTTC - subTotal) * 100) / 100;
  }

  // Items rendered in true POS 2-line structure
  const itemsHtml = doc.lineItems.map(item => {
    const lineMultiplier = getLineMultiplier(item);
    const lineTotal = isModeTTC 
      ? Math.round(item.unitPrice * (1 + (item.vat || 0)/100) * item.quantity * lineMultiplier * 100) / 100
      : Math.round(item.unitPrice * item.quantity * lineMultiplier * (1 + (item.vat || 0)/100) * 100) / 100;
    const unitPriceDisplay = isModeTTC 
      ? Math.round(item.unitPrice * (1 + (item.vat || 0)/100) * 100) / 100
      : item.unitPrice;

    const qtyDisplay = lineMultiplier !== 1 
      ? `${item.quantity} [${item.length}x${item.height || (item as any).width || 1}]`
      : `${item.quantity}`;

    const itemName = item.name || (item as any).designation || (item as any).productName || item.description || item.productCode || 'Article';

    return `
      <div class="ticket-item">
        <div class="item-name">${itemName}</div>
        <div class="item-calc">
          <span class="item-qty">${qtyDisplay} x ${unitPriceDisplay.toFixed(2)}</span>
          <span class="item-total">${lineTotal.toFixed(2)}</span>
        </div>
      </div>
    `;
  }).join('');

  // Generate SVG barcode for ticket ID
  let barcodeImgTag = '';
  if (showBarcode && displayId) {
    try {
      const barcodeDataUri = renderBarcodeSvgDataUri(displayId, false);
      if (barcodeDataUri) {
        barcodeImgTag = `
          <div class="barcode-block">
            <img src="${barcodeDataUri}" class="barcode-img" style="max-width: ${is58 ? '85px' : '110px'}; height: 20px; margin: 0 auto; display: block;" alt="${displayId}" />
            <div class="barcode-text">* ${displayId} *</div>
          </div>
        `;
      }
    } catch (e) {
      // ignore
    }
  }

  const docTitle = (doc.documentId && doc.documentId.startsWith('DEV')) ? 'DEVIS' 
    : (doc.documentId && doc.documentId.startsWith('BL')) ? 'BON DE LIVRAISON'
    : (doc.documentId && doc.documentId.startsWith('BC')) ? 'BON DE COMMANDE'
    : 'TICKET DE CAISSE';

  const footerText = options?.footerNotes || settings?.footerNotes || 'Merci pour votre visite !';

  // Real thermal fonts stack
  const fontCss = fontStyle === 'mono' 
    ? `'Courier New', Courier, monospace`
    : `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

  const logoMaxHeight = logoSize === 'medium' ? (is58 ? '24px' : '30px') : (is58 ? '18px' : '22px');
  const logoMaxWidth = is58 ? '65px' : '85px';

  // Compute realistic fallback height in mm so Chrome always has a 100% valid @page size
  const estimatedHeightMm = Math.max(
    70,
    Math.ceil(
      (showLogo ? 18 : 0) +
      (showCompanyInfo ? 22 : 8) +
      (showIce ? 8 : 0) +
      16 + // metadata & doc number
      doc.lineItems.length * 11 + // items
      26 + // totals
      (showBarcode ? 22 : 0) +
      18 // footer
    )
  );

  // Viewport width in pixels matching the exact physical roll size
  const viewportWidthPx = Math.round(widthMm * 3.779528);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${viewportWidthPx}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Ticket #${displayId}</title>
  <style id="thermal-base-style">
    @page {
      size: ${widthMm}mm ${estimatedHeightMm}mm;
      margin: 0;
    }
    @page :first {
      size: ${widthMm}mm ${estimatedHeightMm}mm;
      margin: 0;
    }
    @page :left {
      margin: 0;
    }
    @page :right {
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      font-family: ${fontCss};
      font-size: ${is58 ? '8pt' : '9pt'};
      line-height: 1.25;
      color: #000000;
      background: ${options?.isPrintMode ? '#f1f5f9' : '#ffffff'};
      margin: 0 !important;
      padding: 0 !important;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }
    .ticket-screen-wrap {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: ${options?.isPrintMode ? '16px 8px' : '0'};
      margin: 0 !important;
    }
    #thermal-content {
      width: 100% !important;
      max-width: ${innerWidthMm}mm !important;
      margin: 0 auto !important;
      padding: ${is58 ? '1mm 1.5mm' : '3mm 2mm'} !important;
      box-sizing: border-box !important;
      background: #ffffff;
      ${options?.isPrintMode ? 'box-shadow: 0 4px 16px rgba(0,0,0,0.12); border-radius: 4px; border: 1px solid #e2e8f0;' : ''}
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .receipt-header, .receipt-meta, .items-list, .receipt-totals, .barcode-block, .receipt-footer {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    @media print {
      html, body {
        width: 100% !important;
        max-width: ${widthMm}mm !important;
        min-width: ${widthMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      .ticket-screen-wrap {
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
        width: 100% !important;
      }
      #thermal-content {
        width: 100% !important;
        max-width: ${widthMm}mm !important;
        margin: 0 auto !important;
        padding: ${is58 ? '0.5mm 1mm 1.5mm 1mm' : '2.5mm 1.5mm'} !important;
        box-sizing: border-box !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        border: none !important;
        background: #ffffff !important;
      }
      .no-print {
        display: none !important;
      }
    }
    
    /* Dividers */
    .receipt-divider {
      border-top: 1px dashed #000;
      margin: ${is58 ? '2px 0' : '3px 0'};
      width: 100%;
    }

    /* Header */
    .receipt-header {
      text-align: center;
      margin-bottom: ${is58 ? '2px' : '3px'};
    }
    .receipt-logo {
      max-height: ${logoMaxHeight};
      max-width: ${logoMaxWidth};
      width: auto;
      height: auto;
      object-fit: contain;
      margin: 0 auto 2px;
      display: block;
      filter: grayscale(100%) contrast(150%);
    }
    .company-name {
      font-size: ${is58 ? '9.5pt' : '11pt'};
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      line-height: 1.15;
      margin-bottom: 1px;
      text-align: center;
    }
    .company-details {
      font-size: ${is58 ? '6.8pt' : '7.5pt'};
      color: #111;
      line-height: 1.2;
      margin-bottom: 1px;
      text-align: center;
    }
    .company-ice {
      font-size: ${is58 ? '6.8pt' : '7.5pt'};
      font-weight: 700;
      margin-top: 1px;
      text-align: center;
    }
    .ticket-badge {
      display: inline-block;
      font-size: ${is58 ? '7.5pt' : '8.5pt'};
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: ${is58 ? '1.5px 0' : '2px 0 1px'};
      padding: 1px 4px;
      border: 1px solid #000;
      border-radius: 2px;
      text-align: center;
    }

    /* Metadata */
    .receipt-meta {
      font-size: ${is58 ? '7pt' : '8pt'};
      line-height: 1.25;
      margin: ${is58 ? '1.5px 0' : '2px 0'};
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-row strong {
      font-weight: 700;
    }

    /* Table Header */
    .table-head {
      display: flex;
      justify-content: space-between;
      font-size: ${is58 ? '7pt' : '7.5pt'};
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      padding: ${is58 ? '1px 0' : '1px 0 2px'};
      border-bottom: 1px solid #000;
      margin-bottom: ${is58 ? '1px' : '2px'};
    }

    /* Items */
    .ticket-item {
      padding: ${is58 ? '1px 0' : '1.5px 0'};
    }
    .item-name {
      font-size: ${is58 ? '8pt' : '8.5pt'};
      font-weight: 700;
      line-height: 1.15;
      word-break: break-word;
    }
    .item-calc {
      display: flex;
      justify-content: space-between;
      font-size: ${is58 ? '7.2pt' : '8pt'};
      color: #000;
      line-height: 1.15;
    }
    .item-qty {
      padding-left: 0;
      color: #111;
    }
    .item-total {
      font-weight: 800;
    }

    /* Totals */
    .receipt-totals {
      font-size: ${is58 ? '7.2pt' : '8pt'};
      margin-top: ${is58 ? '1.5px' : '2px'};
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      line-height: 1.25;
    }
    .grand-total-box {
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      padding: ${is58 ? '2px 0' : '2.5px 0'};
      margin: ${is58 ? '2px 0' : '2.5px 0'};
      font-size: ${is58 ? '9.5pt' : '11pt'};
      font-weight: 900;
      display: flex;
      justify-content: space-between;
      letter-spacing: 0.2px;
    }

    /* Payment & Barcode */
    .payment-row {
      display: flex;
      justify-content: space-between;
      font-size: ${is58 ? '7pt' : '7.5pt'};
      margin-top: 1.5px;
    }
    .barcode-block {
      text-align: center;
      margin: ${is58 ? '3px 0 1px' : '5px 0 2px'};
    }
    .barcode-img {
      max-width: ${is58 ? '85px' : '110px'};
      height: ${is58 ? '18px' : '20px'};
      margin: 0 auto;
      display: block;
    }
    .barcode-text {
      font-size: ${is58 ? '6.5pt' : '7pt'};
      letter-spacing: 1px;
      margin-top: 1px;
      font-weight: 600;
      text-align: center;
    }

    /* Footer */
    .receipt-footer {
      text-align: center;
      margin-top: ${is58 ? '3px' : '5px'};
      padding-top: ${is58 ? '2px' : '3px'};
      border-top: 1px dashed #000;
      font-size: ${is58 ? '7pt' : '7.5pt'};
      line-height: 1.2;
    }
    .footer-app {
      font-size: ${is58 ? '5.8pt' : '6.5pt'};
      color: #555;
      margin-top: 1px;
      letter-spacing: 0.2px;
    }
  </style>
</head>
<body>
  <div class="ticket-screen-wrap">
    <div id="thermal-content">
    
    <!-- Store Header -->
    <div class="receipt-header">
      ${showLogo ? `<img src="${settings?.logo}" class="receipt-logo" style="max-height: ${logoMaxHeight}; max-width: ${logoMaxWidth}; width: auto; height: auto; object-fit: contain; margin: 0 auto 3px; display: block;" alt="Logo" />` : ''}
      <div class="company-name">${settings?.companyName || 'COMMERCE'}</div>
      ${showCompanyInfo && settings?.address ? `<div class="company-details">${settings.address.replace(/\n/g, ' ')}</div>` : ''}
      ${showCompanyInfo && settings?.phone ? `<div class="company-details">Tél: ${settings.phone}</div>` : ''}
      ${showIce ? `<div class="company-ice">ICE: ${settings?.ice} ${settings?.rc ? `| RC: ${settings.rc}` : ''}</div>` : ''}
      <div><span class="ticket-badge">${docTitle}</span></div>
    </div>

    <div class="receipt-divider"></div>

    <!-- Ticket Info -->
    <div class="receipt-meta">
      <div class="meta-row">
        <span><strong>TICKET:</strong> #${displayId}</span>
        <span>${dateStr}</span>
      </div>
      ${showCustomer ? `
      <div class="meta-row">
        <span><strong>CLIENT:</strong> ${recipient?.name || 'Client Comptoir'}</span>
        ${recipient?.phone ? `<span>${recipient.phone}</span>` : ''}
      </div>` : ''}
    </div>

    <div class="receipt-divider"></div>

    <!-- Items Header -->
    <div class="table-head">
      <span>DÉSIGNATION</span>
      <span>TOTAL (${currencySymbol})</span>
    </div>

    <!-- Items List -->
    <div class="items-list">
      ${itemsHtml}
    </div>

    <div class="receipt-divider"></div>

    <!-- Totals -->
    <div class="receipt-totals">
      <div class="total-row">
        <span style="color: #333;">Nb Articles: ${doc.lineItems.length} (${totalArticlesQty} pcs)</span>
        <span>Total HT: ${subTotal.toFixed(2)}</span>
      </div>
      ${vatAmount > 0 ? `
      <div class="total-row">
        <span>Total TVA:</span>
        <span>${vatAmount.toFixed(2)}</span>
      </div>` : ''}
      ${discountAmount > 0 ? `
      <div class="total-row">
        <span>Remise:</span>
        <span>-${discountAmount.toFixed(2)}</span>
      </div>` : ''}
      
      <div class="grand-total-box">
        <span>TOTAL NET:</span>
        <span>${totalTTC.toFixed(2)} ${currencySymbol}</span>
      </div>

      ${showPaymentMethod ? `
      <div class="payment-row">
        <span>Mode de règlement :</span>
        <span style="font-weight: 700; text-transform: uppercase;">${doc.paymentMethod}</span>
      </div>` : ''}
    </div>

    ${barcodeImgTag}

    <!-- Footer Note -->
    <div class="receipt-footer">
      <div><strong>${footerText}</strong></div>
      <div class="footer-app">Facturago POS • Facturation & Gestion</div>
    </div>

    </div>
  </div>

  ${options?.isPrintMode ? `
  <script>
    function triggerDirectPrint() {
      function executePrint() {
        try {
          var content = document.getElementById('thermal-content');
          if (content) {
            var rect = content.getBoundingClientRect();
            // 1px = 25.4 / 96 mm = 0.264583 mm
            var realHeightMm = Math.ceil(rect.height * 0.264583) + 4;
            if (realHeightMm < 45) realHeightMm = 45;
            
            // Inject dynamic @page size style without overwriting thermal-base-style
            var pageStyle = document.getElementById('thermal-dynamic-page-size');
            if (!pageStyle) {
              pageStyle = document.createElement('style');
              pageStyle.id = 'thermal-dynamic-page-size';
              document.head.appendChild(pageStyle);
            }
            pageStyle.innerHTML = 
              '@page { size: ${widthMm}mm ' + realHeightMm + 'mm; margin: 0; } ' +
              '@page :first { size: ${widthMm}mm ' + realHeightMm + 'mm; margin: 0; } ' +
              '@page :left { margin: 0; } ' +
              '@page :right { margin: 0; }';
          }
        } catch (e) {
          console.error(e);
        }

        setTimeout(function() {
          try {
            window.focus();
            window.print();
          } catch(err) {
            console.error(err);
          }
        }, 300);
      }

      var images = document.images;
      var total = images.length;
      if (total === 0) {
        executePrint();
      } else {
        var loaded = 0;
        var finished = false;
        function onImageDone() {
          loaded++;
          if (!finished && loaded >= total) {
            finished = true;
            executePrint();
          }
        }
        for (var i = 0; i < total; i++) {
          if (images[i].complete) {
            onImageDone();
          } else {
            images[i].addEventListener('load', onImageDone);
            images[i].addEventListener('error', onImageDone);
          }
        }
        setTimeout(function() {
          if (!finished) {
            finished = true;
            executePrint();
          }
        }, 1000);
      }
    }

    if (document.readyState === 'complete') {
      triggerDirectPrint();
    } else {
      window.addEventListener('load', triggerDirectPrint);
    }
  </script>
  ` : ''}
</body>
</html>`;
};

export const printThermalTicket = (
  doc: DocumentData,
  settings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: ThermalTicketOptions,
): void => {
  const ticketHtml = generateThermalTicketHtml(doc, settings, recipient, {
    ...options,
    isPrintMode: true,
  });

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || '',
  );

  // On desktop open sized popup, on mobile open new tab so system print dialog attaches cleanly
  const printWindow = window.open("", "_blank", isMobile ? undefined : "width=420,height=600");
  if (printWindow) {
    try {
      printWindow.document.open();
      printWindow.document.write(ticketHtml);
      printWindow.document.close();
    } catch (e) {
      // Fallback using Blob URL
      const blob = new Blob([ticketHtml], { type: "text/html;charset=utf-8" });
      printWindow.location.href = URL.createObjectURL(blob);
    }
  } else {
    // Hidden iframe fallback if popup was blocked
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.setAttribute("sandbox", "allow-modals allow-same-origin allow-scripts");
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (iframeDoc && iframe.contentWindow) {
      iframeDoc.open();
      iframeDoc.write(ticketHtml);
      iframeDoc.close();
      iframe.contentWindow.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } catch (err) {
          console.error(err);
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (e) {}
        }, 2000);
      }, 500);
    } else {
      alert(
        "Veuillez autoriser les fenêtres pop-up dans votre navigateur pour imprimer le ticket thermique.",
      );
    }
  }
};

