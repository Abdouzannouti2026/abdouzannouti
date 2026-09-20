
export enum InvoiceStatus {
    Paid = 'Payée',
    Pending = 'En attente',
    Overdue = 'En retard',
    Draft = 'Brouillon',
    Partial = 'Partiellement payée'
}

export enum CreditNoteStatus {
    Draft = 'Brouillon',
    Validated = 'Validé',
    Refunded = 'Remboursé'
}

export interface Client {
    id: string;
    clientCode: string;
    type: 'Entreprise' | 'Particulier'; // Nouveau champ
    name: string; // Nom complet ou Nom du contact
    company?: string; // Nom de la société (optionnel si Particulier)
    ice?: string; // Identifiant Commun de l'Entreprise (optionnel)
    rc?: string; // Registre de Commerce (optionnel)
    email: string;
    phone: string;
    address?: string; // Adresse complète
}

export interface Supplier {
    id: string;
    supplierCode: string;
    type: 'Entreprise' | 'Particulier';
    name: string; // Nom du contact
    company?: string; // Nom de la société
    ice?: string;
    rc?: string;
    email: string;
    phone: string;
    address?: string;
}

export interface ProductVariant {
    id: string; // SKU or unique ID for the variant
    name: string; // e.g., "T-shirt - XL - Bleu"
    attributeValue: string; // e.g., "XL"
    stockQuantity: number;
    barcode?: string;
    salePrice?: number; // Optional: if variant has different price
    purchasePrice?: number; // Optional: if variant has different cost
}

export interface Product {
    id: string;
    productCode: string;
    barcode?: string;
    name: string;
    description: string;
    productType: 'Produit' | 'Service';
    unitOfMeasure: string;
    salePrice: number; // Stored as HT
    purchasePrice: number; // Stored as HT
    vat: number;
    stockQuantity: number; // Real stock tracking (sum of variants if they exist)
    minStockAlert: number;
    category?: string;
    hasVariants?: boolean;
    variants?: ProductVariant[];
    imageUrl?: string;
    createdAt?: string; // Tracking for statistics initial stock cost
}

export enum QuoteStatus {
    Draft = 'Brouillon',
    Created = 'Créé',
    Sent = 'Envoyé',
    Approved = 'Accepté',
    Rejected = 'Refusé',
    Converted = 'Converti',
}

export enum PurchaseOrderStatus {
    Draft = 'Brouillon',
    Sent = 'Envoyé',
    Received = 'Reçu', // Updates stock
    Paid = 'Payé',
    Cancelled = 'Annulé'
}

