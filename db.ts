
import { Client, Product, Supplier, Quote, Invoice, CompanySettings, Payment, StockMovement, DeliveryNote, PurchaseOrder, CreditNote, Expense, Employee, Attendance, SalaryPayment } from './types';
import { supabase } from './supabaseClient';

const TABLE_MAP: Record<string, string> = {
    'clients': 'clients',
    'products': 'products',
    'suppliers': 'suppliers',
    'quotes': 'quotes',
    'invoices': 'invoices',
    'credit_notes': 'credit_notes',
    'settings': 'settings',
    'payments': 'payments',
    'stock_movements': 'stock_movements',
    'delivery_notes': 'delivery_notes',
    'purchase_orders': 'purchase_orders',
    'expenses': 'expenses',
    'employees': 'employees',
    'attendances': 'attendances',
    'salary_payments': 'salary_payments'
};

const LOCAL_STORAGE_KEYS = {
    SHOW_AMOUNT_IN_WORDS: 'facturago_show_amount_in_words',
    DOCUMENT_INFO_POSITION: 'facturago_document_info_position',
    SHOW_EXPIRY_DATE: 'facturago_show_expiry_date',
    LOGO_WIDTH: 'facturago_logo_width',
    BACKGROUND_LOGO: 'facturago_background_logo',
    BACKGROUND_LOGO_WIDTH: 'facturago_background_logo_width',
    STAMP_WIDTH: 'facturago_stamp_width',
    SHOW_LOGO_WATERMARK: 'facturago_show_logo_watermark',
    LOGO_WATERMARK_OPACITY: 'facturago_logo_watermark_opacity',
    HEADER_TEXT_COLOR: 'facturago_header_text_color',
    TABLE_HEADER_BG_COLOR: 'facturago_table_header_bg_color',
    SHOW_TABLE_BORDERS: 'facturago_show_table_borders',
    CLIENT_POSITION: 'facturago_client_position',
    DEFAULT_CURRENCY_CODE: 'settings_default_currency_code',
    DEFAULT_TVA: 'settings_default_tva',
    DOCUMENT_FONT_SIZE: 'facturago_document_font_size'
};

export const initDB = async (): Promise<any> => {
    return Promise.resolve(true);
};

let cachedUserId: string | null = null;
let cachedCompanyId: string | null = null;
let pendingCompanyPromise: Promise<{ userId: string | null, companyId: string | null }> | null = null;

export const resetDBCache = () => {
    cachedUserId = null;
    cachedCompanyId = null;
    pendingCompanyPromise = null;
};

export const getCurrentUserAndCompany = async () => {
    return retry(async () => {
        try {
            const sessionResponse = await supabase.auth.getSession().catch(err => {
                console.warn("getSession error caught:", err);
                return { data: { session: null }, error: err };
            });
            const session = sessionResponse?.data?.session || null;
            const authError = sessionResponse?.error;

            if (authError) {
                const errMsg = (authError.message || (typeof authError === 'string' ? authError : '') || '').toLowerCase();
                if (
                    errMsg.includes('refresh token') || 
                    errMsg.includes('jwt') || 
                    errMsg.includes('invalid') || 
                    errMsg.includes('auth session') ||
                    errMsg.includes('not_found') ||
                    errMsg.includes('invalid_grant')
                ) {
                    console.warn("Auth session error in getCurrentUserAndCompany, clearing session:", errMsg);
                    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const key = localStorage.key(i);
                        if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
                            localStorage.removeItem(key);
                        }
                    }
                    return { userId: null, companyId: null };
                }
            }

            const currentUserId = session?.user?.id || null;

            // Clear cache if user changed
            if (currentUserId !== cachedUserId) {
                cachedUserId = currentUserId;
                cachedCompanyId = null;
                pendingCompanyPromise = null;
            }

            if (!currentUserId) return { userId: null, companyId: null };
            if (cachedCompanyId) return { userId: currentUserId, companyId: cachedCompanyId };

            if (pendingCompanyPromise) return pendingCompanyPromise;

            pendingCompanyPromise = (async () => {
                // Fallback: The user is the owner, userId is the companyId
                cachedCompanyId = currentUserId;
                return { userId: currentUserId, companyId: currentUserId };
            })();

            return pendingCompanyPromise;
        } catch (e: any) {
            console.error("Error in getCurrentUserAndCompany:", e);
            const errMsg = (e?.message || '').toLowerCase();
            if (errMsg.includes('refresh token') || errMsg.includes('invalid') || errMsg.includes('not_found') || errMsg.includes('invalid_grant')) {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
                        localStorage.removeItem(key);
                    }
                }
                return { userId: null, companyId: null };
            }
            if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
                throw e; // Let retry handle it
            }
            return { userId: null, companyId: null };
        }
    });
};

// Listen for auth changes to update the cache
supabase.auth.onAuthStateChange((_event, session) => {
    cachedUserId = session?.user?.id || null;
    cachedCompanyId = null; // Reset company cache to force re-fetch
});

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 120000): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("La requête a expiré. La base de données est peut-être en train de démarrer (peut prendre jusqu'à 2 minutes).")), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
};

async function retry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const isNetworkError = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
            const isTimeout = err?.message?.includes('expiré');
            
            if (isNetworkError || isTimeout) {
                console.warn(`Retry ${i + 1}/${maxRetries} after error:`, err.message);
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i))); 
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

const handleAuthError = async (error: any) => {
    const msg = (error?.message || (typeof error === 'string' ? error : '') || '').toLowerCase();
    if (
        msg.includes('jwt') ||
        msg.includes('expired') ||
        msg.includes('refresh token') ||
        msg.includes('invalid refresh') ||
        msg.includes('auth session missing') ||
        msg.includes('not_found') ||
        error?.code === 'PGRST301' ||
        error?.status === 401 ||
        error?.status === 400
    ) {
        console.warn("Auth error detected, cleaning up auth session:", msg);
        try {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
                    localStorage.removeItem(key);
                }
            }
            if (!window.location.hash.includes('/login')) {
                window.location.hash = '#/login';
            }
            return false;
        } catch (e) {
            console.error("Exception during auth error cleanup:", e);
            return false;
        }
    }
    return false;
};

