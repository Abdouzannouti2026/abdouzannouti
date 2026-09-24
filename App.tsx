
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Files } from 'lucide-react';
import { Client, Product, Supplier, Quote, QuoteStatus, Invoice, InvoiceStatus, CompanySettings, Payment, StockMovement, DeliveryNote, PurchaseOrder, PurchaseOrderStatus, CreditNote, CreditNoteStatus, Expense, SalaryPayment, Employee, Attendance } from './types';
import { dbService, initDB, getCurrentUserAndCompany, resetDBCache } from './db';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { LanguageProvider } from './contexts/LanguageContext';
import { generateUUID } from './src/utils/uuid';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import InvoicesComponent from './components/Invoices';
import ClientsComponent from './components/Clients';
import SuppliersComponent from './components/Suppliers';
import ProductsComponent from './components/Products';
import Quotes from './components/Quotes';
import TemplateCustomizer from './components/TemplateCustomizer';
import StockManagement from './components/StockManagement';
import DeliveryNotesComponent from './components/DeliveryNotes';
import PurchaseOrders from './components/PurchaseOrders';
import CreditNotesComponent from './components/CreditNotes';
import PaymentTracking from './components/PaymentTracking';
import Statistics from './components/Statistics';
import Expenses from './components/Expenses';
import PersonnelManagement from './components/PersonnelManagement';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import UserProfile from './components/UserProfile';

const LoadingScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-emerald-200 rounded-2xl blur-xl opacity-40 animate-pulse"></div>
                <div className="relative h-24 w-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                    <Files size={48} />
                </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-4"><span>Facturago</span></h1>
            <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce"></div>
            </div>
            <p className="text-sm text-slate-400 font-medium"><span>Chargement de votre espace...</span></p>
        </div>
    </div>
);

