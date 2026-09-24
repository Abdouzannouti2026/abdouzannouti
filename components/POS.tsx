import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Barcode, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, 
  Landmark, FileText, CheckCircle2, RotateCcw, PauseCircle, PlayCircle, 
  Clock, Printer, X, User, ChevronDown, Sparkles, AlertCircle, Percent, 
  Maximize2, Minimize2, Volume2, VolumeX, ShieldCheck, ArrowRight, Store, 
  Package, Tag, Hash, Layers, Eye, Check, AlertTriangle, ArrowLeft,
  Calendar, DollarSign, Receipt, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Product, Client, Invoice, CompanySettings, LineItem, InvoiceStatus, ProductVariant, StockMovement } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { playBeepSound } from '../utils/barcode';
import BarcodeScannerModal from './BarcodeScannerModal';
import AddClientModal from './AddClientModal';
import ThermalTicketModal from './ThermalTicketModal';
import DocumentPreviewModal from './DocumentPreviewModal';

export interface POSTicket {
  id: string;
  documentId: string;
  date: string;
  clientName: string;
  clientId?: string;
  lineItems: LineItem[];
  subTotal: number;
  vatAmount: number;
  amount: number;
  amountPaid: number;
  paymentMethod: string;
  notes?: string;
  isInvoice: false;
}

interface POSProps {
  products: Product[];
  clients: Client[];
  invoices: Invoice[];
  companySettings: CompanySettings | null;
  onAddInvoice: (invoiceData: Omit<Invoice, 'id' | 'amount' | 'amountPaid'> & { initialPayment?: any }) => Promise<Invoice>;
  onAddClient: (client: Omit<Client, 'id' | 'clientCode'>) => Promise<void>;
  onAddStockMovement?: (movement: Omit<StockMovement, 'id'>) => Promise<void>;
}

interface CartItem extends LineItem {
  id: string; // unique cart row id
  barcode?: string;
  stockAvailable?: number;
  image?: string;
  category?: string;
}

interface HeldCart {
  id: string;
  date: string;
  client: Client;
  items: CartItem[];
  globalDiscountType: 'percentage' | 'fixed';
  globalDiscountValue: number;
  totalTTC: number;
}