const isSchemaError = (error: any): boolean => {
    if (!error) return false;
    const code = error.code || '';
    const msg = ((error.message || '') + ' ' + (error.details || '') + ' ' + (error.hint || '')).toLowerCase();
    return (
        code === 'PGRST204' ||
        code === 'PGRST205' ||
        code === '42P01' ||
        code === '42703' ||
        msg.includes('column') ||
        msg.includes('does not exist') ||
        msg.includes('not found') ||
        msg.includes('schema cache')
    );
};

const extractMissingColumn = (error: any): string | null => {
    if (!error) return null;
    const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
    const match1 = msg.match(/column "?([a-zA-Z0-9_]+)"? of/i);
    if (match1 && match1[1]) return match1[1];
    const match2 = msg.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i);
    if (match2 && match2[1]) return match2[1];
    const match3 = msg.match(/find the '([a-zA-Z0-9_]+)' column/i);
    if (match3 && match3[1]) return match3[1];
    return null;
};

const getAll = async <T>(storeName: string): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    return retry(async () => {
        try {
            const { companyId } = await getCurrentUserAndCompany();
            if (!companyId) return [];

            let allData: any[] = [];
            let hasMore = true;
            let offset = 0;
            let currentBatchSize = 200; // Start with 200, will decrease on timeout

            while (hasMore) {
                try {
                    // Optimization: Always filter by company_id FIRST if available
                    let queryBuilder = supabase.from(tableName).select('*');
                    
                    if (companyId) {
                        queryBuilder = queryBuilder.eq('company_id', companyId);
                    }
                    
                    // Then order and apply range
                    const fetchPromise = queryBuilder
                        .order('id', { ascending: true })
                        .range(offset, offset + currentBatchSize - 1);
                    
                    // Using a slightly shorter timeout for the chunk to detect issues early
                    const result: any = await withTimeout(Promise.resolve(fetchPromise), 45000);
                    const { data, error } = result;

                    if (error) {
                        // If we get a timeout, try with a MUCH smaller batch size
                        if (error.code === '57014' || error.message?.includes('timeout') || error.message?.includes('expiré')) {
                            console.warn(`Timeout detected for ${storeName} at offset ${offset}, reducing batch size...`);
                            if (currentBatchSize <= 10) {
                                throw error; // Cannot go smaller, throw the original error
                            }
                            currentBatchSize = Math.floor(currentBatchSize / 2);
                            continue; // Retry same offset with smaller batch
                        }

                        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
                            throw error; // Let outer retry catch it
                        }

                        // Check if it's a schema error
                        if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST205' || (error.message && error.message.includes('column') && error.message.includes('does not exist'))) {
                            console.warn(`Table or column missing for ${storeName}, returning empty array:`, error.message);
                            return [];
                        }

                        const recovered = await handleAuthError(error);
                        if (recovered) continue; // Retry after auth refresh
                        
                        throw error;
                    }

                    if (data && data.length > 0) {
                        allData = [...allData, ...data];
                        offset += data.length;
                    }

                    if (!data || data.length < currentBatchSize) {
                        hasMore = false;
                    } else {
                        // Small delay between batches to let the database breathe
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                } catch (e: any) {
                    // Handle timeout errors that bubble up from withTimeout
                    if (e.message?.includes('expiré') || e.code === '57014') {
                        console.warn(`Catch block timeout for ${storeName} at offset ${offset}, reducing batch size...`);
                        if (currentBatchSize <= 10) throw e;
                        currentBatchSize = Math.floor(currentBatchSize / 2);
                        continue;
                    }
                    throw e;
                }
            }

            // Restore metadata fields from first line item if missing
            if (['quotes', 'invoices', 'purchase_orders', 'credit_notes', 'delivery_notes'].includes(tableName)) {
                allData = allData.map(item => {
                    const lineItems = item.lineItems || item.line_items;
                    const firstItem = lineItems?.[0];
                    if (firstItem) {
                        return {
                            ...item,
                            subject: firstItem.subject || item.subject,
                            paymentMethod: firstItem.paymentMethod || item.paymentMethod,
                            checkNumber: firstItem.checkNumber || item.checkNumber,
                            bankName: firstItem.bankName || item.bankName,
                            notes: firstItem.notes || item.notes,
                            purchaseOrderNumber: firstItem.purchaseOrderNumber || item.purchaseOrderNumber,
                            dueDate: firstItem.dueDate || item.dueDate,
                            expiryDate: firstItem.expiryDate || item.expiryDate,
                            expectedDate: firstItem.expectedDate || item.expectedDate,
                            calculationMode: firstItem.calculationMode || item.calculationMode,
                            showDimensions: firstItem.showDimensions !== undefined ? firstItem.showDimensions : item.showDimensions
                        };
                    }
                    return item;
                });
            }

            if (tableName === 'products') {
                allData = allData.map(item => ({
                    ...item,
                    createdAt: item.createdAt || item.created_at || new Date().toISOString().split('T')[0]
                }));
            }

            if (tableName === 'expenses') {
                allData = allData.map(item => ({
                    ...item,
                    purchaseOrderId: item.purchaseOrderId || item.purchase_order_id || undefined
                }));
            }

            return allData as T[];
        } catch (e: any) {
            if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
                throw e; // Let retry handle it
            }
            if (await handleAuthError(e)) {
                return getAll(storeName);
            }
            throw e;
        }
    });
};