const MainContent: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isPosRoute = location.pathname === '/pos';
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const initialRedirectDone = useRef(false);
    const loadStartedRef = useRef(false);

    useEffect(() => {
        if (!initialRedirectDone.current) {
            initialRedirectDone.current = true;
            // On refresh or first load, ensure user enters directly to /dashboard instead of /pos
            if (location.pathname === '/pos' || location.pathname === '/') {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [location.pathname, navigate]);

    useEffect(() => {
        const loadData = async (isRetry = false, silent = false) => {
            if (!silent) {
                setIsLoading(true);
            }
            setError(null);
            try {
                await initDB();
                
                // Sequential loading instead of Promise.all to avoid database overload and timeouts
                const clientsData = await dbService.clients.getAll().catch(e => { throw new Error(`Clients: ${e.message}`); });
                const productsData = await dbService.products.getAll().catch(e => { throw new Error(`Produits: ${e.message}`); });
                const suppliersData = await dbService.suppliers.getAll().catch(e => { throw new Error(`Fournisseurs: ${e.message}`); });
                const settingsData = await dbService.settings.get().catch(e => { console.warn("Paramètres fallback:", e); return null; });

                setClients(clientsData.sort((a,b) => (b.clientCode || '').localeCompare(a.clientCode || '')));
                setProducts(productsData.sort((a,b) => (b.productCode || '').localeCompare(a.productCode || '')));
                setSuppliers(suppliersData.sort((a,b) => (b.supplierCode || '').localeCompare(a.supplierCode || '')));
                setCompanySettings(settingsData);

                // Group 2: Main documents - Still sequential
                const quotesData = await dbService.quotes.getAll().catch(e => { throw new Error(`Devis: ${e.message}`); });
                const invoicesData = await dbService.invoices.getAll().catch(e => { throw new Error(`Factures: ${e.message}`); });
                const deliveryData = await dbService.deliveryNotes.getAll().catch(e => { throw new Error(`Bons de livraison: ${e.message}`); });
                const purchaseOrdersData = await dbService.purchaseOrders.getAll().catch(e => { throw new Error(`Commandes: ${e.message}`); });

                setQuotes(quotesData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setInvoices(invoicesData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setDeliveryNotes(deliveryData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setPurchaseOrders(purchaseOrdersData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));

                // Group 3: Secondary data - Sequential for stability
                try {
                    const creditNotesData = await dbService.creditNotes.getAll().catch(e => { console.warn("CreditNotes load failed", e); return []; });
                    const paymentsData = await dbService.payments.getAll().catch(e => { console.warn("Payments load failed", e); return []; });
                    const movementsData = await dbService.stockMovements.getAll().catch(e => { console.warn("Mouvements Stock load failed", e); return []; });
                    const expensesData = await dbService.expenses.getAll().catch(e => { console.warn("Dépenses load failed", e); return []; });
                    const salaryPaymentsData = await dbService.salaryPayments.getAll().catch(e => { console.warn("SalaryPayments load failed", e); return []; });
                    const employeesData = await dbService.employees.getAll().catch(e => { console.warn("Employees load failed", e); return []; });
                    const attendancesData = await dbService.attendances.getAll().catch(e => { console.warn("Attendances load failed", e); return []; });

                    setCreditNotes(creditNotesData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                    setPayments(paymentsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setStockMovements(movementsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setExpenses(expensesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setSalaryPayments(salaryPaymentsData.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()));
                    setEmployees(employeesData);
                    setAttendances(attendancesData);
                } catch (secondaryErr) {
                    console.warn("Some secondary data failed to load, but continuing...", secondaryErr);
                }
            } catch (err: any) {
                console.error("Failed to load data:", err);
                
                // Handle JWT expiration specifically
                if (!isRetry && (err?.message?.includes('JWT') || err?.message?.includes('expired') || err?.message?.includes('refresh'))) {
                    console.warn("Auth token expired in loadData, cleaning up session...");
                    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                }
                
                setError(err.message || "Impossible de charger les données.");
            } finally {
                if (!silent) {
                    setIsLoading(false);
                }
            }
        };
        if (!loadStartedRef.current) {
            loadStartedRef.current = true;
            loadData();
        }
        
        const handleRefresh = (e?: any) => {
            const silent = e?.detail?.silent !== false;
            loadData(false, silent);
        };
        window.addEventListener('refreshAppData', handleRefresh);
        return () => window.removeEventListener('refreshAppData', handleRefresh);
    }, []);

    const updateCompanySettings = async (settings: CompanySettings) => {
        try {
            const updatedSettings = await dbService.settings.update(settings);
            setCompanySettings(updatedSettings);
        } catch (err: any) { 
            console.error("Save failed:", err);
            alert("Save failed\n" + (err.message || "Unknown error"));
            throw err;
        }
    };

    const getNextCode = (prefix: 'C' | 'P' | 'F', items: { clientCode?: string; productCode?: string; supplierCode?: string }[]) => {
        if (items.length === 0) return `${prefix}${(1).toString().padStart(3, '0')}`;
        const codes = items.map(item => {
            let code;
            if (prefix === 'C') code = item.clientCode;
            else if (prefix === 'P') code = item.productCode;
            else if (prefix === 'F') code = item.supplierCode;
            return parseInt(code?.substring(prefix.length) || '0', 10);
        });
        const maxCode = Math.max(0, ...codes);
        return `${prefix}${(maxCode + 1).toString().padStart(3, '0')}`;
    };

    const generateDocumentId = (type: 'quote' | 'invoice' | 'purchaseOrder' | 'deliveryNote' | 'creditNote', currentItems: { id: string, documentId?: string }[], forcedRank?: number, overrideYear?: number) => {
        const currentYear = overrideYear || new Date().getFullYear();
        const configKeys: Record<string, keyof CompanySettings> = {
            invoice: 'invoiceNumbering',
            quote: 'quoteNumbering',
            deliveryNote: 'deliveryNoteNumbering',
            purchaseOrder: 'purchaseOrderNumbering',
            creditNote: 'creditNoteNumbering'
        };
        const config = companySettings?.[configKeys[type]] as any;
        if (config) {
            const customPrefix = config.prefix || '';
            const sep = config.separator || '/';
            let yearStr = '';
            if (config.yearFormat === 'YYYY') yearStr = String(currentYear);
            else if (config.yearFormat === 'YY') yearStr = String(currentYear).slice(-2);
            const pattern = yearStr ? `${customPrefix}${sep}${yearStr}${sep}` : `${customPrefix}${sep}`;
            
            let nextNumber;
            if (forcedRank !== undefined) {
                nextNumber = (config.startNumber || 1) + forcedRank - 1;
            } else {
                const numbers = currentItems.map(item => {
                    const idToCheck = item.documentId || item.id;
                    if (idToCheck && idToCheck.startsWith(pattern)) {
                        const numberPart = idToCheck.replace(pattern, '');
                        return !isNaN(Number(numberPart)) ? parseInt(numberPart, 10) : 0;
                    }
                    return 0;
                });
                const maxExisting = numbers.length > 0 ? Math.max(...numbers) : 0;
                nextNumber = Math.max(config.startNumber || 1, maxExisting + 1);
            }
            return `${pattern}${String(nextNumber).padStart(config.padding || 5, '0')}`;
        }
        let prefix = '';
        switch (type) {
            case 'invoice': prefix = 'FAC'; break;
            case 'quote': prefix = 'DEV'; break;
            case 'deliveryNote': prefix = 'BL'; break;
            case 'purchaseOrder': prefix = 'BC'; break;
            case 'creditNote': prefix = 'AV'; break;
            default: prefix = 'DOC';
        }
        const pattern = `${prefix}/${currentYear}/`;
        let nextNumber;
        if (forcedRank !== undefined) {
            nextNumber = forcedRank;
        } else {
            const numbers = currentItems.map(item => {
                const idToCheck = item.documentId || item.id;
                if (idToCheck && idToCheck.startsWith(pattern)) {
                    const numberPart = idToCheck.replace(pattern, '');
                    return !isNaN(Number(numberPart)) ? parseInt(numberPart, 10) : 0;
                }
                return 0;
            });
            nextNumber = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
            if (nextNumber === 1 && currentItems.length > 0) {
                nextNumber = currentItems.length + 1;
            }
        }
        return `${pattern}${nextNumber.toString().padStart(5, '0')}`;
    };

    const resequenceDocumentIds = async (type: 'invoice' | 'quote' | 'deliveryNote' | 'purchaseOrder' | 'creditNote', itemsAfterDeletion: any[]) => {
        // 1. Filter out items that are NOT from the current year to avoid mixing sequences
        // Actually, for simplicity we sort ALL of them by date. 
        // If they have distinct years, the generateDocumentId (based on current date) might be problematic.
        // But usually people only delete recent ones.
        
        // Sorting items by date ASC then by current documentId to maintain relative order
        const sorted = [...itemsAfterDeletion].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return (a.documentId || '').localeCompare(b.documentId || '');
        });

        const updates: any[] = [];
        const paymentUpdates: Payment[] = [];

        for (let i = 0; i < sorted.length; i++) {
            const item = sorted[i];
            const newRank = i + 1;
            const docYear = item.date ? new Date(item.date).getFullYear() : new Date().getFullYear();
            const newDocId = generateDocumentId(type, [], newRank, docYear);

            if (item.documentId !== newDocId) {
                const updatedItem = { ...item, documentId: newDocId };
                updates.push(updatedItem);
                
                // Special case: update related payments if invoice
                if (type === 'invoice') {
                    const relatedPayments = payments.filter(p => p.invoiceId === item.id);
                    relatedPayments.forEach(p => {
                        if (p.invoiceNumber !== newDocId) {
                            paymentUpdates.push({ ...p, invoiceNumber: newDocId });
                        }
                    });
                }
            }
        }

        if (updates.length > 0) {
            try {
                // Batch updates in database
                const storeName = type === 'purchaseOrder' ? 'purchaseOrders' : type + 's';
                await (dbService[storeName] as any).bulkUpdate(updates);
                
                if (paymentUpdates.length > 0) {
                    await dbService.payments.bulkUpdate(paymentUpdates);
                    setPayments(prev => {
                        const newPayments = [...prev];
                        paymentUpdates.forEach(upd => {
                            const idx = newPayments.findIndex(p => p.id === upd.id);
                            if (idx !== -1) newPayments[idx] = upd;
                        });
                        return newPayments;
                    });
                }

                // Update UI state
                const setters: Record<string, any> = {
                    invoice: setInvoices,
                    quote: setQuotes,
                    deliveryNote: setDeliveryNotes,
                    purchaseOrder: setPurchaseOrders,
                    creditNote: setCreditNotes
                };
                
                setters[type](prev => {
                    const newState = [...prev];
                    updates.forEach(upd => {
                        const idx = newState.findIndex(it => it.id === upd.id);
                        if (idx !== -1) newState[idx] = upd;
                    });
                    // Re-sort by documentId DESC for standard display
                    return newState.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id));
                });

            } catch (err) {
                console.error(`Failed to resequence ${type}:`, err);
            }
        }
    };

    const addClient = async (client: Omit<Client, 'id' | 'clientCode'>) => {
        const newClient = { id: generateUUID(), clientCode: getNextCode('C', clients), ...client };
        await dbService.clients.add(newClient);
        setClients(prev => [newClient, ...prev].sort((a,b) => (b.clientCode || '').localeCompare(a.clientCode || '')));
    };
    const updateClient = async (updatedClient: Client) => {
        await dbService.clients.update(updatedClient);
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    };
    const deleteClient = async (clientIds: string | string[]) => {
        try {
            await dbService.clients.delete(clientIds);
            setClients(prev => prev.filter(c => Array.isArray(clientIds) ? !clientIds.includes(c.id) : c.id !== clientIds));
        } catch (error) {
            console.error('Error deleting client(s):', error);
        }
    };

    const updateProductStock = async (productId: string, quantityChange: number, variantId?: string) => {
        try {
            const product = await dbService.products.getById(productId);
            if(product) {
                let updatedProduct = { ...product };
                if (variantId && product.hasVariants && product.variants) {
                    updatedProduct.variants = product.variants.map(v => 
                        v.id === variantId ? { ...v, stockQuantity: (v.stockQuantity || 0) + quantityChange } : v
                    );
                    // Recompute total stock from variants
                    updatedProduct.stockQuantity = updatedProduct.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
                } else {
                    updatedProduct.stockQuantity = (product.stockQuantity || 0) + quantityChange;
                }
                await dbService.products.update(updatedProduct);
                setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
            }
        } catch (error) {
            console.error("Error updating product stock:", error);
        }
    };
    const addStockMovement = async (movement: Omit<StockMovement, 'id'>) => {
        const newMovement = { id: generateUUID(), ...movement };
        await dbService.stockMovements.add(newMovement);
        setStockMovements(prev => [newMovement, ...prev]);
        await updateProductStock(movement.productId, movement.quantity, movement.variantId);
    };
    const addProducts = async (productsToImport: Omit<Product, 'id'>[]) => {
        try {
            let lastCode = 0;
            const prefix = 'P';
            
            // Find the highest numeric part in existing product codes
            products.forEach(p => {
                if (p.productCode && p.productCode.startsWith(prefix)) {
                    const num = parseInt(p.productCode.split('-')[1]);
                    if (!isNaN(num) && num > lastCode) lastCode = num;
                }
            });

            const productsWithIds: Product[] = productsToImport.map((p) => {
                let code = p.productCode;
                if (!code) {
                    lastCode++;
                    code = `${prefix}-${String(lastCode).padStart(4, '0')}`;
                }
                
                return {
                    id: generateUUID(),
                    productCode: code,
                    createdAt: new Date().toISOString().split('T')[0],
                    ...p
                };
            });

            // Use larger chunks for products themselves
            const savedProducts = await dbService.bulkAdd<Product>('products', productsWithIds);
            
            // Create stock movements for products with stock
            const movements: StockMovement[] = savedProducts
                .filter(p => p.stockQuantity && p.stockQuantity > 0)
                .map(p => ({
                    id: generateUUID(),
                    productId: p.id,
                    productName: p.name,
                    date: new Date().toISOString().split('T')[0],
                    quantity: p.stockQuantity!,
                    type: 'Initial' as const,
                    reference: 'Import'
                }));

            if (movements.length > 0) {
                await dbService.bulkAdd('stock_movements', movements);
            }

            setProducts(prev => [...savedProducts, ...prev].sort((a,b) => (b.productCode || '').localeCompare(a.productCode || '')));
            
            // Update stock movements list without full reload if possible, 
            // but for safety in large imports, a background refresh is good
            dbService.stockMovements.getAll().then(data => {
                setStockMovements(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            });
            
            return savedProducts;
        } catch (error: any) {
            console.error("Error in bulk add products:", error);
            const currentLang = localStorage.getItem('app_language') || 'fr';
            alert(currentLang === 'fr' 
                ? "Erreur lors de l'importation massive. Vérifiez que les codes produits sont uniques." 
                : "Error during bulk import. Ensure product codes are unique.");
            throw error;
        }
    };

    const addProduct = async (product: Omit<Product, 'id'>) => {
        const { stockQuantity, ...productData } = product;
        const newId = generateUUID();
        const newProduct: Product = { 
            id: newId, 
            productCode: product.productCode || getNextCode('P', products), 
            createdAt: new Date().toISOString().split('T')[0],
            stockQuantity: stockQuantity || 0,
            ...productData 
        };

        // Enregistrer le produit avec son stock initial direct
        await dbService.products.add(newProduct);
        
        // Mettre à jour l'état immédiatement avec la quantité correcte
        setProducts(prev => [newProduct, ...prev].sort((a,b) => (b.productCode || '').localeCompare(a.productCode || '')));
        
        if(stockQuantity && stockQuantity > 0) {
            // Ajouter le mouvement de stock sans appeler updateProductStock pour éviter le doublement
            const movement: StockMovement = {
                id: generateUUID(),
                productId: newId,
                productName: newProduct.name,
                date: new Date().toISOString().split('T')[0],
                quantity: stockQuantity,
                type: 'Initial',
                reference: 'Creation'
            };
            await dbService.stockMovements.add(movement);
            setStockMovements(prev => [movement, ...prev]);
        }
    };
    const updateProduct = async (updatedProduct: Product) => {
        await dbService.products.update(updatedProduct);
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    };
    const deleteProducts = async (productIds: string | string[]) => {
        const ids = Array.isArray(productIds) ? productIds : [productIds];
        if (ids.length === 0) return;

        const deletedIds: string[] = [];
        const failedIds: string[] = [];

        try {
            // First, delete related stock movements to avoid foreign key constraints
            // We do this in chunks too to be safe
            const movementChunkSize = 20;
            for (let i = 0; i < ids.length; i += movementChunkSize) {
                const chunk = ids.slice(i, i + movementChunkSize);
                try {
                    await dbService.stockMovements.deleteByProduct(chunk);
                } catch (err) {
                    console.warn(`Failed to clean up stock movements for chunk starting at ${i}`, err);
                }
            }

            // Try deleting products in smaller chunks to isolate failures
            const productChunkSize = 20; 
            for (let i = 0; i < ids.length; i += productChunkSize) {
                const chunk = ids.slice(i, i + productChunkSize);
                try {
                    await dbService.products.delete(chunk);
                    deletedIds.push(...chunk);
                } catch (bulkError: any) {
                    console.warn(`Bulk/Chunked delete failed for chunk starting at ${i}, falling back to individual deletes for this chunk`, bulkError);
                    
                    // Fallback: try one by one for this chunk
                    for (const id of chunk) {
                        try {
                            // Try cleaning movements one last time for this specific ID
                            await dbService.stockMovements.deleteByProduct(id);
                            await dbService.products.delete(id);
                            deletedIds.push(id);
                        } catch (individualError: any) {
                            console.error(`Individual delete failed for product ${id}:`, individualError);
                            failedIds.push(id);
                        }
                    }
                }
            }

            if (deletedIds.length > 0) {
                setProducts(prev => prev.filter(p => !deletedIds.includes(p.id)));
            }

            if (failedIds.length > 0) {
                const currentLang = localStorage.getItem('app_language') || 'fr';
                const msg = currentLang === 'fr' 
                    ? `${deletedIds.length} produits supprimés. ${failedIds.length} n'ont pas pu être supprimés (utilisés dans des documents).`
                    : `${deletedIds.length} products deleted. ${failedIds.length} could not be deleted (referenced in documents).`;
                alert(msg);
            }
        } catch (error: any) {
            console.error('Error in deletion process:', error);
            alert("Une erreur est survenue lors de la suppression.");
        }
    };

    const addSupplier = async (supplier: Omit<Supplier, 'id' | 'supplierCode'>) => {
        const newSupplier = { id: generateUUID(), supplierCode: getNextCode('F', suppliers), ...supplier };
        await dbService.suppliers.add(newSupplier);
        setSuppliers(prev => [newSupplier, ...prev].sort((a,b) => (b.supplierCode || '').localeCompare(a.supplierCode || '')));
    };
    const updateSupplier = async (updatedSupplier: Supplier) => {
        await dbService.suppliers.update(updatedSupplier);
        setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    };
    const deleteSupplier = async (supplierIds: string | string[]) => {
        try {
            await dbService.suppliers.delete(supplierIds);
            setSuppliers(prev => prev.filter(s => Array.isArray(supplierIds) ? !supplierIds.includes(s.id) : s.id !== supplierIds));
        } catch (error) {
            console.error('Error deleting supplier(s):', error);
        }
    };

    const addQuote = async (quoteData: any) => {
        try {
            const documentId = quoteData.documentId || generateDocumentId('quote', quotes);
            const { totalAmount, ...cleanQuoteData } = quoteData;
            const newQuote: Quote = { 
                id: generateUUID(), 
                documentId: documentId, 
                amount: quoteData.amount || (quoteData.subTotal + quoteData.vatAmount), 
                ...cleanQuoteData 
            };
            await dbService.quotes.add(newQuote);
            setQuotes(prev => [newQuote, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
        } catch (e: any) {
            console.error("Error creating quote", e);
            alert("Erreur création devis: " + e.message);
            throw e;
        }
    };
    const updateQuote = async (updatedQuote: Quote) => {
        try {
            const savedQuote = await dbService.quotes.update(updatedQuote);
            setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? savedQuote : q));
        } catch (e: any) {
            console.error("Error updating quote", e);
            alert("Erreur mise à jour devis: " + e.message);
        }
    };
    const updateQuoteStatus = async (quoteId: string, newStatus: QuoteStatus) => {
        const quoteToUpdate = quotes.find(q => q.id === quoteId);
        if (quoteToUpdate) {
            const updatedQuote = { ...quoteToUpdate, status: newStatus };
            await dbService.quotes.update(updatedQuote);
            setQuotes(prev => prev.map(q => q.id === quoteId ? updatedQuote : q));
        }
    };
    const deleteQuote = async (quoteId: string) => {
        try {
            await dbService.quotes.delete(quoteId);
            const remaining = quotes.filter(q => q.id !== quoteId);
            setQuotes(remaining);
            await resequenceDocumentIds('quote', remaining);
        } catch (e: any) {
            alert("Erreur suppression devis: " + e.message);
        }
    };

    const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'amount' | 'amountPaid'> & { initialPayment?: any }) => {
        try {
            const { initialPayment, ...invoiceFields } = invoiceData;
            const documentId = invoiceFields.documentId || generateDocumentId('invoice', invoices);
            const newInvoice: Invoice = { id: generateUUID(), documentId: documentId, amount: invoiceFields.subTotal + invoiceFields.vatAmount, amountPaid: initialPayment ? initialPayment.amount : 0, ...invoiceFields };
            
            // Update stock if not draft
            if (newInvoice.status !== InvoiceStatus.Draft) {
                const stockChanges: Map<string, { qty: number, productId: string, variantId?: string, name: string }> = new Map();
                for (const item of newInvoice.lineItems) {
                    if (item.productId) {
                        const key = `${item.productId}-${item.variantId || 'base'}`;
                        const current = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
                        current.qty += item.quantity;
                        stockChanges.set(key, current);
                    }
                }
                const changes = Array.from(stockChanges.values());
                for (const change of changes) {
                    await addStockMovement({
                        productId: change.productId,
                        variantId: change.variantId,
                        productName: change.name,
                        date: newInvoice.date,
                        quantity: -change.qty,
                        type: 'Vente',
                        reference: `Facture ${newInvoice.documentId || newInvoice.id}`
                    });
                }
            }

            await dbService.invoices.add(newInvoice);
            setInvoices(prev => [newInvoice, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            if (initialPayment && initialPayment.amount > 0) {
                 const newPayment: Payment = { id: generateUUID(), invoiceId: newInvoice.id, invoiceNumber: newInvoice.documentId || newInvoice.id, clientId: newInvoice.clientId, clientName: newInvoice.clientName, date: initialPayment.date, amount: initialPayment.amount, method: initialPayment.method, notes: 'Règlement à la création' };
                await dbService.payments.add(newPayment);
                setPayments(prev => [newPayment, ...prev]);
            }
            return newInvoice;
        } catch (e: any) {
            console.error("Error creating invoice", e);
            alert("Erreur création facture: " + e.message);
            throw e;
        }
    };
    const updateInvoice = async (invoiceData: Invoice & { initialPayment?: any }, id: string) => {
        try {
            const existingInvoice = invoices.find(i => i.id === id);
            if (!existingInvoice) return;
            const { initialPayment, ...invoiceFields } = invoiceData;
            const updatedInvoice: Invoice = { 
                ...existingInvoice, 
                ...invoiceFields,
                date: invoiceFields.date || existingInvoice.date
            };
            updatedInvoice.id = id; 

            // Handle stock changes
            const hasRelatedBL = deliveryNotes.some(dn => 
                (dn.invoiceId && dn.invoiceId === existingInvoice.id) || 
                (dn.invoiceId && existingInvoice.documentId && dn.invoiceId === existingInvoice.documentId)
            );
            
            if (!hasRelatedBL) {
                const stockChanges: Map<string, { qty: number, productId: string, variantId?: string, name: string }> = new Map();
                
                // 1. Calculate restoration of old quantities if it was not a draft
                if (existingInvoice.status !== InvoiceStatus.Draft) {
                    existingInvoice.lineItems.forEach(item => {
                        if (item.productId) {
                            const key = `${item.productId}-${item.variantId || 'base'}`;
                            const current = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
                            current.qty += item.quantity;
                            stockChanges.set(key, current);
                        }
                    });
                }

                // 2. Calculate deduction of new quantities if it is not a draft
                if (updatedInvoice.status !== InvoiceStatus.Draft) {
                    updatedInvoice.lineItems.forEach(item => {
                        if (item.productId) {
                            const key = `${item.productId}-${item.variantId || 'base'}`;
                            const current = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
                            current.qty -= item.quantity;
                            stockChanges.set(key, current);
                        }
                    });
                }

                // 3. Apply net changes sequentially
                const changes = Array.from(stockChanges.values());
                for (const change of changes) {
                    if (Math.abs(change.qty) > 0.000001) {
                        await addStockMovement({
                            productId: change.productId,
                            variantId: change.variantId,
                            productName: change.name,
                            date: updatedInvoice.date,
                            quantity: change.qty, // positive if added back, negative if removed
                            type: change.qty > 0 ? 'Retour' : 'Vente',
                            reference: `Modif Facture ${updatedInvoice.documentId || updatedInvoice.id}`
                        });
                    }
                }
            }

            const savedInvoice = await dbService.invoices.update(updatedInvoice);
            setInvoices(prev => prev.map(inv => inv.id === id ? savedInvoice : inv));
            if (initialPayment && initialPayment.amount > 0) {
                 const newPayment: Payment = { id: generateUUID(), invoiceId: id, invoiceNumber: updatedInvoice.documentId || updatedInvoice.id, clientId: updatedInvoice.clientId, clientName: updatedInvoice.clientName, date: initialPayment.date, amount: initialPayment.amount, method: initialPayment.method, notes: 'Règlement ajouté lors de la modification' };
                await dbService.payments.add(newPayment);
                setPayments(prev => [newPayment, ...prev]);
            }
        } catch (e: any) {
            console.error("Error updating invoice", e);
            alert("Erreur mise à jour facture: " + e.message);
            throw e;
        }
    };
    const deleteInvoice = async (invoiceId: string) => {
        try {
            const invoiceToDelete = invoices.find(inv => inv.id === invoiceId);
            if (invoiceToDelete && invoiceToDelete.status !== InvoiceStatus.Draft) {
                // Restore stock ONLY if no active Delivery Note (BL) exists for this invoice
                // (because if a BL exists, it's the one responsible for the stock deduction/holding)
                const hasRelatedBL = deliveryNotes.some(dn => 
                    (dn.invoiceId && dn.invoiceId === invoiceToDelete.id) || 
                    (dn.invoiceId && invoiceToDelete.documentId && dn.invoiceId === invoiceToDelete.documentId)
                );
                
                if (!hasRelatedBL) {
                    // Restore stock
                    for (const item of invoiceToDelete.lineItems) {
                        if (item.productId) {
                            await addStockMovement({
                                productId: item.productId,
                                variantId: item.variantId,
                                productName: item.name,
                                date: new Date().toISOString().split('T')[0],
                                quantity: item.quantity,
                                type: 'Retour',
                                reference: `Suppr Facture ${invoiceToDelete.documentId || invoiceToDelete.id}`
                            });
                        }
                    }
                }
            }

            const relatedPayments = payments.filter(p => p.invoiceId === invoiceId);
            for(const p of relatedPayments) {
                await dbService.payments.delete(p.id);
            }

            const relatedCreditNotes = creditNotes.filter(cn => cn.invoiceId === invoiceId);
            for(const cn of relatedCreditNotes) {
                await dbService.creditNotes.delete(cn.id);
            }

            await dbService.invoices.delete(invoiceId);
            setPayments(prev => prev.filter(p => p.invoiceId !== invoiceId));
            setCreditNotes(prev => prev.filter(cn => cn.invoiceId !== invoiceId));
            
            const remaining = invoices.filter(inv => inv.id !== invoiceId);
            setInvoices(remaining);
            await resequenceDocumentIds('invoice', remaining);
        } catch (e: any) {
            alert("Erreur suppression facture: " + e.message);
        }
    };

    const addPayment = async (paymentData: Omit<Payment, 'id'>) => {
        try {
            const newPayment = { id: generateUUID(), ...paymentData };
            await dbService.payments.add(newPayment);
            setPayments(prev => [newPayment, ...prev]);
            const invoice = invoices.find(inv => inv.id === paymentData.invoiceId);
            if (invoice) {
                const newAmountPaid = (invoice.amountPaid || 0) + paymentData.amount;
                let newStatus = invoice.status;
                if (newAmountPaid >= invoice.amount - 0.1) {
                    newStatus = InvoiceStatus.Paid;
                } else if (newAmountPaid > 0) {
                    newStatus = InvoiceStatus.Partial;
                }
                const updatedInvoice = { ...invoice, amountPaid: newAmountPaid, status: newStatus, paymentDate: newStatus === InvoiceStatus.Paid ? paymentData.date : invoice.paymentDate };
                await dbService.invoices.update(updatedInvoice);
                setInvoices(prev => prev.map(inv => inv.id === invoice.id ? updatedInvoice : inv));
            }
        } catch (e: any) {
            console.error("Error adding payment", e);
            alert("Erreur ajout paiement: " + e.message);
            throw e;
        }
    };
    const updateInvoiceStatus = async (invoiceId: string, newStatus: InvoiceStatus) => {
        const invoiceToUpdate = invoices.find(inv => inv.id === invoiceId);
        if (invoiceToUpdate) {
            const oldStatus = invoiceToUpdate.status;
            const updatedInvoice = { ...invoiceToUpdate, status: newStatus };

            // Handle stock changes
            if (oldStatus === InvoiceStatus.Draft && newStatus !== InvoiceStatus.Draft) {
                // Check if a Delivery Note (BL) already exists for this invoice. 
                // If it does, the BL already handled the stock deduction.
                const hasRelatedBL = deliveryNotes.some(dn => 
                    (dn.invoiceId && dn.invoiceId === invoiceToUpdate.id) || 
                    (dn.invoiceId && invoiceToUpdate.documentId && dn.invoiceId === invoiceToUpdate.documentId)
                );
                
                if (!hasRelatedBL) {
                    // Deduct stock
                    for (const item of updatedInvoice.lineItems) {
                        if (item.productId) {
                            await addStockMovement({
                                productId: item.productId,
                                variantId: item.variantId,
                                productName: item.name,
                                date: new Date().toISOString().split('T')[0],
                                quantity: -item.quantity,
                                type: 'Vente',
                                reference: `Validation Facture ${updatedInvoice.documentId || updatedInvoice.id}`
                            });
                        }
                    }
                }
            } else if (oldStatus !== InvoiceStatus.Draft && newStatus === InvoiceStatus.Draft) {
                // Restore stock
                for (const item of updatedInvoice.lineItems) {
                    if (item.productId) {
                        await addStockMovement({
                            productId: item.productId,
                            variantId: item.variantId,
                            productName: item.name,
                            date: new Date().toISOString().split('T')[0],
                            quantity: item.quantity,
                            type: 'Retour',
                            reference: `Brouillon Facture ${updatedInvoice.documentId || updatedInvoice.id}`
                        });
                    }
                }
            }

            await dbService.invoices.update(updatedInvoice);
            setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
        }
    };
    const createInvoiceFromQuote = async (quoteId: string) => {
        const quote = quotes.find(q => q.id === quoteId);
        if (!quote) return;
        try {
            const documentId = generateDocumentId('invoice', invoices);
            const newInvoiceData: Invoice = { id: generateUUID(), documentId: documentId, quoteId: quote.id, clientId: quote.clientId, clientName: quote.clientName, date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: InvoiceStatus.Pending, subject: quote.subject, reference: quote.reference, purchaseOrderNumber: quote.purchaseOrderNumber, lineItems: quote.lineItems, subTotal: quote.subTotal, vatAmount: quote.vatAmount, amount: quote.amount, amountPaid: 0 };
            
            // Deduct stock if not draft
            if (newInvoiceData.status !== InvoiceStatus.Draft) {
                const stockChanges: Map<string, { qty: number, productId: string, variantId?: string, name: string }> = new Map();
                for (const item of newInvoiceData.lineItems) {
                    if (item.productId) {
                        const key = `${item.productId}-${item.variantId || 'base'}`;
                        const current = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
                        current.qty += item.quantity;
                        stockChanges.set(key, current);
                    }
                }
                const changes = Array.from(stockChanges.values());
                for (const change of changes) {
                    await addStockMovement({
                        productId: change.productId,
                        variantId: change.variantId,
                        productName: change.name,
                        date: newInvoiceData.date,
                        quantity: -change.qty,
                        type: 'Vente',
                        reference: `Facture ${newInvoiceData.documentId || newInvoiceData.id} (depuis Devis)`
                    });
                }
            }

            await dbService.invoices.add(newInvoiceData);
            setInvoices(prev => [newInvoiceData, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            await updateQuoteStatus(quoteId, QuoteStatus.Converted);
        } catch (e: any) {
            alert("Erreur conversion: " + e.message);
        }
    };

    const addCreditNote = async (creditNoteData: Omit<CreditNote, 'id'>) => {
        try {
            const documentId = creditNoteData.documentId || generateDocumentId('creditNote', creditNotes);
            
            // Map items and ensure productId is resolved from catalog if missing
            const enrichedLineItems = creditNoteData.lineItems.map(item => {
                if (item.productId) return item;
                const matchingProduct = products.find(p => 
                    (item.productCode && p.productCode === item.productCode) || 
                    (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
                );
                return matchingProduct ? { ...item, productId: matchingProduct.id } : item;
            });

            const newCreditNote: CreditNote = { 
                id: generateUUID(), 
                documentId: documentId, 
                returnToStock: creditNoteData.returnToStock !== false,
                ...creditNoteData,
                lineItems: enrichedLineItems
            };

            // Reintegrate stock if the credit note is Validated or Refunded and returnToStock is true
            if (newCreditNote.returnToStock !== false && 
               (newCreditNote.status === CreditNoteStatus.Validated || newCreditNote.status === CreditNoteStatus.Refunded)) {
                for (const item of newCreditNote.lineItems) {
                    if (item.productId && item.quantity > 0) {
                        await addStockMovement({
                            productId: item.productId,
                            variantId: item.variantId,
                            productName: item.name,
                            date: newCreditNote.date,
                            quantity: item.quantity, // POSITIVE = IN (Stock restored to inventory)
                            type: 'Retour',
                            reference: `Avoir ${newCreditNote.documentId || newCreditNote.id}`
                        });
                    }
                }
            }

            await dbService.creditNotes.add(newCreditNote);
            setCreditNotes(prev => [newCreditNote, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            return newCreditNote;
        } catch (e: any) {
            console.error("Error creating credit note", e);
            alert("Erreur création avoir: " + e.message);
            throw e;
        }
    };
    const updateCreditNote = async (updatedCreditNote: CreditNote) => {
        try {
            const existingCn = creditNotes.find(c => c.id === updatedCreditNote.id);
            if (!existingCn) return;

            // Ensure line items have resolved product IDs
            const enrichedItems = updatedCreditNote.lineItems.map(item => {
                if (item.productId) return item;
                const matchingProduct = products.find(p => 
                    (item.productCode && p.productCode === item.productCode) || 
                    (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
                );
                return matchingProduct ? { ...item, productId: matchingProduct.id } : item;
            });
            updatedCreditNote.lineItems = enrichedItems;

            const wasRestocked = existingCn.returnToStock !== false && 
                (existingCn.status === CreditNoteStatus.Validated || existingCn.status === CreditNoteStatus.Refunded);
            const willBeRestocked = updatedCreditNote.returnToStock !== false && 
                (updatedCreditNote.status === CreditNoteStatus.Validated || updatedCreditNote.status === CreditNoteStatus.Refunded);

            const stockChanges: Map<string, { qty: number, productId: string, variantId?: string, name: string }> = new Map();

            // 1. If was previously restocked, subtract old quantities
            if (wasRestocked) {
                existingCn.lineItems.forEach(item => {
                    if (item.productId) {
                        const key = `${item.productId}-${item.variantId || 'base'}`;
                        const cur = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
                        cur.qty -= item.quantity;
                        stockChanges.set(key, cur);
                    }
                });
            }

            // 2. If will be restocked, add new quantities
            if (willBeRestocked) {
                updatedCreditNote.lineItems.forEach(item => {
                    if (item.productId) {
                        const key = `${item.productId}-${item.variantId || 'base'}`;
                        const cur = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
                        cur.qty += item.quantity;
                        stockChanges.set(key, cur);
                    }
                });
            }

            // 3. Apply net stock changes
            const changes = Array.from(stockChanges.values());
            for (const change of changes) {
                if (Math.abs(change.qty) > 0.000001) {
                    await addStockMovement({
                        productId: change.productId,
                        variantId: change.variantId,
                        productName: change.name,
                        date: updatedCreditNote.date,
                        quantity: change.qty, // positive = more returned to stock, negative = removed
                        type: change.qty > 0 ? 'Retour' : 'Ajustement',
                        reference: `Modif Avoir ${updatedCreditNote.documentId || updatedCreditNote.id}`
                    });
                }
            }

            const savedCreditNote = await dbService.creditNotes.update(updatedCreditNote);
            setCreditNotes(prev => prev.map(cn => cn.id === updatedCreditNote.id ? savedCreditNote : cn));
        } catch (e: any) {
            console.error("Error updating credit note", e);
            alert("Erreur mise à jour avoir: " + e.message);
        }
    };
    const deleteCreditNote = async (id: string) => {
        try {
            const cnToDelete = creditNotes.find(c => c.id === id);
            if (cnToDelete && cnToDelete.returnToStock !== false && 
               (cnToDelete.status === CreditNoteStatus.Validated || cnToDelete.status === CreditNoteStatus.Refunded)) {
                // Cancel stock return by subtracting the returned items
                for (const item of cnToDelete.lineItems) {
                    if (item.productId && item.quantity > 0) {
                        await addStockMovement({
                            productId: item.productId,
                            variantId: item.variantId,
                            productName: item.name,
                            date: new Date().toISOString().split('T')[0],
                            quantity: -item.quantity,
                            type: 'Ajustement',
                            reference: `Suppr Avoir ${cnToDelete.documentId || cnToDelete.id}`
                        });
                    }
                }
            }

            await dbService.creditNotes.delete(id);
            const remaining = creditNotes.filter(cn => cn.id !== id);
            setCreditNotes(remaining);
            await resequenceDocumentIds('creditNote', remaining);
        } catch (e: any) {
            alert("Erreur suppression avoir: " + e.message);
        }
    };
    const updateCreditNoteStatus = async (id: string, newStatus: CreditNoteStatus) => {
        const cn = creditNotes.find(c => c.id === id);
        if (!cn || cn.status === newStatus) return;

        const wasRestocked = cn.returnToStock !== false && 
            (cn.status === CreditNoteStatus.Validated || cn.status === CreditNoteStatus.Refunded);
        const willBeRestocked = cn.returnToStock !== false && 
            (newStatus === CreditNoteStatus.Validated || newStatus === CreditNoteStatus.Refunded);

        if (!wasRestocked && willBeRestocked) {
            // Draft -> Validated/Refunded: RESTORE STOCK
            for (const item of cn.lineItems) {
                if (item.productId && item.quantity > 0) {
                    await addStockMovement({
                        productId: item.productId,
                        variantId: item.variantId,
                        productName: item.name,
                        date: cn.date,
                        quantity: item.quantity,
                        type: 'Retour',
                        reference: `Avoir ${cn.documentId || cn.id}`
                    });
                }
            }
        } else if (wasRestocked && !willBeRestocked) {
            // Validated/Refunded -> Draft: REVERSE STOCK RESTORATION
            for (const item of cn.lineItems) {
                if (item.productId && item.quantity > 0) {
                    await addStockMovement({
                        productId: item.productId,
                        variantId: item.variantId,
                        productName: item.name,
                        date: new Date().toISOString().split('T')[0],
                        quantity: -item.quantity,
                        type: 'Ajustement',
                        reference: `Annulation Avoir ${cn.documentId || cn.id}`
                    });
                }
            }
        }

        const updatedCn = { ...cn, status: newStatus };
        await dbService.creditNotes.update(updatedCn);
        setCreditNotes(prev => prev.map(c => c.id === id ? updatedCn : c));
    };
    const createCreditNoteFromInvoice = (invoiceId: string) => {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;
        navigate('/sales/credit-notes', { state: { prefilledInvoice: invoice } });
    };

    const createDeliveryNote = async (noteData: Omit<DeliveryNote, 'id'>) => {
        try {
            const documentId = noteData.documentId || generateDocumentId('deliveryNote', deliveryNotes);
            const newNote: DeliveryNote = { id: generateUUID(), documentId: documentId, ...noteData };
            await dbService.deliveryNotes.add(newNote);
            setDeliveryNotes(prev => [newNote, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            // Only deduct stock if this BL is NOT created from an existing invoice that already deducted stock
            const sourceInvoice = noteData.invoiceId ? invoices.find(inv => inv.documentId === noteData.invoiceId || inv.id === noteData.invoiceId) : null;
            const stockAlreadyDeducted = sourceInvoice && sourceInvoice.status !== InvoiceStatus.Draft;

            if (!stockAlreadyDeducted) {
                const stockChanges: Map<string, { qty: number, productId: string, variantId?: string, name: string }> = new Map();
                for (const item of noteData.lineItems) {
                    if (item.productId) {
                        const key = `${item.productId}-${item.variantId || 'base'}`;
                        const current = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
                        current.qty += item.quantity;
                        stockChanges.set(key, current);
                    }
                }

                const changes = Array.from(stockChanges.values());
                for (const change of changes) {
                    await addStockMovement({ 
                        productId: change.productId, 
                        variantId: change.variantId,
                        productName: change.name, 
                        date: noteData.date, 
                        quantity: -change.qty, 
                        type: 'Vente', 
                        reference: `${documentId} ${noteData.invoiceId ? '(Facture ' + noteData.invoiceId + ')' : '(Manuel)'}` 
                    });
                }
            }
        } catch (e: any) {
            console.error("Error creating delivery note", e);
            alert("Erreur création BL: " + e.message);
            throw e;
        }
    };
    const updateDeliveryNote = async (updatedNote: DeliveryNote) => {
        try {
            const existingNote = deliveryNotes.find(n => n.id === updatedNote.id);
            if (existingNote) {
                const stockChanges: Map<string, { qty: number, productId: string, variantId?: string, name: string }> = new Map();
                
                // 1. Calculate restoration of old quantities
                existingNote.lineItems.forEach(item => {
                    if (item.productId) {
                        const key = `${item.productId}-${item.variantId || 'base'}`;
                        const current = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
                        current.qty += item.quantity;
                        stockChanges.set(key, current);
                    }
                });

                // 2. Calculate deduction of new quantities
                updatedNote.lineItems.forEach(item => {
                    if (item.productId) {
                        const key = `${item.productId}-${item.variantId || 'base'}`;
                        const current = stockChanges.get(key) || { qty: 0, productId: item.productId, variantId: item.variantId, name: item.name };
                        current.qty -= item.quantity;
                        stockChanges.set(key, current);
                    }
                });

                // 3. Apply net changes sequentially
                const changes = Array.from(stockChanges.values());
                for (const change of changes) {
                    if (Math.abs(change.qty) > 0.000001) {
                        await addStockMovement({
                            productId: change.productId,
                            variantId: change.variantId,
                            productName: change.name,
                            date: new Date().toISOString().split('T')[0],
                            quantity: change.qty, // Note: if qty > 0, it means we restored more than we deducted -> net addition to stock (Retour). If qty < 0, net deduction (Vente).
                            type: change.qty > 0 ? 'Retour' : 'Vente',
                            reference: `Modification BL ${updatedNote.documentId || updatedNote.id}`
                        });
                    }
                }
            }

            const savedNote = await dbService.deliveryNotes.update(updatedNote); 
            setDeliveryNotes(prev => prev.map(n => n.id === updatedNote.id ? savedNote : n));
        } catch (e: any) {
            console.error("Error updating delivery note", e);
            alert("Erreur mise à jour BL: " + e.message);
        }
    };
    const deleteDeliveryNote = async (noteId: string) => {
        try {
            const note = deliveryNotes.find(n => n.id === noteId);
            if (note) {
                const docId = note.documentId || note.id;
                // 1. Revert any stock movements explicitly associated with this BL
                const blMovements = stockMovements.filter(m => m.reference && m.reference.includes(docId));
                
                for (const m of blMovements) {
                    await updateProductStock(m.productId, -m.quantity, m.variantId);
                    await dbService.stockMovements.delete(m.id);
                }
                
                // 2. If this BL was created from an invoice, and that invoice no longer exists,
                // we must revert the original Invoice's stock movements because the Invoice delegated it to this BL.
                if (note.invoiceId) {
                    const sourceInvoice = invoices.find(inv => inv.documentId === note.invoiceId || inv.id === note.invoiceId);
                    if (!sourceInvoice || sourceInvoice.status === InvoiceStatus.Draft) {
                        const invMovements = stockMovements.filter(m => m.reference && m.reference.includes(`Facture ${note.invoiceId}`));
                        for (const m of invMovements) {
                            if (!blMovements.some(bm => bm.id === m.id)) {
                                await updateProductStock(m.productId, -m.quantity, m.variantId);
                                await dbService.stockMovements.delete(m.id);
                            }
                        }
                        // Update local state for both types of movements
                        setStockMovements(prev => prev.filter(m => 
                            !blMovements.some(bm => bm.id === m.id) && 
                            !invMovements.some(im => im.id === m.id)
                        ));
                    } else {
                        setStockMovements(prev => prev.filter(m => !blMovements.some(bm => bm.id === m.id)));
                    }
                } else {
                    setStockMovements(prev => prev.filter(m => !blMovements.some(bm => bm.id === m.id)));
                }
            }
            await dbService.deliveryNotes.delete(noteId);
            const remaining = deliveryNotes.filter(n => n.id !== noteId);
            setDeliveryNotes(remaining);
            await resequenceDocumentIds('deliveryNote', remaining);
        } catch (e: any) {
            alert("Erreur suppression BL: " + e.message);
        }
    };
    const createInvoiceFromDeliveryNote = async (deliveryNoteId: string) => {
        const note = deliveryNotes.find(n => n.id === deliveryNoteId);
        if (!note) return;
        try {
            const documentId = generateDocumentId('invoice', invoices);
            const newInvoiceData: Invoice = { 
                id: generateUUID(), 
                documentId: documentId, 
                clientId: note.clientId, 
                clientName: note.clientName, 
                date: new Date().toISOString().split('T')[0], 
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
                status: InvoiceStatus.Pending, 
                subject: note.subject ? note.subject : `Facture depuis BL ${note.documentId || note.id}`, 
                reference: note.reference, 
                purchaseOrderNumber: note.purchaseOrderNumber, 
                lineItems: note.lineItems, 
                subTotal: note.subTotal || 0, 
                vatAmount: note.vatAmount || 0, 
                amount: note.totalAmount || 0, 
                amountPaid: 0
            };
            
            // Note: We do NOT deduct stock here because creating a Delivery Note already deducted the stock.
            
            await dbService.invoices.add(newInvoiceData);
            setInvoices(prev => [newInvoiceData, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            
            // Link BL to Invoice
            const updatedNote = { ...note, invoiceId: newInvoiceData.documentId || newInvoiceData.id };
            await dbService.deliveryNotes.update(updatedNote);
            setDeliveryNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));
            
            navigate('/sales/invoices');
        } catch (e: any) {
            alert("Erreur conversion: " + e.message);
        }
    };

    const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
        try {
            const newExpense = { id: generateUUID(), ...expenseData };
            await dbService.expenses.add(newExpense);
            setExpenses(prev => [newExpense, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (e: any) {
            console.error("Error adding expense", e);
            alert("Erreur ajout dépense: " + e.message);
            throw e;
        }
    };

    const updateExpense = async (updatedExpense: Expense) => {
        try {
            const savedExpense = await dbService.expenses.update(updatedExpense);
            setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? savedExpense : e));
        } catch (e: any) {
            console.error("Error updating expense", e);
            alert("Erreur mise à jour dépense: " + e.message);
            throw e;
        }
    };

    const deleteExpense = async (id: string | string[]) => {
        try {
            await dbService.expenses.delete(id);
            setExpenses(prev => prev.filter(e => Array.isArray(id) ? !id.includes(e.id) : e.id !== id));
        } catch (e: any) {
            console.error("Error deleting expense", e);
            alert("Erreur suppression dépense: " + e.message);
        }
    };

    const addPurchaseOrder = async (orderData: Omit<PurchaseOrder, 'id'>) => {
        try {
            const documentId = orderData.documentId || generateDocumentId('purchaseOrder', purchaseOrders);
            const newOrder: PurchaseOrder = { id: generateUUID(), documentId: documentId, ...orderData };
            await dbService.purchaseOrders.add(newOrder);
            setPurchaseOrders(prev => [newOrder, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
        } catch (e: any) {
            console.error("Error creating purchase order", e);
            alert("Erreur création BC: " + e.message);
            throw e;
        }
    };
    const updatePurchaseOrder = async (updatedOrder: PurchaseOrder) => {
        try {
            const savedOrder = await dbService.purchaseOrders.update(updatedOrder);
            setPurchaseOrders(prev => prev.map(o => o.id === updatedOrder.id ? savedOrder : o));
        } catch (e: any) {
            console.error("Error updating purchase order", e);
            alert("Erreur mise à jour commande: " + e.message);
        }
    };
    const updatePurchaseOrderStatus = async (orderId: string, newStatus: PurchaseOrderStatus) => {
        const order = purchaseOrders.find(o => o.id === orderId);
        if (order) {
            const oldStatus = order.status;
            let updatedOrder = { ...order, status: newStatus };

            await dbService.purchaseOrders.update(updatedOrder);
            setPurchaseOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            
            if (newStatus === PurchaseOrderStatus.Received && oldStatus !== PurchaseOrderStatus.Received) {
                 for (const item of order.lineItems) {
                    if (item.productId) {
                        await addStockMovement({ 
                            productId: item.productId, 
                            variantId: item.variantId,
                            productName: item.name, 
                            date: new Date().toISOString().split('T')[0], 
                            quantity: item.quantity, 
                            type: 'Achat', 
                            reference: `Reception ${order.documentId || order.id}` 
                        });
                    }
                }
            }
        }
    };
    const deletePurchaseOrder = async (orderId: string) => {
        try {
            const orderToDelete = purchaseOrders.find(o => o.id === orderId);
            const refPattern = `Reception ${orderToDelete?.documentId || orderId}`;

            // Cleanup related stock movements (Achat)
            const relatedMovements = stockMovements.filter(m => m.reference === refPattern);
            for(const m of relatedMovements) {
                // We should also reverse the stock change if we delete the movement?
                // Actually, if we delete a "Received" PO, we should probably reverse the stock it added.
                await updateProductStock(m.productId, -m.quantity, m.variantId);
                await dbService.stockMovements.delete(m.id);
            }

            await dbService.purchaseOrders.delete(orderId);
            setStockMovements(prev => prev.filter(m => m.reference !== refPattern));
            const remaining = purchaseOrders.filter(o => o.id !== orderId);
            setPurchaseOrders(remaining);
            await resequenceDocumentIds('purchaseOrder', remaining);
        } catch (e: any) {
            alert("Erreur suppression commande: " + e.message);
        }
    };

    if (isLoading) { return <LoadingScreen />; }
    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-red-50 p-4">
                <div className="w-full max-w-lg text-center">
                    <h2 className="text-xl font-bold text-red-700"><span>Erreur de Chargement</span></h2>
                    <p className="mt-2 text-neutral-700 bg-red-100 p-4 rounded-lg border border-red-200"><span>{error}</span></p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <button 
                            onClick={() => window.location.reload()} 
                            className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors"
                        >
                            <span>Réessayer</span>
                        </button>
                        <button 
                            onClick={async () => {
                                try {
                                    await supabase.auth.signOut({ scope: 'local' });
                                } catch (e) {
                                    console.error("Sign out error", e);
                                }
                                localStorage.clear();
                                sessionStorage.clear();
                                // Clear all cookies if possible
                                document.cookie.split(";").forEach((c) => {
                                    document.cookie = c
                                        .replace(/^ +/, "")
                                        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                                });
                            }} 
                            className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            <span>Déconnexion</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-100 text-neutral-800 overflow-hidden">
            <div className="bg-emerald-900 text-emerald-50 py-2 px-4 text-center text-[10px] sm:text-xs font-bold z-50 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-6 shadow-lg border-b border-emerald-800">
                <div dir="rtl" className="flex items-center gap-1.5 leading-relaxed">
                    <span className="opacity-90">لأي مشكلة أو مساعدة، تواصلوا معنا عبر الواتساب:</span>
                    <span dir="ltr" className="select-all underline decoration-emerald-500/50 font-mono text-white">+212 708-256858</span>
                </div>
                <div className="hidden sm:block w-px h-3 bg-emerald-700/50"></div>
                <div className="flex items-center gap-1.5 leading-relaxed">
                    <span className="uppercase tracking-tight opacity-90">Besoin d'aide ? Message WhatsApp au :</span>
                    <span className="select-all underline decoration-emerald-500/50 font-mono text-white">+212 708-256858</span>
                </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
                <div className="hidden md:flex md:w-64 md:flex-col md:shrink-0 transition-all duration-300 shadow-xl z-20"><Sidebar /></div>
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-50 flex md:hidden">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out" onClick={() => setSidebarOpen(false)}></div>
                        <div className="relative flex w-72 max-w-[80%] flex-1 flex-col bg-emerald-600 shadow-2xl animate-slide-in">
                            <div className="absolute top-0 right-0 -mr-12 pt-4">
                                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none ring-1 ring-white/20" onClick={() => setSidebarOpen(false)}>
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <Sidebar onClose={() => setSidebarOpen(false)} />
                        </div>
                    </div>
                )}
                <div className="flex flex-1 flex-col min-h-0 overflow-hidden w-full relative">
                    <div className={`flex-1 ${isPosRoute ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'} bg-slate-50 w-full`}>
                        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-4 py-3 md:hidden border-b border-slate-200 shadow-sm flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                                    <Files size={18} />
                                </div>
                                <h1 className="text-lg font-bold text-emerald-700 tracking-tight">Facturago</h1>
                            </div>
                            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 focus:outline-none" onClick={() => setSidebarOpen(true)}>
                                <Menu className="h-6 w-6" />
                            </button>
                        </div>
                        <main className={`${isPosRoute ? 'p-0 flex-1 flex flex-col overflow-hidden' : 'p-4 sm:p-6 lg:p-8'} w-full`}>
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard invoices={invoices} clients={clients} products={products} companySettings={companySettings} creditNotes={creditNotes} expenses={expenses} stockMovements={stockMovements} />} />
                            <Route path="/pos" element={<POS products={products} clients={clients} invoices={invoices} companySettings={companySettings} onAddInvoice={addInvoice} onAddClient={addClient} onAddStockMovement={addStockMovement} />} />
                            <Route path="/statistics" element={<Statistics invoices={invoices} payments={payments} purchaseOrders={purchaseOrders} products={products} creditNotes={creditNotes} expenses={expenses} salaryPayments={salaryPayments} stockMovements={stockMovements} companySettings={companySettings} />} />
                            <Route path="/sales/quotes" element={<Quotes quotes={quotes} onUpdateQuoteStatus={updateQuoteStatus} onCreateInvoice={createInvoiceFromQuote} onAddQuote={addQuote} onUpdateQuote={updateQuote} onDeleteQuote={deleteQuote} clients={clients} products={products} companySettings={companySettings} generateDocumentId={() => generateDocumentId('quote', quotes)} />} />
                            <Route path="/sales/invoices" element={<InvoicesComponent invoices={invoices} onUpdateInvoiceStatus={updateInvoiceStatus} onAddPayment={addPayment} onCreateInvoice={addInvoice} onUpdateInvoice={updateInvoice} onDeleteInvoice={deleteInvoice} onCreateCreditNote={createCreditNoteFromInvoice} clients={clients} products={products} companySettings={companySettings} generateDocumentId={() => generateDocumentId('invoice', invoices)} />} />
                            <Route path="/sales/credit-notes" element={<CreditNotesComponent creditNotes={creditNotes} onUpdateCreditNoteStatus={updateCreditNoteStatus} onCreateCreditNote={addCreditNote} onUpdateCreditNote={updateCreditNote} onDeleteCreditNote={deleteCreditNote} clients={clients} products={products} invoices={invoices} companySettings={companySettings} generateDocumentId={() => generateDocumentId('creditNote', creditNotes)} />} />
                            <Route path="/sales/payments" element={<PaymentTracking invoices={invoices} payments={payments} onAddPayment={addPayment} clients={clients} companySettings={companySettings} />} />
                            <Route path="/sales/delivery" element={<DeliveryNotesComponent deliveryNotes={deliveryNotes} invoices={invoices} onCreateDeliveryNote={createDeliveryNote} onUpdateDeliveryNote={updateDeliveryNote} onDeleteDeliveryNote={deleteDeliveryNote} onCreateInvoice={createInvoiceFromDeliveryNote} clients={clients} products={products} companySettings={companySettings} generateDocumentId={() => generateDocumentId('deliveryNote', deliveryNotes)} />} />
                            <Route path="/purchases/orders" element={<PurchaseOrders orders={purchaseOrders} suppliers={suppliers} products={products} onAddOrder={addPurchaseOrder} onUpdateOrder={updatePurchaseOrder} onUpdateStatus={updatePurchaseOrderStatus} onDeleteOrder={deletePurchaseOrder} onConvertToInvoice={(order) => navigate('/sales/invoices', { state: { prefilledOrder: order } })} companySettings={companySettings} generateDocumentId={() => generateDocumentId('purchaseOrder', purchaseOrders)} />} />
                            <Route path="/stock" element={<StockManagement products={products} movements={stockMovements} onAddMovement={addStockMovement} />} />
                            <Route path="/expenses" element={<Expenses expenses={expenses} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} companySettings={companySettings} />} />
                            <Route path="/personnel" element={<PersonnelManagement companySettings={companySettings} onAddExpense={addExpense} initialEmployees={employees} initialAttendances={attendances} initialPayments={salaryPayments} />} />
                            <Route path="/clients" element={<ClientsComponent clients={clients} onAddClient={addClient} onUpdateClient={updateClient} onDeleteClient={deleteClient} onDeleteClients={deleteClient} />} />
                            <Route path="/suppliers" element={<SuppliersComponent suppliers={suppliers} purchaseOrders={purchaseOrders} onUpdatePurchaseOrder={updatePurchaseOrder} onAddExpense={addExpense} onAddSupplier={addSupplier} onUpdateSupplier={updateSupplier} onDeleteSupplier={deleteSupplier} onDeleteSuppliers={deleteSupplier} companySettings={companySettings} />} />
                            <Route path="/products" element={<ProductsComponent products={products} onAddProduct={addProduct} onAddProducts={addProducts} onUpdateProduct={updateProduct} onDeleteProduct={deleteProducts} onDeleteProducts={deleteProducts} companySettings={companySettings} />} />
                            <Route path="/products/new" element={<ProductsComponent products={products} onAddProduct={addProduct} onAddProducts={addProducts} onUpdateProduct={updateProduct} onDeleteProduct={deleteProducts} onDeleteProducts={deleteProducts} companySettings={companySettings} />} />
                            <Route path="/products/edit/:productId" element={<ProductsComponent products={products} onAddProduct={addProduct} onAddProducts={addProducts} onUpdateProduct={updateProduct} onDeleteProduct={deleteProducts} onDeleteProducts={deleteProducts} companySettings={companySettings} />} />
                            <Route path="/settings" element={<TemplateCustomizer settings={companySettings} onSave={updateCompanySettings} />} />
                            <Route path="/profile" element={<UserProfile />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </div>
    </div>
);
};

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    useEffect(() => {
        // Detect password recovery in URL elements on first load
        if (
            window.location.hash.includes('type=recovery') || 
            window.location.href.includes('type=recovery') ||
            window.location.hash.includes('error_code=')
        ) {
            console.log("Detected password recovery trigger from URL parameters");
            setIsResettingPassword(true);
        }

        const initSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession().catch(err => ({ data: { session: null }, error: err }));
                if (error) {
                    const msg = (error.message || '').toLowerCase();
                    if (msg.includes('refresh') || msg.includes('jwt') || msg.includes('invalid') || msg.includes('auth session') || msg.includes('not found')) {
                        console.warn('Invalid auth token in initSession, gracefully clearing session.');
                        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                        try {
                            for (let i = localStorage.length - 1; i >= 0; i--) {
                                const key = localStorage.key(i);
                                if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
                                    localStorage.removeItem(key);
                                }
                            }
                        } catch (_) {}
                    } else {
                        console.error("Session error:", error.message);
                    }
                }
                setSession(data?.session || null);
            } catch (err) {
                console.error("Auth initialization exception:", err);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log("Auth state change:", _event, session?.user?.email);
            if (_event === 'SIGNED_OUT' || (_event === 'USER_UPDATED' && !session)) {
                resetDBCache();
                try {
                    localStorage.removeItem('supabase.auth.token');
                } catch (_) {}
            }
            if (_event === 'PASSWORD_RECOVERY') {
                console.log("Supabase PASSWORD_RECOVERY event received!");
                setIsResettingPassword(true);
            }
            setSession(prev => {
                if (prev?.user?.id === session?.user?.id && prev?.access_token === session?.access_token) {
                    return prev;
                }
                return session;
            });
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) { return <LoadingScreen />; }

    if (isResettingPassword) {
        return (
            <LanguageProvider>
                <ResetPassword onClose={() => {
                    setIsResettingPassword(false);
                    try {
                        window.history.replaceState(null, '', window.location.pathname + window.location.search);
                        window.location.hash = '#/dashboard';
                    } catch (e) {
                        console.error("Failed to clean up hash after password update:", e);
                    }
                }} />
            </LanguageProvider>
        );
    }

    return (
        <LanguageProvider>
            <HashRouter>
                <AnimatePresence mode="wait" key={session?.user?.id || 'public'}>
                    <Routes>
                        <Route 
                            path="/" 
                            element={
                                !session ? (
                                    <motion.div
                                        key="landing-wrapper"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="min-h-screen w-full bg-white"
                                    >
                                        <LandingPage />
                                    </motion.div>
                                ) : (
                                    <Navigate to="/dashboard" replace />
                                )
                            } 
                        />
                        <Route 
                            path="/login" 
                            element={
                                !session ? (
                                    <motion.div
                                        key="login-wrapper"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="min-h-screen w-full bg-slate-100"
                                    >
                                        <Login />
                                    </motion.div>
                                ) : (
                                    <Navigate to="/dashboard" replace />
                                )
                            } 
                        />
                        <Route 
                            path="/*" 
                            element={
                                session ? (
                                    <motion.div
                                        key={`app-wrapper-${session.user.id}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full w-full"
                                    >
                                        <MainContent />
                                    </motion.div>
                                ) : (
                                    <Navigate to="/" replace />
                                )
                            } 
                        />
                    </Routes>
                </AnimatePresence>
            </HashRouter>
        </LanguageProvider>
    );
};

export default App;