export const POS: React.FC<POSProps> = ({
  products,
  clients,
  invoices,
  companySettings,
  onAddInvoice,
  onAddClient,
  onAddStockMovement
}) => {
  const { t, language, isRTL } = useLanguage();
  const currency = companySettings?.defaultCurrencyCode || 'MAD';

  // Default Counter Client
  const defaultCounterClient: Client = useMemo(() => ({
    id: 'client-comptoir',
    name: language === 'ar' ? 'زبون مباشر (كونتوار)' : 'Client Comptoir',
    clientCode: 'POS-001',
    type: 'Particulier',
    email: '',
    phone: '',
    address: 'Vente directe au comptoir'
  }), [language]);

  // State
  const [selectedClient, setSelectedClient] = useState<Client>(defaultCounterClient);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('facturago_pos_active_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeMobileView, setActiveMobileView] = useState<'catalog' | 'cart'>('catalog');
  const [recentlyAddedToast, setRecentlyAddedToast] = useState<{ name: string; time: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);
  const [globalDiscountType, setGlobalDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

  // Persist active cart items in localStorage
  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem('facturago_pos_active_cart', JSON.stringify(cartItems));
      } else {
        localStorage.removeItem('facturago_pos_active_cart');
      }
    } catch (e) {
      console.error("Could not persist active cart", e);
    }
  }, [cartItems]);

  // Dismiss recently added toast after delay
  useEffect(() => {
    if (!recentlyAddedToast) return;
    const timer = setTimeout(() => {
      setRecentlyAddedToast(null);
    }, 2200);
    return () => clearTimeout(timer);
  }, [recentlyAddedToast]);

  // Modals & UI States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHeldCartsOpen, setIsHeldCartsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isQuickItemOpen, setIsQuickItemOpen] = useState(false);
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);
  
  // Document generation choice: 'ticket' (Ticket de caisse uniquement) or 'invoice' (Générer une facture officielle)
  const [documentTypeToGenerate, setDocumentTypeToGenerate] = useState<'ticket' | 'invoice'>(() => {
    return (localStorage.getItem('facturago_pos_doc_type') as 'ticket' | 'invoice') || 'ticket';
  });

  // Track whether the last finalized sale was an official invoice or a standalone ticket
  const [lastSaleWasInvoice, setLastSaleWasInvoice] = useState<boolean>(false);

  // Saved standalone POS tickets (local counter sales without official invoices)
  const [posTickets, setPosTickets] = useState<POSTicket[]>(() => {
    try {
      const saved = localStorage.getItem('facturago_pos_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist posTickets
  useEffect(() => {
    try {
      localStorage.setItem('facturago_pos_tickets', JSON.stringify(posTickets));
    } catch (e) {
      console.error("Could not save POS tickets", e);
    }
  }, [posTickets]);

  // Post checkout & printing modals
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [thermalModalInvoice, setThermalModalInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Settings & Toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('facturago_pos_sound') !== 'false';
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Payment Modal State
  const [paymentMethod, setPaymentMethod] = useState<'Espèces' | 'Carte Bancaire' | 'Virement' | 'Chèque' | 'Crédit'>('Espèces');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [showDueDate, setShowDueDate] = useState<boolean>(false);
  const [posDueDate, setPosDueDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoPrintTicket, setAutoPrintTicket] = useState<boolean>(true);
  const [ticketWidth, setTicketWidth] = useState<'80mm' | '58mm'>(() => {
    return (localStorage.getItem('thermal_ticket_width') as '80mm' | '58mm') || '80mm';
  });

  // Held Carts in Local Storage
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    try {
      const saved = localStorage.getItem('facturago_pos_held_carts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Quick Item State
  const [quickItemName, setQuickItemName] = useState('');
  const [quickItemPrice, setQuickItemPrice] = useState<string>('');
  const [quickItemQty, setQuickItemQty] = useState<string>('1');
  const [quickItemVat, setQuickItemVat] = useState<string>(() => (companySettings?.defaultTva !== undefined ? companySettings.defaultTva.toString() : '0'));

  useEffect(() => {
    if (companySettings?.defaultTva !== undefined) {
      setQuickItemVat(companySettings.defaultTva.toString());
      if (companySettings.defaultTva === 0) {
        setCartItems(prev => prev.map(item => item.vat !== 0 ? { ...item, vat: 0 } : item));
      }
    }
  }, [companySettings?.defaultTva]);

  // References
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString(language === 'ar' ? 'ar-MA' : 'fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  // Persist held carts
  useEffect(() => {
    try {
      localStorage.setItem('facturago_pos_held_carts', JSON.stringify(heldCarts));
    } catch (e) {
      console.error("Could not save held carts", e);
    }
  }, [heldCarts]);

  // Persist sound preference
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('facturago_pos_sound', String(next));
  };

  // Sound Player helper
  const triggerBeep = () => {
    if (soundEnabled) {
      playBeepSound();
    }
  };

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered Products for display
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      // Category filter
      if (selectedCategory === 'favorites') {
        // if has favorites flag or top stock
      } else if (selectedCategory === 'services') {
        if (p.productType !== 'Service') return false;
      } else if (selectedCategory === 'products') {
        if (p.productType !== 'Produit') return false;
      } else if (selectedCategory !== 'all') {
        if (p.category !== selectedCategory) return false;
      }

      // Query filter
      if (!q) return true;
      const matchName = p.name.toLowerCase().includes(q);
      const matchCode = (p.productCode || '').toLowerCase().includes(q);
      const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
      const matchVariantBarcode = p.variants?.some(v => (v.barcode || '').toLowerCase().includes(q));
      const matchDescription = (p.description || '').toLowerCase().includes(q);

      return matchName || matchCode || matchBarcode || matchVariantBarcode || matchDescription;
    });
  }, [products, searchQuery, selectedCategory]);

  const itemsPerPage = 24;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Financial Calculations
  const { subTotalHT, totalVat, rawTotalTTC, discountAmount, finalTotalTTC } = useMemo(() => {
    let subHT = 0;
    let vat = 0;

    cartItems.forEach(item => {
      const lineBase = item.quantity * item.unitPrice;
      let lineNetHT = lineBase;
      if (item.discountType === 'percentage' && item.discountValue) {
        lineNetHT = lineBase * (1 - item.discountValue / 100);
      } else if (item.discountType === 'fixed' && item.discountValue) {
        lineNetHT = Math.max(0, lineBase - item.discountValue);
      }

      subHT += lineNetHT;
      const vatRate = item.vat || 0;
      vat += lineNetHT * (vatRate / 100);
    });

    const rawTTC = subHT + vat;
    let disc = 0;
    if (globalDiscountType === 'percentage' && globalDiscountValue > 0) {
      disc = rawTTC * (globalDiscountValue / 100);
    } else if (globalDiscountType === 'fixed' && globalDiscountValue > 0) {
      disc = Math.min(rawTTC, globalDiscountValue);
    }

    const finalTTC = Math.max(0, rawTTC - disc);

    return {
      subTotalHT: subHT,
      totalVat: vat,
      rawTotalTTC: rawTTC,
      discountAmount: disc,
      finalTotalTTC: finalTTC
    };
  }, [cartItems, globalDiscountType, globalDiscountValue]);

  // Change calculation
  const parsedCashReceived = parseFloat(cashReceived.replace(',', '.')) || 0;
  const changeDue = Math.max(0, parsedCashReceived - finalTotalTTC);
  const remainingDue = Math.max(0, finalTotalTTC - parsedCashReceived);

  // Today's Sales Stats (Official Invoices + Counter Tickets)
  const todaySalesStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayInvoices = invoices.filter(inv => {
      if (!inv.date) return false;
      const invDate = typeof inv.date === 'string' ? inv.date.split('T')[0] : '';
      return invDate === todayStr && inv.status !== InvoiceStatus.Draft;
    });

    const todayTickets = posTickets.filter(t => {
      if (!t.date) return false;
      const tDate = typeof t.date === 'string' ? t.date.split('T')[0] : '';
      return tDate === todayStr;
    });

    const totalRevenue = todayInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0) +
                         todayTickets.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalCount = todayInvoices.length + todayTickets.length;

    // Combined list for display in the sales history modal
    const combinedSales = [
      ...todayInvoices.map(inv => ({
        id: inv.id,
        documentId: inv.documentId || inv.id,
        date: inv.date,
        clientName: inv.clientName || 'Client Comptoir',
        amount: inv.amount || 0,
        lineItemsCount: inv.lineItems?.length || 0,
        isInvoice: true,
        status: inv.status,
        notes: inv.notes || 'Facture Vente',
        originalDoc: inv
      })),
      ...todayTickets.map(t => ({
        id: t.id,
        documentId: t.documentId,
        date: t.date,
        clientName: t.clientName || 'Client Comptoir',
        amount: t.amount || 0,
        lineItemsCount: t.lineItems?.length || 0,
        isInvoice: false,
        status: 'Ticket Caisse',
        notes: t.notes || 'Ticket de caisse',
        originalDoc: {
          id: t.id,
          documentId: t.documentId,
          clientId: t.clientId || '',
          clientName: t.clientName,
          date: t.date,
          dueDate: t.date,
          status: InvoiceStatus.Paid,
          subject: `Ticket de Caisse #${t.documentId}`,
          lineItems: t.lineItems,
          subTotal: t.subTotal,
          vatAmount: t.vatAmount,
          amount: t.amount,
          amountPaid: t.amountPaid,
          notes: t.notes
        } as Invoice
      }))
    ];

    return {
      totalRevenue,
      totalCount,
      todayInvoices,
      todayTickets,
      combinedSales
    };
  }, [invoices, posTickets]);

  // Add Product to Cart
  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    triggerBeep();

    const price = variant?.salePrice !== undefined ? variant.salePrice : product.salePrice;
    const stockAvailable = variant?.stockQuantity !== undefined ? variant.stockQuantity : product.stockQuantity;
    const name = variant ? `${product.name} (${variant.name})` : product.name;
    const barcode = variant?.barcode || product.barcode || '';
    const cartItemId = variant ? `${product.id}-${variant.id}` : product.id;

    setRecentlyAddedToast({ name, time: Date.now() });

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        const defaultTva = companySettings?.defaultTva !== undefined ? companySettings.defaultTva : 0;
        const itemVat = (companySettings?.defaultTva === 0) ? 0 : (typeof product.vat === 'number' ? product.vat : defaultTva);
        const newItem: CartItem = {
          id: cartItemId,
          productId: product.id,
          variantId: variant?.id,
          name: name,
          description: product.description || '',
          quantity: 1,
          unitPrice: price,
          vat: itemVat,
          unit: product.unitOfMeasure || 'U',
          barcode: barcode,
          stockAvailable: stockAvailable,
          image: product.imageUrl,
          category: product.category
        };
        return [newItem, ...prev];
      }
    });
  };

  // Click on product card
  const handleProductCardClick = (product: Product) => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      setVariantModalProduct(product);
    } else {
      handleAddToCart(product);
    }
  };

  // Adjust Quantity
  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === cartItemId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  // Set Direct Quantity
  const handleSetQuantity = (cartItemId: string, qty: number) => {
    const validQty = Math.max(1, isNaN(qty) ? 1 : qty);
    setCartItems(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: validQty } : item));
  };

  // Update Unit Price
  const handleUpdateUnitPrice = (cartItemId: string, price: number) => {
    const validPrice = Math.max(0, isNaN(price) ? 0 : price);
    setCartItems(prev => prev.map(item => item.id === cartItemId ? { ...item, unitPrice: validPrice } : item));
  };

  // Update Item VAT
  const handleUpdateVat = (cartItemId: string, newVat: number) => {
    setCartItems(prev => prev.map(item => item.id === cartItemId ? { ...item, vat: newVat } : item));
  };

  // Apply VAT to all items
  const handleApplyVatToAll = (newVat: number) => {
    setCartItems(prev => prev.map(item => ({ ...item, vat: newVat })));
  };

  // Remove Item
  const handleRemoveItem = (cartItemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId));
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    if (window.confirm(t('clearCartConfirm') || 'Voulez-vous vraiment vider le panier ?')) {
      setCartItems([]);
      setGlobalDiscountValue(0);
    }
  };

  // Add Custom / Open Item
  const handleAddQuickItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(quickItemPrice.replace(',', '.')) || 0;
    const qtyNum = parseFloat(quickItemQty.replace(',', '.')) || 1;
    const vatNum = parseFloat(quickItemVat) || 0;

    if (!quickItemName.trim() || priceNum <= 0) {
      alert(language === 'ar' ? 'المرجو إدخال اسم وسعر صالحين' : 'Veuillez saisir un nom et un prix valides.');
      return;
    }

    triggerBeep();

    const customItem: CartItem = {
      id: `custom-${Date.now()}`,
      productId: null,
      name: quickItemName.trim(),
      description: 'Article libre / Vente rapide',
      quantity: qtyNum,
      unitPrice: priceNum,
      vat: vatNum,
      unit: 'U',
      stockAvailable: undefined
    };

    setCartItems(prev => [customItem, ...prev]);
    setQuickItemName('');
    setQuickItemPrice('');
    setQuickItemQty('1');
    setIsQuickItemOpen(false);
  };

  // Barcode Scanned handler (from Camera or Scanner)
  const handleBarcodeScanned = (scannedCode: string) => {
    const cleanCode = scannedCode.trim().toLowerCase();
    if (!cleanCode) return;

    // Search matching product
    let foundProduct: Product | undefined;
    let foundVariant: ProductVariant | undefined;

    for (const p of products) {
      if ((p.barcode || '').toLowerCase() === cleanCode || (p.productCode || '').toLowerCase() === cleanCode) {
        foundProduct = p;
        break;
      }
      if (p.variants) {
        const v = p.variants.find(varItem => (varItem.barcode || '').toLowerCase() === cleanCode);
        if (v) {
          foundProduct = p;
          foundVariant = v;
          break;
        }
      }
    }

    if (foundProduct) {
      handleAddToCart(foundProduct, foundVariant);
      setSearchQuery('');
    } else {
      if (soundEnabled) {
        playBeepSound();
      }
      setRecentlyAddedToast({
        name: language === 'ar' ? `غير متوفر: ${scannedCode}` : `Non trouvé: ${scannedCode}`,
        time: Date.now()
      });
    }
  };

  // Hardware USB/Bluetooth Douchette Barcode Scanner Global Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in a standard input or textarea
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Keyboard shortcuts
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleClearCart();
        return;
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cartItems.length > 0) {
          handleOpenCheckout();
        }
        return;
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (cartItems.length > 0) {
          handleHoldCart();
        }
        return;
      }

      // Fast typing typical of barcode douchette (intervals < 50ms)
      if (diff > 100) {
        barcodeBufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3 && !isInput) {
          e.preventDefault();
          handleBarcodeScanned(barcodeBufferRef.current);
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, products, soundEnabled]);

  // Hold / Park current Cart
  const handleHoldCart = () => {
    if (cartItems.length === 0) return;

    const newHeldCart: HeldCart = {
      id: `cart-${Date.now()}`,
      date: new Date().toLocaleTimeString(language === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }),
      client: selectedClient,
      items: [...cartItems],
      globalDiscountType,
      globalDiscountValue,
      totalTTC: finalTotalTTC
    };

    setHeldCarts(prev => [newHeldCart, ...prev]);
    setCartItems([]);
    setSelectedClient(defaultCounterClient);
    setGlobalDiscountValue(0);
    triggerBeep();
  };

  // Resume Parked Cart
  const handleResumeCart = (heldCart: HeldCart) => {
    setCartItems(heldCart.items);
    setSelectedClient(heldCart.client);
    setGlobalDiscountType(heldCart.globalDiscountType);
    setGlobalDiscountValue(heldCart.globalDiscountValue);
    setHeldCarts(prev => prev.filter(c => c.id !== heldCart.id));
    setIsHeldCartsOpen(false);
    triggerBeep();
  };

  // Delete Parked Cart
  const handleDeleteHeldCart = (heldCartId: string) => {
    setHeldCarts(prev => prev.filter(c => c.id !== heldCartId));
  };

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cartItems.length === 0) return;
    setCashReceived(finalTotalTTC.toFixed(2));
    setShowDueDate(false);
    setPosDueDate('');
    setIsCheckoutOpen(true);
  };

  // Quick cash denomination button click
  const handleQuickCash = (amount: number) => {
    setCashReceived(amount.toFixed(2));
  };

  // Submit Sale & Create Invoice
  const handleCompleteSale = async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const todayStr = new Date().toISOString().split('T')[0];
      const paidAmount = paymentMethod === 'Crédit' ? 0 : parsedCashReceived >= finalTotalTTC ? finalTotalTTC : parsedCashReceived;
      const isFullyPaid = paymentMethod !== 'Crédit' && paidAmount >= finalTotalTTC;
      const effectiveDueDate = showDueDate && posDueDate ? posDueDate : undefined;

      // Prepare LineItems
      const cleanLineItems: LineItem[] = cartItems.map(item => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vat: item.vat,
        unit: item.unit,
        discountType: item.discountType,
        discountValue: item.discountValue
      }));

      let finalDoc: Invoice;

      if (documentTypeToGenerate === 'invoice') {
        // ================= OPTION 1: GENERATE OFFICIAL INVOICE =================
        const invoicePayload = {
          clientId: selectedClient.id === 'client-comptoir' ? '' : selectedClient.id,
          clientName: selectedClient.name,
          date: todayStr,
          dueDate: effectiveDueDate,
          status: isFullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Pending,
          subject: `Vente Caisse POS #${Date.now().toString().slice(-4)}`,
          lineItems: cleanLineItems,
          subTotal: subTotalHT,
          vatAmount: totalVat,
          amount: finalTotalTTC,
          notes: paymentNotes ? `POS [${paymentMethod}]: ${paymentNotes}` : `Vente au comptoir (${paymentMethod})`,
          initialPayment: paidAmount > 0 ? {
            amount: paidAmount,
            method: paymentMethod,
            date: todayStr
          } : undefined
        };

        const createdInvoice = await onAddInvoice(invoicePayload);
        finalDoc = createdInvoice;
        setLastSaleWasInvoice(true);
      } else {
        // ================= OPTION 2: STANDALONE TICKET ONLY (NO INVOICE IN LIST) =================
        const ticketSeq = (posTickets.length + 1).toString().padStart(4, '0');
        const ticketNum = `TK-${todayStr.replace(/-/g, '')}-${ticketSeq}`;

        // Deduct inventory items accurately
        if (onAddStockMovement) {
          const stockChanges: Map<string, { qty: number, productId: string, variantId?: string, name: string }> = new Map();
          for (const item of cleanLineItems) {
            if (item.productId) {
              const key = `${item.productId}-${item.variantId || 'base'}`;
              const current = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
              current.qty += item.quantity;
              stockChanges.set(key, current);
            }
          }
          for (const change of Array.from(stockChanges.values())) {
            await onAddStockMovement({
              productId: change.productId,
              variantId: change.variantId,
              productName: change.name,
              date: todayStr,
              quantity: -change.qty,
              type: 'Vente',
              reference: `Ticket Caisse #${ticketNum}`
            });
          }
        }

        const ticketDoc: Invoice = {
          id: `ticket-${Date.now()}`,
          documentId: ticketNum,
          clientId: selectedClient.id === 'client-comptoir' ? '' : selectedClient.id,
          clientName: selectedClient.name,
          date: todayStr,
          dueDate: effectiveDueDate,
          status: InvoiceStatus.Paid,
          subject: `Ticket de Caisse #${ticketNum}`,
          lineItems: cleanLineItems,
          subTotal: subTotalHT,
          vatAmount: totalVat,
          amount: finalTotalTTC,
          amountPaid: paidAmount,
          notes: paymentNotes ? `Ticket POS [${paymentMethod}]: ${paymentNotes}` : `Ticket de caisse (${paymentMethod})`
        };

        const newTicketRecord: POSTicket = {
          id: ticketDoc.id,
          documentId: ticketNum,
          date: todayStr,
          clientName: selectedClient.name,
          clientId: selectedClient.id === 'client-comptoir' ? undefined : selectedClient.id,
          lineItems: cleanLineItems,
          subTotal: subTotalHT,
          vatAmount: totalVat,
          amount: finalTotalTTC,
          amountPaid: paidAmount,
          paymentMethod: paymentMethod,
          notes: paymentNotes,
          isInvoice: false
        };

        setPosTickets(prev => [newTicketRecord, ...prev]);
        finalDoc = ticketDoc;
        setLastSaleWasInvoice(false);
      }

      // Sound & Success
      if (soundEnabled) {
        playBeepSound();
      }

      setLastInvoice(finalDoc);
      setIsCheckoutOpen(false);
      setCartItems([]);
      setSelectedClient(defaultCounterClient);
      setGlobalDiscountValue(0);
      setPaymentNotes('');
      setCashReceived('');
      setShowDueDate(false);
      setPosDueDate('');

      if (autoPrintTicket) {
        setThermalModalInvoice(finalDoc);
      } else {
        setIsSuccessModalOpen(true);
      }
    } catch (err: any) {
      console.error("POS Sale Error:", err);
      alert("Erreur lors de la validation de la vente: " + (err.message || 'Erreur inconnue'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] max-h-screen bg-slate-100 text-slate-800 select-none overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 1. TOP BAR: POS HEADER */}
      <header className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between shadow-md z-20 border-b border-slate-800">
        {/* Left: Brand, Live Clock & Counter badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-600/90 text-white px-3 py-1.5 rounded-xl font-bold text-sm tracking-wide shadow-sm">
            <Store size={18} className="text-emerald-200" />
            <span>{t('pos') || 'Point de Vente'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-lg text-xs font-mono text-emerald-400 border border-slate-700/60">
            <Clock size={13} className="text-slate-400" />
            <span>{currentTime}</span>
          </div>
        </div>

        {/* Center: Shift Overview Chips */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-slate-400">{t('todaySales') || 'Ventes'}:</span>
            <span className="font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded text-[11px]">{todaySalesStats.totalCount}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-slate-400">Total CA:</span>
            <span className="font-bold text-emerald-400">
              {todaySalesStats.totalRevenue.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}
            </span>
          </div>
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2">
          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium transition-colors border border-slate-700/60"
            title={t('salesHistory') || 'Historique des ventes'}
          >
            <Calendar size={14} className="text-amber-400" />
            <span className="hidden sm:inline">{t('salesHistory') || 'Historique'}</span>
          </button>

          {/* Held Carts Button */}
          <button
            onClick={() => setIsHeldCartsOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium transition-colors border border-slate-700/60"
            title={t('heldCarts') || 'Paniers en attente'}
          >
            <PauseCircle size={14} className="text-sky-400" />
            <span className="hidden sm:inline">{t('heldCarts') || 'En attente'}</span>
            {heldCarts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-sky-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {heldCarts.length}
              </span>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-xl border transition-colors ${
              soundEnabled 
                ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title={soundEnabled ? 'Son activé' : 'Son désactivé'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Tab Selector (visible on mobile / tablet < lg) */}
      <div className="lg:hidden bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex-1 grid grid-cols-2 p-1 bg-slate-800/90 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveMobileView('catalog')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeMobileView === 'catalog'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Package size={15} />
            <span>{language === 'ar' ? 'الكتالوج' : 'Catalogue'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
              activeMobileView === 'catalog' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-700 text-slate-300'
            }`}>
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMobileView('cart')}
            className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeMobileView === 'cart'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ShoppingCart size={15} />
            <span>{language === 'ar' ? 'السلة' : 'Panier'}</span>
            {cartItems.reduce((sum, item) => sum + item.quantity, 0) > 0 ? (
              <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-1.5 py-0.2 rounded-full shadow-sm animate-pulse">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-700 text-slate-400">
                0
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. MAIN POS WORKSPACE: 2-PANEL SPLIT (Catalog on Left / Cart on Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* ================= LEFT PANEL: CATALOG & SEARCH ================= */}
        <div className={`${activeMobileView === 'catalog' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0 bg-slate-100 border-r border-slate-200 overflow-hidden relative`}>
          
          {/* Quick feedback toast when item is added */}
          {recentlyAddedToast && (
            <div className="absolute top-3 right-3 z-30 bg-slate-900/95 text-white px-3.5 py-2 rounded-xl shadow-xl border border-emerald-500/50 flex items-center gap-2 text-xs font-bold backdrop-blur-sm pointer-events-none">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                <Check size={13} className="stroke-[3]" />
              </div>
              <span className="truncate max-w-[180px]">{recentlyAddedToast.name}</span>
              <span className="text-emerald-400 font-normal">({cartItems.reduce((sum, item) => sum + item.quantity, 0)} {language === 'ar' ? 'في السلة' : 'au panier'})</span>
            </div>
          )}
          
          {/* Top Search & Actions Bar */}
          <div className="p-3 bg-white border-b border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            
            {/* Search Input with Auto-detection */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleBarcodeScanned(searchQuery);
                  }
                }}
                placeholder={language === 'ar' ? 'ابحث عن منتج، رمز أو امسح الباركود... [F1]' : 'Rechercher un produit, SKU, ou code-barres... [F1]'}
                className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick Actions: Camera Scanner + Custom Item */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-xs transition-colors border border-emerald-200"
                title="Ouvrir le scanner caméra"
              >
                <Barcode size={16} />
                <span>{language === 'ar' ? 'مسح' : 'Scanner'}</span>
              </button>

              <button
                onClick={() => setIsQuickItemOpen(true)}
                className="flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition-colors border border-slate-200"
                title="Ajouter un article divers non référencé"
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'عنصر حر' : 'Divers'}</span>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'Tous'} ({products.length})
            </button>

            <button
              onClick={() => setSelectedCategory('products')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'products'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              📦 {language === 'ar' ? 'المنتجات' : 'Articles'}
            </button>

            <button
              onClick={() => setSelectedCategory('services')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'services'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              🛠️ {language === 'ar' ? 'الخدمات' : 'Services'}
            </button>

            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col justify-between">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 content-start">
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map(product => {
                  const isOutOfStock = product.productType === 'Produit' && (product.stockQuantity || 0) <= 0;
                  const isLowStock = product.productType === 'Produit' && (product.stockQuantity || 0) > 0 && (product.stockQuantity || 0) <= (product.minStockAlert || 5);
                  
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleProductCardClick(product)}
                      className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500/50 active:scale-[0.98] transition-all flex flex-col justify-between text-left group relative overflow-hidden h-[195px]"
                    >
                      {/* Top image or type icon */}
                      <div className="w-full h-[95px] rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-2 relative shrink-0">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors">
                            <Package size={26} strokeWidth={1.5} />
                            <span className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-wider">{product.category || 'Article'}</span>
                          </div>
                        )}

                        {/* Stock Pill */}
                        {product.productType === 'Produit' && (
                          <span className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${
                            isOutOfStock 
                              ? 'bg-red-500 text-white' 
                              : isLowStock 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-slate-900/80 text-white backdrop-blur-xs'
                          }`}>
                            {product.stockQuantity || 0}
                          </span>
                        )}

                        {/* Variants Indicator */}
                        {product.hasVariants && product.variants && product.variants.length > 0 && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-600 text-white shadow-xs">
                            {product.variants.length} var.
                          </span>
                        )}
                      </div>

                      {/* Product Name & SKU */}
                      <div className="flex-1 w-full min-w-0 flex flex-col justify-center">
                        <p className="font-bold text-xs text-slate-800 truncate leading-tight group-hover:text-emerald-700 transition-colors">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {product.barcode || product.productCode || 'Ref: -'}
                        </p>
                      </div>

                      {/* Price & Add indicator */}
                      <div className="w-full pt-1.5 border-t border-slate-100 flex items-center justify-between shrink-0">
                        <span className="font-extrabold text-xs sm:text-sm text-emerald-600">
                          {product.salePrice.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                          <Plus size={14} />
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
                  <Package size={44} className="opacity-30 mb-2" />
                  <p className="font-medium text-sm text-slate-500">{t('noResults') || 'Aucun produit trouvé'}</p>
                  <p className="text-xs text-slate-400 mt-1">Essayez un autre mot-clé ou scannez un code-barres.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls Bar */}
            {totalPages > 1 && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between px-2 bg-white rounded-xl py-2 shrink-0 shadow-xs">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition-all"
                >
                  <ChevronLeft size={14} />
                  <span>{language === 'ar' ? 'السابق' : 'Précédent'}</span>
                </button>

                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%] px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first, last, and pages around current
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            currentPage === page
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 || 
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-slate-400 px-0.5">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition-all"
                >
                  <span>{language === 'ar' ? 'التالي' : 'Suivant'}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Mobile/Tablet Bottom Quick Cart Bar (when browsing catalog with items in cart) */}
          {cartItems.length > 0 && (
            <div className="lg:hidden p-2.5 bg-slate-900 border-t border-slate-800 shadow-2xl flex items-center justify-between gap-3 shrink-0 z-20">
              <button
                type="button"
                onClick={() => setActiveMobileView('cart')}
                className="flex-1 flex items-center justify-between bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} />
                  <span>{language === 'ar' ? 'عرض السلة' : 'Voir le panier'}</span>
                  <span className="bg-emerald-800/90 px-2 py-0.5 rounded-full text-[11px] font-extrabold text-white">
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)} {cartItems.reduce((sum, item) => sum + item.quantity, 0) > 1 ? 'articles' : 'article'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-black">
                  <span>{finalTotalTTC.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}</span>
                  <ArrowRight size={14} />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* ================= RIGHT PANEL: CART & DIGITAL REGISTER ================= */}
        <div className={`${activeMobileView === 'cart' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[320px] xl:w-[345px] flex-col bg-white shadow-xl z-10 shrink-0 border-l border-slate-200`}>
          
          {/* Mobile Return to Catalog Bar */}
          <div className="lg:hidden px-3 py-2 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMobileView('catalog')}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>{language === 'ar' ? 'الرجوع إلى الكتالوج' : '← Continuer les achats / Catalogue'}</span>
            </button>
            <span className="text-[11px] text-slate-300 font-medium">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} {cartItems.reduce((sum, item) => sum + item.quantity, 0) > 1 ? 'articles' : 'article'}
            </span>
          </div>

          {/* Cart Header: Client Picker & Cart Clear */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-1.5">
            
            {/* Customer Selector Dropdown */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <User size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <select
                  value={selectedClient.id}
                  onChange={(e) => {
                    const found = clients.find(c => c.id === e.target.value);
                    if (found) setSelectedClient(found);
                    else setSelectedClient(defaultCounterClient);
                  }}
                  className="w-full h-8 bg-white border border-slate-200 text-xs font-bold rounded-lg px-2 py-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 truncate"
                >
                  <option value="client-comptoir">👤 {defaultCounterClient.name}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Add Client Button */}
            <button
              onClick={() => setIsNewClientOpen(true)}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs transition-colors shrink-0"
              title="Ajouter un nouveau client"
            >
              <Plus size={15} />
            </button>

            {/* Hold Cart Button */}
            <button
              onClick={handleHoldCart}
              disabled={cartItems.length === 0}
              className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors shrink-0"
              title={t('holdCart') || 'Mettre en attente (F6)'}
            >
              <PauseCircle size={15} />
            </button>

            {/* Clear Cart Button */}
            <button
              onClick={handleClearCart}
              disabled={cartItems.length === 0}
              className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors shrink-0"
              title="Vider le panier (F2)"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {cartItems.length > 0 ? (
              cartItems.map((item, idx) => {
                const lineBase = item.quantity * item.unitPrice;
                let lineTotal = lineBase;
                if (item.discountType === 'percentage' && item.discountValue) {
                  lineTotal = lineBase * (1 - item.discountValue / 100);
                } else if (item.discountType === 'fixed' && item.discountValue) {
                  lineTotal = Math.max(0, lineBase - item.discountValue);
                }

                return (
                  <div 
                    key={item.id} 
                    className="p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 transition-all group"
                  >
                    {/* Item Description & Price */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-slate-800 truncate leading-tight">
                        {item.name}
                      </p>
                      
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                        <span>
                          {item.unitPrice.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}
                        </span>
                        <select
                          value={item.vat !== undefined ? item.vat : (companySettings?.defaultTva ?? 0)}
                          onChange={(e) => handleUpdateVat(item.id, parseFloat(e.target.value) || 0)}
                          className="text-[10px] bg-slate-200/70 hover:bg-slate-300/80 px-1 py-0.2 rounded text-slate-700 font-bold border-0 cursor-pointer focus:ring-1 focus:ring-emerald-500 transition-colors"
                          title={language === 'ar' ? 'تغيير نسبة الضريبة' : 'Modifier la TVA de cette ligne'}
                        >
                          <option value="0">0%</option>
                          <option value="7">7%</option>
                          <option value="10">10%</option>
                          <option value="14">14%</option>
                          <option value="20">20%</option>
                        </select>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden shrink-0 h-7">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-6 h-full flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title="Diminuer la quantité"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleSetQuantity(item.id, isNaN(val) ? 1 : val);
                        }}
                        className="w-10 h-full text-center font-extrabold text-xs text-slate-900 bg-slate-50/60 border-x border-slate-200 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 px-0.5 py-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-6 h-full flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title="Augmenter la quantité"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Line Total & Remove */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-bold text-xs text-slate-900 text-right min-w-[45px]">
                        {lineTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer la ligne"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-2.5">
                  <ShoppingCart size={24} className="opacity-40" />
                </div>
                <p className="font-bold text-sm text-slate-600">{t('emptyCart') || 'Le panier est vide'}</p>
                <p className="text-xs text-slate-400 mt-1 text-center max-w-[220px]">
                  Scannez un article ou cliquez sur les produits du catalogue pour commencer.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveMobileView('catalog')}
                  className="lg:hidden mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <Package size={14} />
                  <span>{language === 'ar' ? 'تصفح الكتالوج والمنتجات' : 'Voir le catalogue des produits'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Cart Financial Summary & Checkout Action */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
            
            {/* Global Discount Row */}
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Percent size={13} className="text-slate-400" />
                <span>Remise globale :</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={globalDiscountValue || ''}
                  onChange={(e) => setGlobalDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-16 h-7 px-2 py-0 text-right font-extrabold text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setGlobalDiscountType(prev => prev === 'percentage' ? 'fixed' : 'percentage')}
                  className="h-7 px-2 py-0 text-[11px] font-bold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                >
                  {globalDiscountType === 'percentage' ? '%' : currency}
                </button>
              </div>
            </div>

            {/* HT and TVA breakdown */}
            <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Sous-total HT :</span>
                <span>{subTotalHT.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span>Total TVA :</span>
                  {cartItems.length > 0 && totalVat > 0 && (
                    <button
                      type="button"
                      onClick={() => handleApplyVatToAll(0)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                      title={language === 'ar' ? 'تطبيق 0% على جميع العناصر' : 'Appliquer 0% à tous les articles'}
                    >
                      (0% TVA)
                    </button>
                  )}
                  {cartItems.length > 0 && totalVat === 0 && (companySettings?.defaultTva ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => handleApplyVatToAll(companySettings?.defaultTva ?? 20)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                      title={language === 'ar' ? 'تطبيق الضريبة الافتراضية على جميع العناصر' : 'Appliquer TVA par défaut'}
                    >
                      ({companySettings?.defaultTva}%)
                    </button>
                  )}
                </div>
                <span>{totalVat.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Remise :</span>
                  <span>-{discountAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}</span>
                </div>
              )}
            </div>

            {/* Grand Total TTC */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 leading-none">
                  Total à payer TTC
                </p>
                <p className="text-2xl font-black text-slate-900 leading-tight">
                  {finalTotalTTC.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })}
                  <span className="text-sm font-bold text-slate-500 ml-1">{currency}</span>
                </p>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-lg">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} {language === 'ar' ? 'قطع' : 'articles'}
              </span>
            </div>

            {/* Big Checkout Button */}
            <button
              onClick={handleOpenCheckout}
              disabled={cartItems.length === 0}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-base rounded-xl shadow-md hover:shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 tracking-wide"
            >
              <Banknote size={20} />
              <span>{t('checkout') || 'ENCAISSER'} [F4]</span>
              <span className="bg-emerald-500/60 px-2 py-0.5 rounded text-sm">
                {finalTotalTTC.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= 3. CHECKOUT & PAYMENT MODAL ================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="text-emerald-400" size={22} />
                <h3 className="font-bold text-lg">Règlement & Encaissement</h3>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Total Display */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant Total Net à Payer</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  {finalTotalTTC.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}
                </p>
                <p className="text-xs text-slate-500 mt-1">Client : {selectedClient.name}</p>
              </div>

              {/* Choix du Document à générer (Ticket seul vs Facture officielle) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('docToGenerate') || 'Document à générer'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentTypeToGenerate('ticket');
                      localStorage.setItem('facturago_pos_doc_type', 'ticket');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      documentTypeToGenerate === 'ticket'
                        ? 'bg-amber-50/85 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          documentTypeToGenerate === 'ticket' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Receipt size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 leading-tight">
                            {t('ticketOnly') || 'Ticket de caisse'}
                          </p>
                          <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded mt-0.5">
                            {t('ticketOnlyBadge') || 'Ticket seul'}
                          </span>
                        </div>
                      </div>
                      {documentTypeToGenerate === 'ticket' && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          ✓
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                      {t('ticketOnlyDesc') || 'Vente directe au comptoir. Déstocke sans créer de facture dans la liste.'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDocumentTypeToGenerate('invoice');
                      localStorage.setItem('facturago_pos_doc_type', 'invoice');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      documentTypeToGenerate === 'invoice'
                        ? 'bg-emerald-50/85 border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          documentTypeToGenerate === 'invoice' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <FileText size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 leading-tight">
                            {t('officialInvoice') || 'Facture officielle'}
                          </p>
                          <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded mt-0.5">
                            {t('officialInvoiceBadge') || 'Ajoutée aux Factures'}
                          </span>
                        </div>
                      </div>
                      {documentTypeToGenerate === 'invoice' && (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          ✓
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                      {t('officialInvoiceDesc') || 'Crée et enregistre la facture dans la liste des Factures (Vente > Factures).'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mode de Paiement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Espèces', label: 'Espèces', icon: Banknote },
                    { id: 'Carte Bancaire', label: 'Carte (TPE)', icon: CreditCard },
                    { id: 'Virement', label: 'Virement', icon: Landmark },
                    { id: 'Chèque', label: 'Chèque', icon: FileText },
                    { id: 'Crédit', label: 'À terme / Crédit', icon: Clock }
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                        paymentMethod === method.id
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <method.icon size={20} className={paymentMethod === method.id ? 'text-emerald-600' : 'text-slate-400'} />
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Calculator (If Cash selected) */}
              {paymentMethod === 'Espèces' && (
                <div className="space-y-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  
                  {/* Quick Bill Denominations */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Billets Rapides :</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickCash(finalTotalTTC)}
                        className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 font-bold rounded-lg text-xs hover:bg-emerald-100 transition-colors"
                      >
                        Exact
                      </button>
                      {[20, 50, 100, 200, 500, 1000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleQuickCash(val)}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-emerald-50 transition-colors"
                        >
                          {val} {currency}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Received Input */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Montant Reçu ({currency})
                      </label>
                      <input
                        type="text"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Change Due Display */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Monnaie à Rendre
                      </label>
                      <div className={`px-3 py-2 rounded-xl font-mono font-black text-base flex items-center justify-between border ${
                        changeDue > 0 
                          ? 'bg-emerald-600 text-white border-emerald-700' 
                          : remainingDue > 0 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span>{changeDue.toFixed(2)}</span>
                        <span className="text-xs">{currency}</span>
                      </div>
                    </div>
                  </div>

                  {remainingDue > 0 && (
                    <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle size={14} />
                      Reste à régler : {remainingDue.toFixed(2)} {currency}
                    </p>
                  )}
                </div>
              )}

              {/* Notes or Ref Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note / Référence chèque / Observation (Optionnel)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ex: N° chèque 1234567, règlement partiel..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Optional Due Date Field */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-600" />
                    <span className="text-xs font-bold text-slate-700">
                      {language === 'ar' ? 'تاريخ الاستحقاق (اختياري)' : "Date d'échéance (Optionnelle)"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showDueDate}
                    onChange={(e) => {
                      setShowDueDate(e.target.checked);
                      if (e.target.checked && !posDueDate) {
                        setPosDueDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                </div>
                {showDueDate && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200">
                    <input
                      type="date"
                      value={posDueDate}
                      onChange={(e) => setPosDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Auto print Ticket Checkbox */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Printer size={16} className="text-slate-600" />
                  <span className="text-xs font-bold text-slate-700">Imprimer le ticket thermique</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={ticketWidth}
                    onChange={(e) => {
                      const w = e.target.value as '80mm' | '58mm';
                      setTicketWidth(w);
                      localStorage.setItem('thermal_ticket_width', w);
                    }}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1"
                  >
                    <option value="80mm">80 mm</option>
                    <option value="58mm">58 mm</option>
                  </select>
                  <input
                    type="checkbox"
                    checked={autoPrintTicket}
                    onChange={(e) => setAutoPrintTicket(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={isSubmitting}
                className={`px-6 py-2.5 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm shadow-md flex items-center gap-2 transition-all active:scale-[0.98] ${
                  documentTypeToGenerate === 'invoice'
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-600/20'
                }`}
              >
                {isSubmitting ? (
                  <span>Enregistrement...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>
                      {documentTypeToGenerate === 'invoice'
                        ? (t('validateAndInvoice') || 'Valider & Créer Facture')
                        : (t('validateAndTicket') || 'Valider & Imprimer Ticket')}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. SALE SUCCESS MODAL ================= */}
      {isSuccessModalOpen && lastInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${
              lastSaleWasInvoice ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}>
              {lastSaleWasInvoice ? <Check size={36} strokeWidth={3} /> : <Receipt size={32} />}
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold mb-1.5 uppercase tracking-wider">
                {lastSaleWasInvoice ? (
                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    ✓ {t('officialInvoiceBadge') || 'Facture enregistrée'}
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                    🧾 {t('ticketOnlyBadge') || 'Ticket seul (Sans facture)'}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {lastSaleWasInvoice 
                  ? (language === 'ar' ? 'تم إنشاء الوصل بنجاح !' : 'Bon Officiel Créé !')
                  : (language === 'ar' ? 'تم تسجيل البيع (تيكيت كاسة) !' : 'Vente Enregistrée (Ticket Seul) !')}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {lastSaleWasInvoice 
                  ? (language === 'ar' 
                      ? `تمت إضافة الوصل #${lastInvoice.documentId || lastInvoice.id} إلى لائحة الوصولات الخاصة بك.` 
                      : `Le Bon #${lastInvoice.documentId || lastInvoice.id} est maintenant consultable dans votre liste des Bons.`)
                  : (language === 'ar'
                      ? `تم خصم المخزون وتسجيل التيكيت #${lastInvoice.documentId || lastInvoice.id}. لم يتم إنشاء أي وصل في لائحة الوصولات.`
                      : `Stock mis à jour avec le ticket #${lastInvoice.documentId || lastInvoice.id}. Aucun bon n'a été ajouté à la liste des bons.`)}
              </p>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {lastInvoice.amount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}
              </p>
            </div>

            <div className={`grid ${lastSaleWasInvoice ? 'grid-cols-2' : 'grid-cols-1'} gap-2 pt-2`}>
              <button
                onClick={() => {
                  setThermalModalInvoice(lastInvoice);
                  setIsSuccessModalOpen(false);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 text-white font-bold rounded-xl text-xs shadow-sm transition-all ${
                  lastSaleWasInvoice ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <Printer size={16} />
                <span>Imprimer Ticket</span>
              </button>

              {lastSaleWasInvoice && (
                <button
                  onClick={() => {
                    setPreviewInvoice(lastInvoice);
                    setIsSuccessModalOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                >
                  <FileText size={16} />
                  <span>Voir Bon A4</span>
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setIsSuccessModalOpen(false);
                setLastInvoice(null);
                searchInputRef.current?.focus();
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Nouvelle Vente (F2)
            </button>
          </div>
        </div>
      )}

      {/* ================= 5. HELD / PARKED CARTS MODAL ================= */}
      {isHeldCartsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="text-sky-400" size={20} />
                <h3 className="font-bold text-base">Paniers en Attente ({heldCarts.length})</h3>
              </div>
              <button onClick={() => setIsHeldCartsOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              {heldCarts.length > 0 ? (
                heldCarts.map(cart => (
                  <div key={cart.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate">{cart.client.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {cart.date} • {cart.items.length} article(s)
                      </p>
                      <p className="text-xs font-extrabold text-emerald-600 mt-1">
                        {cart.totalTTC.toFixed(2)} {currency}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleResumeCart(cart)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                      >
                        <PlayCircle size={14} />
                        <span>Reprendre</span>
                      </button>
                      <button
                        onClick={() => handleDeleteHeldCart(cart.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <PauseCircle size={36} className="opacity-30 mx-auto mb-2" />
                  <p className="text-xs font-medium">Aucun panier mis en attente.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsHeldCartsOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. TODAY'S SALES HISTORY MODAL ================= */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="text-amber-400" size={20} />
                <h3 className="font-bold text-base">Historique des Ventes du Jour ({todaySalesStats.totalCount})</h3>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {todaySalesStats.combinedSales && todaySalesStats.combinedSales.length > 0 ? (
                todaySalesStats.combinedSales.map(sale => (
                  <div key={sale.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          #{sale.documentId}
                        </span>
                        {sale.isInvoice ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            📄 Bon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            🧾 Ticket seul
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                        {sale.clientName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {sale.lineItemsCount} article(s) • {sale.notes}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-extrabold text-sm text-slate-900">
                          {sale.amount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} {currency}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setThermalModalInvoice(sale.originalDoc);
                        }}
                        className="p-2 bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 rounded-xl transition-colors"
                        title="Réimprimer le ticket thermique"
                      >
                        <Printer size={16} />
                      </button>

                      {sale.isInvoice && (
                        <button
                          onClick={() => {
                            setPreviewInvoice(sale.originalDoc);
                          }}
                          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors"
                          title="Aperçu Bon PDF"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Receipt size={36} className="opacity-30 mx-auto mb-2" />
                  <p className="text-xs font-medium">Aucune vente enregistrée aujourd'hui.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. PRODUCT VARIANT PICKER MODAL ================= */}
      {variantModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{variantModalProduct.name}</h3>
                <p className="text-xs text-slate-400">Sélectionnez la déclinaison à ajouter au panier</p>
              </div>
              <button onClick={() => setVariantModalProduct(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {variantModalProduct.variants?.map(v => (
                <button
                  key={v.id}
                  onClick={() => {
                    handleAddToCart(variantModalProduct, v);
                    setVariantModalProduct(null);
                  }}
                  className="w-full p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200 hover:border-emerald-300 flex items-center justify-between transition-all text-left group"
                >
                  <div>
                    <p className="font-bold text-xs text-slate-800 group-hover:text-emerald-800">{v.name}</p>
                    <p className="text-[11px] text-slate-400">
                      Ref: {v.barcode || v.attributeValue || '-'} • Stock: {v.stockQuantity ?? 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-emerald-600">
                      {(v.salePrice !== undefined ? v.salePrice : variantModalProduct.salePrice).toFixed(2)} {currency}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. QUICK ITEM (ARTICLE LIBRE) MODAL ================= */}
      {isQuickItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <form onSubmit={handleAddQuickItem} className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Ajouter un Article Libre / Divers</h3>
              <button type="button" onClick={() => setIsQuickItemOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Désignation *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickItemName}
                  onChange={(e) => setQuickItemName(e.target.value)}
                  placeholder="Ex: Réparation, Article divers..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prix Unitaire *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickItemPrice}
                    onChange={(e) => setQuickItemPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={quickItemQty}
                    onChange={(e) => setQuickItemQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Taux TVA (%)</label>
                <select
                  value={quickItemVat}
                  onChange={(e) => setQuickItemVat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="0">0% (Exonéré)</option>
                  <option value="7">7%</option>
                  <option value="10">10%</option>
                  <option value="14">14%</option>
                  <option value="20">20% (Standard)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsQuickItemOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                Ajouter au panier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= 9. SCANNER MODAL (Camera/Manual) ================= */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          handleBarcodeScanned(code);
        }}
        title={language === 'ar' ? 'مسح باركود المنتج' : "Scanner le code-barres de l'article"}
        continuous={true}
      />

      {/* ================= 10. NEW CLIENT MODAL ================= */}
      <AddClientModal
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        onSave={async (clientData) => {
          await onAddClient(clientData);
          setIsNewClientOpen(false);
        }}
        clientToEdit={null}
      />

      {/* ================= 11. THERMAL TICKET PRINT MODAL ================= */}
      {thermalModalInvoice && (
        <ThermalTicketModal
          isOpen={true}
          onClose={() => setThermalModalInvoice(null)}
          document={thermalModalInvoice}
          settings={companySettings}
          recipient={clients.find(c => c.id === thermalModalInvoice.clientId) || selectedClient}
        />
      )}

      {/* ================= 12. A4 FACTURE PDF PREVIEW MODAL ================= */}
      {previewInvoice && (
        <DocumentPreviewModal
          isOpen={true}
          onClose={() => setPreviewInvoice(null)}
          type="Facture"
          doc={previewInvoice}
          settings={companySettings}
          recipient={clients.find(c => c.id === previewInvoice.clientId) || selectedClient}
        />
      )}
    </div>
  );
};

export default POS;