const add = async <T>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    try {
        const { userId, companyId } = await getCurrentUserAndCompany();
        if (!userId || !companyId) throw new Error("User not authenticated");

        const originalItem = { ...item } as any;
        const { userId: _, ...itemToSave } = originalItem;

        let payload = { ...itemToSave, user_id: userId, company_id: companyId };

        let result: any = await withTimeout(supabase.from(tableName).insert(payload).select().single() as any);

        if (result?.error && isSchemaError(result.error)) {
            console.warn(`Schema error detected when adding to ${storeName}:`, result.error.message);
            const missingCol = extractMissingColumn(result.error);
            if (missingCol && missingCol in payload) {
                console.warn(`Removing missing column '${missingCol}' from payload and retrying insert...`);
                delete payload[missingCol];
            } else {
                console.warn(`Stripping potential missing columns (createdAt, purchaseOrderId, etc.) and retrying insert...`);
                delete payload.createdAt;
                delete payload.purchaseOrderId;
                delete payload.showDimensions;
                delete payload.calculationMode;
            }

            result = await withTimeout(supabase.from(tableName).insert(payload).select().single() as any);
        }

        const { data, error } = result;

        if (error) {
            if (isSchemaError(error)) {
                console.warn(`Second schema retry for ${storeName}...`);
                delete payload.createdAt;
                delete payload.purchaseOrderId;
                delete payload.showDimensions;
                delete payload.calculationMode;
                delete payload.expectedDate;
                delete payload.expiryDate;
                delete payload.dueDate;
                
                const finalTry: any = await withTimeout(supabase.from(tableName).insert(payload).select().single() as any);
                if (finalTry.data) {
                    return { ...originalItem, ...finalTry.data };
                }
            }

            const recovered = await handleAuthError(error);
            if (recovered) {
                const retryResult: any = await withTimeout(supabase.from(tableName).insert(payload).select().single() as any);
                if (retryResult.data) return { ...originalItem, ...retryResult.data };
            }
            console.error(`Error adding to ${storeName}:`, error);
            throw error;
        }

        const savedItem = data as any;
        const lineItems = savedItem.lineItems || savedItem.line_items;
        const firstItem = lineItems?.[0];
        if (firstItem) {
            return {
                ...originalItem,
                ...savedItem,
                subject: firstItem.subject || savedItem.subject || originalItem.subject,
                paymentMethod: firstItem.paymentMethod || savedItem.paymentMethod || originalItem.paymentMethod,
                checkNumber: firstItem.checkNumber || savedItem.checkNumber || originalItem.checkNumber,
                bankName: firstItem.bankName || savedItem.bankName || originalItem.bankName,
                notes: firstItem.notes || savedItem.notes || originalItem.notes,
                purchaseOrderNumber: firstItem.purchaseOrderNumber || savedItem.purchaseOrderNumber || originalItem.purchaseOrderNumber,
                dueDate: firstItem.dueDate || savedItem.dueDate || originalItem.dueDate,
                expiryDate: firstItem.expiryDate || savedItem.expiryDate || originalItem.expiryDate,
                expectedDate: firstItem.expectedDate || savedItem.expectedDate || originalItem.expectedDate,
                calculationMode: firstItem.calculationMode || savedItem.calculationMode || originalItem.calculationMode,
                showDimensions: firstItem.showDimensions !== undefined ? firstItem.showDimensions : (savedItem.showDimensions !== undefined ? savedItem.showDimensions : originalItem.showDimensions)
            } as T;
        }

        return { ...originalItem, ...savedItem } as T;
    } catch (e) {
        if (await handleAuthError(e)) {
            return add(storeName, item);
        }
        throw e;
    }
};

const update = async <T extends { id: string }>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    try {
        const { companyId } = await getCurrentUserAndCompany();
        if (!companyId) throw new Error("User not authenticated");

        const originalItem = { ...item } as any;
        const { id, user_id, userId: _, created_at, ...itemToSave } = originalItem;

        let payload = { ...itemToSave };

        let result: any = await withTimeout(
            supabase.from(tableName).update(payload).eq('id', id).eq('company_id', companyId).select().single() as any
        );

        if (result?.error && isSchemaError(result.error)) {
            console.warn(`Schema error detected when updating ${storeName}:`, result.error.message);
            const missingCol = extractMissingColumn(result.error);
            if (missingCol && missingCol in payload) {
                console.warn(`Removing missing column '${missingCol}' from update payload and retrying...`);
                delete payload[missingCol];
            } else {
                console.warn(`Stripping potential missing columns and retrying update...`);
                delete payload.createdAt;
                delete payload.purchaseOrderId;
                delete payload.showDimensions;
                delete payload.calculationMode;
            }

            result = await withTimeout(
                supabase.from(tableName).update(payload).eq('id', id).eq('company_id', companyId).select().single() as any
            );
        }

        const { data, error } = result;

        if (error) {
            if (isSchemaError(error)) {
                console.warn(`Second schema retry for update on ${storeName}...`);
                delete payload.createdAt;
                delete payload.purchaseOrderId;
                delete payload.showDimensions;
                delete payload.calculationMode;
                delete payload.expectedDate;
                delete payload.expiryDate;
                delete payload.dueDate;

                const finalTry: any = await withTimeout(
                    supabase.from(tableName).update(payload).eq('id', id).eq('company_id', companyId).select().single() as any
                );
                if (finalTry.data) {
                    return { ...originalItem, ...finalTry.data };
                }
            }

            const recovered = await handleAuthError(error);
            if (recovered) {
                const retryResult: any = await withTimeout(supabase.from(tableName).update(payload).eq('id', id).eq('company_id', companyId).select().single() as any);
                if (retryResult.data) return { ...originalItem, ...retryResult.data };
            }
            console.error(`Error updating ${storeName}:`, error);
            throw error;
        }

        const savedItem = data as any;
        const lineItems = savedItem.lineItems || savedItem.line_items;
        const firstItem = lineItems?.[0];
        if (firstItem) {
            return {
                ...originalItem,
                ...savedItem,
                subject: firstItem.subject || savedItem.subject || originalItem.subject,
                paymentMethod: firstItem.paymentMethod || savedItem.paymentMethod || originalItem.paymentMethod,
                checkNumber: firstItem.checkNumber || savedItem.checkNumber || originalItem.checkNumber,
                bankName: firstItem.bankName || savedItem.bankName || originalItem.bankName,
                notes: firstItem.notes || savedItem.notes || originalItem.notes,
                purchaseOrderNumber: firstItem.purchaseOrderNumber || savedItem.purchaseOrderNumber || originalItem.purchaseOrderNumber,
                dueDate: firstItem.dueDate || savedItem.dueDate || originalItem.dueDate,
                expiryDate: firstItem.expiryDate || savedItem.expiryDate || originalItem.expiryDate,
                expectedDate: firstItem.expectedDate || savedItem.expectedDate || originalItem.expectedDate,
                calculationMode: firstItem.calculationMode || savedItem.calculationMode || originalItem.calculationMode,
                showDimensions: firstItem.showDimensions !== undefined ? firstItem.showDimensions : (savedItem.showDimensions !== undefined ? savedItem.showDimensions : originalItem.showDimensions)
            } as T;
        }

        return { ...originalItem, ...savedItem } as T;
    } catch (e) {
        if (await handleAuthError(e)) {
            return update(storeName, item);
        }
        throw e;
    }
};