export interface LineItem {
  id: string;
  productId: string | null;
  variantId?: string; // Link to specific product variant
  productCode?: string; // Reference/SKU display
  barcode?: string;
  name: string;
  description: string;
  quantity: number;
  unit?: string;
  length?: number;
  height?: number;
  weight?: number;
  unitPrice: number;
  vat: number;
  showDimensions?: boolean; // Persisted here to avoid schema changes
  calculationMode?: 'piece' | 'm2' | 'ml' | 'kg' | 'days';
  days?: number;
  subject?: string;
  paymentMethod?: string;
  checkNumber?: string;
  bankName?: string;
  notes?: string;
  purchaseOrderNumber?: string;
  dueDate?: string;
  expiryDate?: string;
  expectedDate?: string;
  reference?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

export interface Quote {
    id: string;
    documentId?: string; // Human readable ID (DV00001)
    clientId: string;
    clientName: string;
    date: string;
    expiryDate: string;
    amount: number;
    status: QuoteStatus;
    subject?: string;
    paymentMethod?: string;
    checkNumber?: string;
    bankName?: string;
    reference?: string;
    purchaseOrderNumber?: string;
    showDimensions?: boolean;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    notes?: string;
}

export interface PurchaseOrder {
    id: string;
    documentId?: string; // Human readable ID (BC00001)
    supplierId: string;
    supplierName: string;
    date: string;
    expectedDate?: string;
    status: PurchaseOrderStatus;
    subject?: string;
    paymentMethod?: string;
    checkNumber?: string;
    bankName?: string;
    reference?: string;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    amountPaid: number; // Suivi des paiements fournisseurs
    dueDate?: string; // Date d'échéance du paiement
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    showDimensions?: boolean;
    notes?: string;
}

export interface Invoice {
    id: string;
    documentId?: string; // Human readable ID (FA00001)
    quoteId?: string;
    clientId: string;
    clientName: string;
    date: string;
    dueDate: string;
    paymentDate?: string;
    amount: number;
    amountPaid: number; // Track received payments
    status: InvoiceStatus;
    subject?: string;
    paymentMethod?: string;
    checkNumber?: string;
    bankName?: string;
    reference?: string;
    purchaseOrderNumber?: string;
    showDimensions?: boolean;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    notes?: string;
}

export interface CreditNote {
    id: string;
    documentId?: string; // Human readable ID (AV00001)
    invoiceId?: string; // Link to original invoice
    clientId: string;
    clientName: string;
    date: string;
    amount: number;
    status: CreditNoteStatus;
    subject?: string; // Reason
    paymentMethod?: string;
    checkNumber?: string;
    bankName?: string;
    reference?: string;
    showDimensions?: boolean;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    notes?: string;
}

export interface Payment {
    id: string;
    invoiceId: string;
    invoiceNumber: string; // Denormalized for easier display
    clientId: string;
    clientName: string;
    date: string;
    amount: number;
    method: 'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire';
    reference?: string; // Check number, transaction ID
    bankName?: string;
    notes?: string;
}

export interface StockMovement {
    id: string;
    productId: string;
    variantId?: string; // Link to specific product variant
    productName: string;
    date: string;
    quantity: number; // Positive for IN, Negative for OUT
    type: 'Initial' | 'Vente' | 'Achat' | 'Ajustement' | 'Retour';
    reference?: string; // Invoice ID or Delivery Note ID
}

export interface Expense {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    reference?: string;
    notes?: string;
    purchaseOrderId?: string;
}

export interface DeliveryNote {
    id: string;
    documentId?: string; // Human readable ID (BL00001)
    invoiceId?: string; // Optional now
    clientId: string;
    clientName: string;
    date: string;
    subject?: string; // Champ ajouté
    paymentMethod?: string;
    checkNumber?: string;
    bankName?: string;
    reference?: string;
    purchaseOrderNumber?: string;
    showDimensions?: boolean;
    lineItems: LineItem[];
    status: string; // Changed from fixed union to string to support computed statuses like 'Payé'
    // Financials for standalone BL
    subTotal?: number;
    vatAmount?: number;
    totalAmount?: number;
    paymentAmount?: number;
    notes?: string;
}

export interface DocumentColumn {
    id: 'reference' | 'name' | 'quantity' | 'unit' | 'unitPrice' | 'vat' | 'total' | 'length' | 'height' | 'm2' | 'ml' | 'weight' | 'totalWeight' | 'days';
    label: string;
    visible: boolean;
    order: number;
    width?: string; // Optional width hint
}

export interface DocumentLabels {
    totalHt?: string;
    totalTax?: string;
    totalNet?: string;
    amountInWordsPrefix?: string;
    signatureSender?: string;
    signatureRecipient?: string;
}

export interface NumberingConfig {
    prefix: string;
    yearFormat: 'YYYY' | 'YY' | 'NONE';
    startNumber: number;
    padding: number;
    separator: string;
}

export interface CompanySettings {
    id: string; 
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    rc?: string;       
    ice?: string;      
    fiscalId?: string; 
    patente?: string;  
    cnss?: string;     
    capital?: string;  
    logo?: string;
    logoWidth?: number;
    backgroundLogo?: string; // Dedicated watermark / background logo
    backgroundLogoWidth?: number;
    showLogoWatermark?: boolean;
    logoWatermarkOpacity?: number;
    stamp?: string;
    stampWidth?: number;
    primaryColor?: string;
    headerTextColor?: string;
    tableHeaderBgColor?: string;
    showTableBorders?: boolean;
    clientPosition?: 'left' | 'right';
    footerNotes?: string;
    defaultPaymentTerms?: string; 
    documentColumns?: DocumentColumn[]; 
    documentLabels?: DocumentLabels;
    showAmountInWords?: boolean; 
    showSignatureRecipient?: boolean;
    priceDisplayMode?: 'HT' | 'TTC'; // Nouveau mode d'affichage
    // Fix: added defaultCurrencyCode property to match usage in currencyService.ts
    defaultCurrencyCode?: string;
    invoiceNumbering?: NumberingConfig;
    quoteNumbering?: NumberingConfig;
    deliveryNoteNumbering?: NumberingConfig;
    purchaseOrderNumbering?: NumberingConfig;
    creditNoteNumbering?: NumberingConfig;
    documentInfoPosition?: 'right' | 'left';
    showExpiryDate?: boolean;
    showUnitInPDF?: boolean;
    defaultTva?: number;
    defaultThermalTicketWidth?: '80mm' | '58mm';
    documentFontSize?: number; // Échelle de taille de texte des documents en % (ex: 85, 100, 115, 130)
}

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    phone: string;
    email?: string;
    dailyRate: number;
    monthlySalary: number;
    paymentType: 'Daily' | 'Monthly';
    joinDate: string;
    isActive: boolean;
}

export interface Attendance {
    id: string;
    employeeId: string;
    date: string;
    status: 'Present' | 'Absent' | 'Half-day' | 'Leave';
    note?: string;
}

export interface SalaryPayment {
    id: string;
    employeeId: string;
    amount: number;
    paymentDate: string;
    periodStart: string;
    periodEnd: string;
    status: 'Paid' | 'Pending';
    reference?: string;
    type?: string; 
    note?: string;
}
