
import { Client, Supplier, CompanySettings } from '../types';
import { generatePDFBlob } from './pdfService';

let isSharing = false;

export const shareDocument = async (
    type: string,
    doc: any,
    settings: CompanySettings | null,
    recipient: Client | Supplier | undefined,
    isRTL: boolean = false,
    language: string = 'fr',
    existingBlob?: Blob
) => {
    // We remove the global isSharing guard to avoid getting stuck
    const documentId = doc.documentId || doc.id;
    const amount = doc.amount || doc.totalAmount || 0;
    const formattedAmount = amount.toLocaleString('fr-FR', { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' });
    
    let message = '';
    if (isRTL) {
        message = `مرحباً، إليكم ${type} رقم ${documentId} بمبلغ ${formattedAmount}. شكراً لكم.`;
    } else {
        message = `Bonjour, voici votre ${type} #${documentId} d'un montant de ${formattedAmount}. Merci.`;
    }

    // Try sharing via Web Share API (Mobile browsers / Safari)
    if (navigator.share) {
        try {
            const blob = existingBlob || await generatePDFBlob(type as any, doc, settings, recipient);
            const fileName = `${type.toLowerCase().replace(/\s+/g, '_')}_${documentId}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });

            // Check if file sharing is supported
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `${type} #${documentId}`,
                    text: message,
                });
                return; // Success
            }
        } catch (error: any) {
            // Silently catch AbortError (user cancelled)
            if (error.name === 'AbortError') return;
            console.error('Web Share failed, falling back to WhatsApp:', error);
        }
    }

    // Fallback: Open WhatsApp directly with a text message
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Some browsers block window.open if it happens too long after a user click
    // We try it, and if it fails or returns null, we can try other methods or alert the user
    const newWindow = window.open(whatsappUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Fallback for popup blockers
        window.location.href = whatsappUrl;
    }
};