const remove = async (storeName: string, id: string | string[], columnName: string = 'id'): Promise<void> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    try {
        const { companyId } = await getCurrentUserAndCompany();
        if (!companyId) throw new Error("User not authenticated");

        if (Array.isArray(id)) {
            if (id.length === 0) return;
            // Chunk IDs to avoid URL length limits (approx 20 per chunk is very safe)
            const chunkSize = 20;
            for (let i = 0; i < id.length; i += chunkSize) {
                const chunk = id.slice(i, i + chunkSize);
                const { error } = await supabase
                    .from(tableName)
                    .delete()
                    .in(columnName, chunk)
                    .eq('company_id', companyId);
                
                if (error) {
                    console.error(`Error deleting chunk from ${storeName} by ${columnName}:`, error);
                    throw error;
                }
            }
            return;
        } else {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq(columnName, id)
                .eq('company_id', companyId);
            
            if (error) throw error;
        }
    } catch (e) {
        if (await handleAuthError(e)) {
            return remove(storeName, id, columnName);
        }
        throw e;
    }
};

const clearAllData = async (): Promise<void> => {
    const tables = Object.values(TABLE_MAP);
    for (const table of tables) {
        if (table === 'settings') continue; 
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    }
};

const bulkAdd = async <T>(storeName: string, items: T[]): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName || items.length === 0) return [];

    try {
        const { userId, companyId } = await getCurrentUserAndCompany();
        if (!userId || !companyId) throw new Error("User not authenticated");

        const itemsWithUser = items.map(item => ({ ...item, user_id: userId, company_id: companyId }));
        const allSavedItems: T[] = [];

        // Chunking for bulk insert
        const chunkSize = 200;
        for (let i = 0; i < itemsWithUser.length; i += chunkSize) {
            let chunk = itemsWithUser.slice(i, i + chunkSize);
            let { data, error } = await supabase
                .from(tableName)
                .insert(chunk)
                .select();

            if (error && isSchemaError(error)) {
                console.warn(`Schema error detected in bulkAdd for ${storeName}:`, error.message);
                const missingCol = extractMissingColumn(error);
                chunk = chunk.map((row: any) => {
                    const r = { ...row };
                    if (missingCol) delete r[missingCol];
                    delete r.createdAt;
                    delete r.purchaseOrderId;
                    delete r.showDimensions;
                    delete r.calculationMode;
                    return r;
                });
                const retryRes = await supabase.from(tableName).insert(chunk).select();
                data = retryRes.data;
                error = retryRes.error;
            }

            if (error) {
                console.error(`Error bulk adding chunk to ${storeName}:`, error);
                const recovered = await handleAuthError(error);
                if (recovered) {
                    const { data: retryData, error: retryError } = await supabase.from(tableName).insert(chunk).select();
                    if (retryError) throw retryError;
                    if (retryData) allSavedItems.push(...(retryData as T[]));
                    continue;
                }
                throw error;
            }
            
            if (data) allSavedItems.push(...(data as T[]));
        }
        
        return allSavedItems;
    } catch (e) {
        if (await handleAuthError(e)) {
            return bulkAdd(storeName, items);
        }
        throw e;
    }
};

const bulkUpdate = async <T extends { id: string }>(storeName: string, items: T[]): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName || items.length === 0) return [];

    try {
        const { companyId } = await getCurrentUserAndCompany();
        if (!companyId) throw new Error("User not authenticated");

        const allSavedItems: T[] = [];
        const chunkSize = 50; 
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            
            let cleanedChunk = chunk.map(item => {
                const { id, paymentMethod, notes, subject, purchaseOrderNumber, dueDate, expiryDate, expectedDate, calculationMode, showDimensions, user_id, userId, created_at, ...itemToSave } = item as any;
                return { id, ...itemToSave, company_id: companyId };
            });

            let { data, error } = await supabase
                .from(tableName)
                .upsert(cleanedChunk)
                .select();

            if (error && isSchemaError(error)) {
                console.warn(`Schema error detected in bulkUpdate for ${storeName}:`, error.message);
                const missingCol = extractMissingColumn(error);
                cleanedChunk = cleanedChunk.map((row: any) => {
                    const r = { ...row };
                    if (missingCol) delete r[missingCol];
                    delete r.createdAt;
                    delete r.purchaseOrderId;
                    delete r.showDimensions;
                    delete r.calculationMode;
                    return r;
                });
                const retryRes = await supabase.from(tableName).upsert(cleanedChunk).select();
                data = retryRes.data;
                error = retryRes.error;
            }

            if (error) {
                console.error(`Error bulk updating chunk in ${storeName}:`, error);
                throw error;
            }
            if (data) allSavedItems.push(...(data as any[]));
        }
        return allSavedItems as any;
    } catch (e) {
        if (await handleAuthError(e)) {
            return bulkUpdate(storeName, items);
        }
        throw e;
    }
};

