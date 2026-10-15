/**
 * Utility functions for robust document date parsing and sorting.
 * Ensures Invoices (Bons), Quotes (Devis), Credit Notes (Avoirs), and Delivery Notes (BL)
 * are always sorted cleanly by date regardless of creation order.
 */

export const parseDocumentDateToTimestamp = (dateStr?: string): number => {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    const trimmed = dateStr.trim();
    if (!trimmed) return 0;

    // Check if DD/MM/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
        const parts = trimmed.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2].slice(0, 4), 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    // Standard ISO / YYYY-MM-DD
    const t = new Date(trimmed).getTime();
    return isNaN(t) ? 0 : t;
};

export const compareDocumentsByDate = (
    a: { date?: string; documentId?: string; id?: string },
    b: { date?: string; documentId?: string; id?: string },
    direction: 'asc' | 'desc' = 'desc'
): number => {
    const timeA = parseDocumentDateToTimestamp(a.date);
    const timeB = parseDocumentDateToTimestamp(b.date);

    if (timeA !== timeB) {
        return direction === 'desc' ? timeB - timeA : timeA - timeB;
    }

    // Tie-breaker: document ID / number
    const idA = a.documentId || a.id || '';
    const idB = b.documentId || b.id || '';
    return direction === 'desc'
        ? idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' })
        : idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
};

export const sortDocumentsByDate = <T extends { date?: string; documentId?: string; id?: string }>(
    documents: T[],
    direction: 'asc' | 'desc' = 'desc'
): T[] => {
    return [...documents].sort((a, b) => compareDocumentsByDate(a, b, direction));
};