export const dbService = {
    clients: {
        getAll: () => getAll<Client>('clients'),
        add: (item: Client) => add<Client>('clients', item),
        update: (item: Client) => update<Client>('clients', item),
        delete: (id: string | string[]) => remove('clients', id),
    },
    products: {
        getAll: () => getAll<Product>('products'),
        getById: async (id: string) => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as Product;
        },
        add: (item: Product) => add<Product>('products', item),
        update: (item: Product) => update<Product>('products', item),
        delete: (id: string | string[]) => remove('products', id),
    },
    suppliers: {
        getAll: () => getAll<Supplier>('suppliers'),
        add: (item: Supplier) => add<Supplier>('suppliers', item),
        update: (item: Supplier) => update<Supplier>('suppliers', item),
        delete: (id: string | string[]) => remove('suppliers', id),
    },
    quotes: {
        getAll: () => getAll<Quote>('quotes'),
        add: (item: Quote) => add<Quote>('quotes', item),
        update: (item: Quote) => update<Quote>('quotes', item),
        bulkUpdate: (items: Quote[]) => bulkUpdate<Quote>('quotes', items),
        delete: (id: string | string[]) => remove('quotes', id),
    },
    purchaseOrders: {
        getAll: () => getAll<PurchaseOrder>('purchase_orders'),
        add: (item: PurchaseOrder) => add<PurchaseOrder>('purchase_orders', item),
        update: (item: PurchaseOrder) => update<PurchaseOrder>('purchase_orders', item),
        bulkUpdate: (items: PurchaseOrder[]) => bulkUpdate<PurchaseOrder>('purchase_orders', items),
        delete: (id: string | string[]) => remove('purchase_orders', id),
    },
    invoices: {
        getAll: () => getAll<Invoice>('invoices'),
        add: (item: Invoice) => add<Invoice>('invoices', item),
        update: (item: Invoice) => update<Invoice>('invoices', item),
        bulkUpdate: (items: Invoice[]) => bulkUpdate<Invoice>('invoices', items),
        delete: (id: string | string[]) => remove('invoices', id),
    },
    creditNotes: {
        getAll: () => getAll<CreditNote>('credit_notes'),
        add: (item: CreditNote) => add<CreditNote>('credit_notes', item),
        update: (item: CreditNote) => update<CreditNote>('credit_notes', item),
        bulkUpdate: (items: CreditNote[]) => bulkUpdate<CreditNote>('credit_notes', items),
        delete: (id: string | string[]) => remove('credit_notes', id),
    },
    payments: {
        getAll: () => getAll<Payment>('payments'),
        add: (item: Payment) => add<Payment>('payments', item),
        update: (item: Payment) => update<Payment>('payments', item),
        bulkUpdate: (items: Payment[]) => bulkUpdate<Payment>('payments', items),
        delete: (id: string | string[]) => remove('payments', id),
    },
    deliveryNotes: {
        getAll: () => getAll<DeliveryNote>('delivery_notes'),
        add: (item: DeliveryNote) => add<DeliveryNote>('delivery_notes', item),
        update: (item: DeliveryNote) => update<DeliveryNote>('delivery_notes', item),
        bulkUpdate: (items: DeliveryNote[]) => bulkUpdate<DeliveryNote>('delivery_notes', items),
        delete: (id: string | string[]) => remove('delivery_notes', id),
    },
    stockMovements: {
        getAll: () => getAll<StockMovement>('stock_movements'),
        add: (item: StockMovement) => add<StockMovement>('stock_movements', item),
        delete: (id: string | string[]) => remove('stock_movements', id),
        deleteByProduct: (productId: string | string[]) => remove('stock_movements', productId, 'productId'),
    },
    expenses: {
        getAll: () => getAll<Expense>('expenses'),
        add: (item: Expense) => add<Expense>('expenses', item),
        update: (item: Expense) => update<Expense>('expenses', item),
        delete: (id: string | string[]) => remove('expenses', id),
    },
    employees: {
        getAll: () => getAll<Employee>('employees'),
        add: (item: Employee) => add<Employee>('employees', item),
        update: (item: Employee) => update<Employee>('employees', item),
        delete: (id: string | string[]) => remove('employees', id),
    },
    attendances: {
        getAll: () => getAll<Attendance>('attendances'),
        add: (item: Attendance) => add<Attendance>('attendances', item),
        update: (item: Attendance) => update<Attendance>('attendances', item),
        delete: (id: string | string[]) => remove('attendances', id),
    },
    salaryPayments: {
        getAll: () => getAll<SalaryPayment>('salary_payments'),
        add: (item: SalaryPayment) => add<SalaryPayment>('salary_payments', item),
        update: (item: SalaryPayment) => update<SalaryPayment>('salary_payments', item),
        delete: (id: string | string[]) => remove('salary_payments', id),
    },
    settings: {
        get: async (): Promise<CompanySettings | null> => {
            const getCachedFallback = (): CompanySettings => {
                try {
                    const raw = localStorage.getItem('facturago_company_settings');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') return parsed;
                    }
                } catch (_) {}

                return {
                    id: 'local_cached',
                    companyName: localStorage.getItem('facturago_company_name') || '',
                    address: localStorage.getItem('facturago_company_address') || '',
                    phone: localStorage.getItem('facturago_company_phone') || '',
                    email: localStorage.getItem('facturago_company_email') || '',
                    website: localStorage.getItem('facturago_company_website') || '',
                    ice: localStorage.getItem('facturago_company_ice') || '',
                    rc: localStorage.getItem('facturago_company_rc') || '',
                    fiscalId: localStorage.getItem('facturago_company_if') || '',
                    patente: localStorage.getItem('facturago_company_patente') || '',
                    cnss: localStorage.getItem('facturago_company_cnss') || '',
                    capital: localStorage.getItem('facturago_company_capital') || '',
                    primaryColor: '#10b981',
                    showAmountInWords: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS) !== 'false',
                    documentInfoPosition: (localStorage.getItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION) as any) || 'right',
                    showExpiryDate: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE) !== 'false',
                    logoWidth: parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH) || '200', 10),
                    backgroundLogo: localStorage.getItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO) || undefined,
                    backgroundLogoWidth: parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO_WIDTH) || '450', 10),
                    stampWidth: parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.STAMP_WIDTH) || '220', 10),
                    showLogoWatermark: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_LOGO_WATERMARK) !== 'false',
                    logoWatermarkOpacity: parseFloat(localStorage.getItem(LOCAL_STORAGE_KEYS.LOGO_WATERMARK_OPACITY) || '0.07'),
                    headerTextColor: localStorage.getItem(LOCAL_STORAGE_KEYS.HEADER_TEXT_COLOR) || '#ffffff',
                    tableHeaderBgColor: localStorage.getItem(LOCAL_STORAGE_KEYS.TABLE_HEADER_BG_COLOR) || '#10b981',
                    showTableBorders: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_TABLE_BORDERS) !== 'false',
                    clientPosition: (localStorage.getItem(LOCAL_STORAGE_KEYS.CLIENT_POSITION) as any) || 'right',
                    defaultCurrencyCode: localStorage.getItem(LOCAL_STORAGE_KEYS.DEFAULT_CURRENCY_CODE) || 'MAD',
                    defaultTva: parseFloat(localStorage.getItem(LOCAL_STORAGE_KEYS.DEFAULT_TVA) || '20')
                } as CompanySettings;
            };

            try {
                const { companyId } = await getCurrentUserAndCompany();
                if (!companyId) return getCachedFallback();

                const result: any = await withTimeout(
                    Promise.resolve(
                        supabase
                            .from('settings')
                            .select('*')
                            .eq('company_id', companyId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle()
                    ),
                    12000
                ).catch((err: any) => ({ data: null, error: err }));

                const { data, error } = result || {};
                
                if (error) {
                    if (await handleAuthError(error)) {
                        return dbService.settings.get();
                    }
                    console.warn("Notice fetching settings, using cached fallback:", error?.message || error);
                    return getCachedFallback();
                }

                const settings = data as CompanySettings | null;
                if (settings) {
                    try {
                        const dbCustom = (settings.documentLabels as any)?._customSettings || {};

                        const localShowAmount = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS);
                        if (localShowAmount !== null) {
                            settings.showAmountInWords = localShowAmount === 'true';
                        } else if (dbCustom.showAmountInWords !== undefined) {
                            settings.showAmountInWords = dbCustom.showAmountInWords;
                        } else if (settings.showAmountInWords === undefined) {
                            settings.showAmountInWords = true;
                        }

                        const localInfoPos = localStorage.getItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION);
                        if (localInfoPos !== null) {
                            settings.documentInfoPosition = localInfoPos as 'right' | 'left';
                        } else if (dbCustom.documentInfoPosition !== undefined) {
                            settings.documentInfoPosition = dbCustom.documentInfoPosition;
                        } else if (settings.documentInfoPosition === undefined) {
                            settings.documentInfoPosition = 'right';
                        }

                        const localShowExpiry = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE);
                        if (localShowExpiry !== null) {
                            settings.showExpiryDate = localShowExpiry === 'true';
                        } else if (dbCustom.showExpiryDate !== undefined) {
                            settings.showExpiryDate = dbCustom.showExpiryDate;
                        } else if (settings.showExpiryDate === undefined) {
                            settings.showExpiryDate = true;
                        }

                        const localLogoWidth = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH);
                        if (localLogoWidth !== null) {
                            settings.logoWidth = parseInt(localLogoWidth, 10);
                        } else if (dbCustom.logoWidth !== undefined) {
                            settings.logoWidth = dbCustom.logoWidth;
                        } else if (settings.logoWidth === undefined) {
                            settings.logoWidth = 200;
                        }

                        const localBgLogo = localStorage.getItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO);
                        if (localBgLogo !== null) {
                            settings.backgroundLogo = localBgLogo;
                        } else if (dbCustom.backgroundLogo !== undefined) {
                            settings.backgroundLogo = dbCustom.backgroundLogo;
                        }

                        const localBgLogoWidth = localStorage.getItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO_WIDTH);
                        if (localBgLogoWidth !== null) {
                            settings.backgroundLogoWidth = parseInt(localBgLogoWidth, 10);
                        } else if (dbCustom.backgroundLogoWidth !== undefined) {
                            settings.backgroundLogoWidth = dbCustom.backgroundLogoWidth;
                        } else if (settings.backgroundLogoWidth === undefined) {
                            settings.backgroundLogoWidth = 450;
                        }

                        const localStampWidth = localStorage.getItem(LOCAL_STORAGE_KEYS.STAMP_WIDTH);
                        if (localStampWidth !== null) {
                            settings.stampWidth = parseInt(localStampWidth, 10);
                        } else if (dbCustom.stampWidth !== undefined) {
                            settings.stampWidth = dbCustom.stampWidth;
                        } else if (settings.stampWidth === undefined) {
                            settings.stampWidth = 220;
                        }

                        const localShowWatermark = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_LOGO_WATERMARK);
                        if (localShowWatermark !== null) {
                            settings.showLogoWatermark = localShowWatermark === 'true';
                        } else if (dbCustom.showLogoWatermark !== undefined) {
                            settings.showLogoWatermark = dbCustom.showLogoWatermark;
                        } else if (settings.showLogoWatermark === undefined) {
                            settings.showLogoWatermark = true;
                        }

                        const localWatermarkOpacity = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGO_WATERMARK_OPACITY);
                        if (localWatermarkOpacity !== null) {
                            settings.logoWatermarkOpacity = parseFloat(localWatermarkOpacity);
                        } else if (dbCustom.logoWatermarkOpacity !== undefined) {
                            settings.logoWatermarkOpacity = dbCustom.logoWatermarkOpacity;
                        } else if (settings.logoWatermarkOpacity === undefined) {
                            settings.logoWatermarkOpacity = 0.07;
                        }

                        const localHeaderTextColor = localStorage.getItem(LOCAL_STORAGE_KEYS.HEADER_TEXT_COLOR);
                        if (localHeaderTextColor !== null) {
                            settings.headerTextColor = localHeaderTextColor;
                        } else if (dbCustom.headerTextColor !== undefined) {
                            settings.headerTextColor = dbCustom.headerTextColor;
                        } else if (settings.headerTextColor === undefined) {
                            settings.headerTextColor = '#ffffff';
                        }

                        const localTableHeaderBgColor = localStorage.getItem(LOCAL_STORAGE_KEYS.TABLE_HEADER_BG_COLOR);
                        if (localTableHeaderBgColor !== null) {
                            settings.tableHeaderBgColor = localTableHeaderBgColor;
                        } else if (dbCustom.tableHeaderBgColor !== undefined) {
                            settings.tableHeaderBgColor = dbCustom.tableHeaderBgColor;
                        } else if (settings.tableHeaderBgColor === undefined) {
                            settings.tableHeaderBgColor = settings.primaryColor || '#10b981';
                        }

                        const localShowTableBorders = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_TABLE_BORDERS);
                        if (localShowTableBorders !== null) {
                            settings.showTableBorders = localShowTableBorders === 'true';
                        } else if (dbCustom.showTableBorders !== undefined) {
                            settings.showTableBorders = dbCustom.showTableBorders;
                        } else if (settings.showTableBorders === undefined) {
                            settings.showTableBorders = true;
                        }

                        const localClientPosition = localStorage.getItem(LOCAL_STORAGE_KEYS.CLIENT_POSITION);
                        if (localClientPosition !== null) {
                            settings.clientPosition = localClientPosition as 'left' | 'right';
                        } else if (dbCustom.clientPosition !== undefined) {
                            settings.clientPosition = dbCustom.clientPosition;
                        } else if (settings.clientPosition === undefined) {
                            settings.clientPosition = 'right';
                        }

                        const localCurrency = localStorage.getItem(LOCAL_STORAGE_KEYS.DEFAULT_CURRENCY_CODE);
                        if (localCurrency !== null) {
                            settings.defaultCurrencyCode = localCurrency;
                        } else if (dbCustom.defaultCurrencyCode !== undefined) {
                            settings.defaultCurrencyCode = dbCustom.defaultCurrencyCode;
                        } else if (settings.defaultCurrencyCode === undefined) {
                            settings.defaultCurrencyCode = 'MAD';
                        }

                        const localTva = localStorage.getItem(LOCAL_STORAGE_KEYS.DEFAULT_TVA);
                        if (localTva !== null) {
                            settings.defaultTva = parseFloat(localTva);
                        } else if (dbCustom.defaultTva !== undefined) {
                            settings.defaultTva = dbCustom.defaultTva;
                        } else if (settings.defaultTva === undefined) {
                            settings.defaultTva = 20;
                        }

                        const localFontSize = localStorage.getItem(LOCAL_STORAGE_KEYS.DOCUMENT_FONT_SIZE);
                        if (localFontSize !== null) {
                            settings.documentFontSize = parseInt(localFontSize, 10);
                        } else if (dbCustom.documentFontSize !== undefined) {
                            settings.documentFontSize = dbCustom.documentFontSize;
                        } else if (settings.documentFontSize === undefined) {
                            settings.documentFontSize = 100;
                        }

                        try {
                            localStorage.setItem('facturago_company_settings', JSON.stringify(settings));
                            localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS, String(settings.showAmountInWords));
                            localStorage.setItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION, settings.documentInfoPosition || 'right');
                            localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE, String(settings.showExpiryDate));
                            localStorage.setItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH, String(settings.logoWidth));
                            if (settings.backgroundLogo) {
                                localStorage.setItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO, settings.backgroundLogo);
                            } else {
                                localStorage.removeItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO);
                            }
                            if (settings.backgroundLogoWidth) {
                                localStorage.setItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO_WIDTH, String(settings.backgroundLogoWidth));
                            }
                            localStorage.setItem(LOCAL_STORAGE_KEYS.STAMP_WIDTH, String(settings.stampWidth));
                            localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_LOGO_WATERMARK, String(settings.showLogoWatermark));
                            localStorage.setItem(LOCAL_STORAGE_KEYS.LOGO_WATERMARK_OPACITY, String(settings.logoWatermarkOpacity));
                            localStorage.setItem(LOCAL_STORAGE_KEYS.HEADER_TEXT_COLOR, settings.headerTextColor || '#ffffff');
                            localStorage.setItem(LOCAL_STORAGE_KEYS.TABLE_HEADER_BG_COLOR, settings.tableHeaderBgColor || '#10b981');
                            localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_TABLE_BORDERS, String(settings.showTableBorders));
                            localStorage.setItem(LOCAL_STORAGE_KEYS.CLIENT_POSITION, settings.clientPosition || 'right');
                            localStorage.setItem(LOCAL_STORAGE_KEYS.DEFAULT_CURRENCY_CODE, settings.defaultCurrencyCode || 'MAD');
                            localStorage.setItem(LOCAL_STORAGE_KEYS.DEFAULT_TVA, String(settings.defaultTva ?? 20));
                            localStorage.setItem(LOCAL_STORAGE_KEYS.DOCUMENT_FONT_SIZE, String(settings.documentFontSize ?? 100));
                        } catch (storageErr) {
                            console.error("Failed to write loaded settings to localStorage", storageErr);
                        }
                    } catch (e) {
                        console.error("Error parsing settings options:", e);
                    }
                    return settings;
                }
                return getCachedFallback();
            } catch (e: any) {
                if (await handleAuthError(e)) {
                    return dbService.settings.get();
                }
                console.warn("Settings fetch fallback to local cache:", e?.message || e);
                return getCachedFallback();
            }
        },
        update: async (settings: CompanySettings): Promise<CompanySettings> => {
            // Save to localStorage with safety immediately
            try {
                localStorage.setItem('facturago_company_settings', JSON.stringify(settings));
                if (settings.companyName) localStorage.setItem('facturago_company_name', settings.companyName);
                if (settings.address) localStorage.setItem('facturago_company_address', settings.address);
                if (settings.phone) localStorage.setItem('facturago_company_phone', settings.phone);
                if (settings.email) localStorage.setItem('facturago_company_email', settings.email);
                if (settings.website) localStorage.setItem('facturago_company_website', settings.website);
                if (settings.ice) localStorage.setItem('facturago_company_ice', settings.ice);
                if (settings.rc) localStorage.setItem('facturago_company_rc', settings.rc);
                if (settings.fiscalId) localStorage.setItem('facturago_company_if', settings.fiscalId);
                if (settings.patente) localStorage.setItem('facturago_company_patente', settings.patente);
                if (settings.cnss) localStorage.setItem('facturago_company_cnss', settings.cnss);
                if (settings.capital) localStorage.setItem('facturago_company_capital', settings.capital);

                if (settings.showAmountInWords !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS, String(settings.showAmountInWords));
                }

                if (settings.documentInfoPosition !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION, settings.documentInfoPosition);
                }

                if (settings.showExpiryDate !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE, String(settings.showExpiryDate));
                }

                if (settings.logoWidth !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH, String(settings.logoWidth));
                 }

                if (settings.backgroundLogo !== undefined) {
                    if (settings.backgroundLogo) {
                        localStorage.setItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO, settings.backgroundLogo);
                    } else {
                        localStorage.removeItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO);
                    }
                }

                if (settings.backgroundLogoWidth !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO_WIDTH, String(settings.backgroundLogoWidth));
                }

                if (settings.stampWidth !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.STAMP_WIDTH, String(settings.stampWidth));
                 }

                if (settings.showLogoWatermark !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_LOGO_WATERMARK, String(settings.showLogoWatermark));
                }

                if (settings.logoWatermarkOpacity !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGO_WATERMARK_OPACITY, String(settings.logoWatermarkOpacity));
                }

                if (settings.headerTextColor !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.HEADER_TEXT_COLOR, settings.headerTextColor);
                }

                if (settings.tableHeaderBgColor !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.TABLE_HEADER_BG_COLOR, settings.tableHeaderBgColor);
                }

                if (settings.showTableBorders !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_TABLE_BORDERS, String(settings.showTableBorders));
                }

                if (settings.clientPosition !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.CLIENT_POSITION, settings.clientPosition);
                }
                if (settings.defaultCurrencyCode !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.DEFAULT_CURRENCY_CODE, settings.defaultCurrencyCode);
                }
                if (settings.defaultTva !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.DEFAULT_TVA, String(settings.defaultTva));
                }
                if (settings.documentFontSize !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.DOCUMENT_FONT_SIZE, String(settings.documentFontSize));
                }
            } catch (e) {
                console.error("Error saving to localStorage in db.ts:", e);
            }

            try {
                const { userId, companyId } = await getCurrentUserAndCompany();
                if (!userId || !companyId) return settings;

                // Save to documentLabels._customSettings to persist in database!
                if (!settings.documentLabels) {
                    settings.documentLabels = {};
                }
                (settings.documentLabels as any)._customSettings = {
                    showAmountInWords: settings.showAmountInWords,
                    documentInfoPosition: settings.documentInfoPosition,
                    showExpiryDate: settings.showExpiryDate,
                    logoWidth: settings.logoWidth,
                    backgroundLogo: settings.backgroundLogo,
                    backgroundLogoWidth: settings.backgroundLogoWidth,
                    stampWidth: settings.stampWidth,
                    showLogoWatermark: settings.showLogoWatermark,
                    logoWatermarkOpacity: settings.logoWatermarkOpacity,
                    headerTextColor: settings.headerTextColor,
                    tableHeaderBgColor: settings.tableHeaderBgColor,
                    showTableBorders: settings.showTableBorders,
                    clientPosition: settings.clientPosition,
                    defaultCurrencyCode: settings.defaultCurrencyCode,
                    defaultTva: settings.defaultTva,
                    documentFontSize: settings.documentFontSize
                };
                
                const { data: existingRow, error: fetchError } = await supabase
                    .from('settings')
                    .select('id')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (fetchError) {
                    if (await handleAuthError(fetchError)) {
                        return dbService.settings.update(settings);
                    }
                    console.warn("Notice checking settings row:", fetchError.message);
                }

                const { id, ...settingsData } = settings;
                
                const cleanData = { ...settingsData };
                delete (cleanData as any).created_at;
                delete (cleanData as any).updated_at;

                let resultData, resultError;

                if (existingRow && existingRow.id) {
                    const response = await supabase
                        .from('settings')
                        .update(cleanData) 
                        .eq('id', existingRow.id)
                        .select()
                        .single();
                    resultData = response.data;
                    resultError = response.error;
                } else {
                    const payload = { ...cleanData, user_id: userId, company_id: companyId };
                    const response = await supabase
                        .from('settings')
                        .insert(payload)
                        .select()
                        .single();
                    resultData = response.data;
                    resultError = response.error;
                }

                if (resultError) {
                    if (await handleAuthError(resultError)) {
                        return dbService.settings.update(settings);
                    }
                    console.warn("Supabase Save Warning:", resultError.message || resultError);
                    return settings;
                }

                const finalResult = { 
                    ...(resultData as CompanySettings),
                    showAmountInWords: settings.showAmountInWords,
                    documentInfoPosition: settings.documentInfoPosition,
                    showExpiryDate: settings.showExpiryDate,
                    logoWidth: settings.logoWidth,
                    backgroundLogo: settings.backgroundLogo,
                    backgroundLogoWidth: settings.backgroundLogoWidth,
                    stampWidth: settings.stampWidth,
                    showLogoWatermark: settings.showLogoWatermark,
                    logoWatermarkOpacity: settings.logoWatermarkOpacity,
                    headerTextColor: settings.headerTextColor,
                    tableHeaderBgColor: settings.tableHeaderBgColor,
                    showTableBorders: settings.showTableBorders,
                    clientPosition: settings.clientPosition,
                    defaultCurrencyCode: settings.defaultCurrencyCode,
                    defaultTva: settings.defaultTva,
                    documentFontSize: settings.documentFontSize
                };
                return finalResult;
            } catch (err: any) {
                console.warn("Settings update network fallback:", err?.message || err);
                return settings;
            }
        }
    },
    getAllData: async (): Promise<Record<string, any[]>> => {
        const data: Record<string, any[]> = {};
        const tables = Object.keys(TABLE_MAP);
        
        for (const storeName of tables) {
            if (storeName === 'settings') continue;
            data[storeName] = await getAll(storeName);
        }
        return data;
    },
    clearAllData,
    bulkAdd
};
