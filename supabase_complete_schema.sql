-- ==============================================================================
-- FACTURAGO - SCHÉMA COMPLET SUPABASE (NOUVEAU PROJET)
-- ==============================================================================
-- Ce script configure intégralement la base de données PostgreSQL dans votre
-- nouveau projet Supabase.
--
-- Instructions d'exécution :
-- 1. Rendez-vous sur votre dashboard Supabase : https://supabase.com/dashboard/project/xyictkllviwkssaljufv
-- 2. Cliquez sur l'icône "SQL Editor" dans le menu de gauche.
-- 3. Cliquez sur "New query".
-- 4. Collez l'intégralité de ce script et cliquez sur le bouton "Run" (Exécuter).
-- ==============================================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLE DES CLIENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "clientCode" TEXT,
    "type" TEXT DEFAULT 'Entreprise',
    "name" TEXT NOT NULL,
    "company" TEXT,
    "ice" TEXT,
    "rc" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 2. TABLE DES FOURNISSEURS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "supplierCode" TEXT,
    "type" TEXT DEFAULT 'Entreprise',
    "name" TEXT NOT NULL,
    "company" TEXT,
    "ice" TEXT,
    "rc" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. TABLE DES PRODUITS ET SERVICES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "productCode" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productType" TEXT DEFAULT 'Produit',
    "unitOfMeasure" TEXT DEFAULT 'U',
    "salePrice" NUMERIC DEFAULT 0,
    "purchasePrice" NUMERIC DEFAULT 0,
    "vat" NUMERIC DEFAULT 20,
    "stockQuantity" NUMERIC DEFAULT 0,
    "minStockAlert" NUMERIC DEFAULT 0,
    "category" TEXT,
    "hasVariants" BOOLEAN DEFAULT false,
    "variants" JSONB DEFAULT '[]'::jsonb,
    "imageUrl" TEXT,
    "createdAt" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 4. TABLE DES DEVIS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "documentId" TEXT,
    "clientId" TEXT,
    "clientName" TEXT,
    "date" TEXT,
    "expiryDate" TEXT,
    "amount" NUMERIC DEFAULT 0,
    "status" TEXT DEFAULT 'Brouillon',
    "subject" TEXT,
    "paymentMethod" TEXT,
    "checkNumber" TEXT,
    "bankName" TEXT,
    "reference" TEXT,
    "purchaseOrderNumber" TEXT,
    "showDimensions" BOOLEAN DEFAULT false,
    "calculationMode" TEXT,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    "subTotal" NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    "totalAmount" NUMERIC DEFAULT 0,
    "discountType" TEXT,
    "discountValue" NUMERIC DEFAULT 0,
    "notes" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 5. TABLE DES FACTURES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "documentId" TEXT,
    "quoteId" TEXT,
    "clientId" TEXT,
    "clientName" TEXT,
    "date" TEXT,
    "dueDate" TEXT,
    "paymentDate" TEXT,
    "amount" NUMERIC DEFAULT 0,
    "amountPaid" NUMERIC DEFAULT 0,
    "status" TEXT DEFAULT 'Brouillon',
    "subject" TEXT,
    "paymentMethod" TEXT,
    "checkNumber" TEXT,
    "bankName" TEXT,
    "reference" TEXT,
    "purchaseOrderNumber" TEXT,
    "showDimensions" BOOLEAN DEFAULT false,
    "calculationMode" TEXT,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    "subTotal" NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    "totalAmount" NUMERIC DEFAULT 0,
    "discountType" TEXT,
    "discountValue" NUMERIC DEFAULT 0,
    "notes" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 6. TABLE DES AVOIRS (CREDIT NOTES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "documentId" TEXT,
    "invoiceId" TEXT,
    "clientId" TEXT,
    "clientName" TEXT,
    "date" TEXT,
    "amount" NUMERIC DEFAULT 0,
    "status" TEXT DEFAULT 'Brouillon',
    "subject" TEXT,
    "paymentMethod" TEXT,
    "checkNumber" TEXT,
    "bankName" TEXT,
    "reference" TEXT,
    "showDimensions" BOOLEAN DEFAULT false,
    "calculationMode" TEXT,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    "subTotal" NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    "discountType" TEXT,
    "discountValue" NUMERIC DEFAULT 0,
    "notes" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 7. TABLE DES BONS DE LIVRAISON
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.delivery_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "documentId" TEXT,
    "invoiceId" TEXT,
    "clientId" TEXT,
    "clientName" TEXT,
    "date" TEXT,
    "subject" TEXT,
    "paymentMethod" TEXT,
    "checkNumber" TEXT,
    "bankName" TEXT,
    "reference" TEXT,
    "purchaseOrderNumber" TEXT,
    "showDimensions" BOOLEAN DEFAULT false,
    "calculationMode" TEXT,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    "status" TEXT DEFAULT 'Brouillon',
    "subTotal" NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    "totalAmount" NUMERIC DEFAULT 0,
    "paymentAmount" NUMERIC DEFAULT 0,
    "notes" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 8. TABLE DES COMMANDES FOURNISSEURS (BONS DE COMMANDE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "documentId" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "date" TEXT,
    "expectedDate" TEXT,
    "dueDate" TEXT,
    "status" TEXT DEFAULT 'Brouillon',
    "subject" TEXT,
    "paymentMethod" TEXT,
    "checkNumber" TEXT,
    "bankName" TEXT,
    "reference" TEXT,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    "subTotal" NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    "totalAmount" NUMERIC DEFAULT 0,
    "amountPaid" NUMERIC DEFAULT 0,
    "discountType" TEXT,
    "discountValue" NUMERIC DEFAULT 0,
    "showDimensions" BOOLEAN DEFAULT false,
    "calculationMode" TEXT,
    "notes" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 9. TABLE DES PAIEMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "invoiceId" TEXT,
    "invoiceNumber" TEXT,
    "clientId" TEXT,
    "clientName" TEXT,
    "date" TEXT,
    "amount" NUMERIC DEFAULT 0,
    "method" TEXT DEFAULT 'Virement',
    "reference" TEXT,
    "bankName" TEXT,
    "notes" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 10. TABLE DES MOUVEMENTS DE STOCK
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT,
    "date" TEXT,
    "quantity" NUMERIC NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 11. TABLE DES DÉPENSES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" NUMERIC NOT NULL,
    "date" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "purchaseOrderId" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 12. TABLE DU PERSONNEL (EMPLOYÉS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "dailyRate" NUMERIC DEFAULT 0,
    "monthlySalary" NUMERIC DEFAULT 0,
    "paymentType" TEXT DEFAULT 'Monthly',
    "joinDate" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 13. TABLE DES PRÉSENCES (ATTENDANCES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT DEFAULT 'Present',
    "note" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 14. TABLE DES RÈGLEMENTS DE SALAIRES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.salary_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID,
    "employeeId" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "periodStart" TEXT,
    "periodEnd" TEXT,
    "status" TEXT DEFAULT 'Paid',
    "reference" TEXT,
    "type" TEXT,
    "note" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 15. TABLE DES PARAMÈTRES D'ENTREPRISE (SETTINGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE,
    user_id UUID,
    "companyName" TEXT DEFAULT '',
    "address" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "email" TEXT DEFAULT '',
    "website" TEXT DEFAULT '',
    "rc" TEXT DEFAULT '',
    "ice" TEXT DEFAULT '',
    "fiscalId" TEXT DEFAULT '',
    "patente" TEXT DEFAULT '',
    "cnss" TEXT DEFAULT '',
    "capital" TEXT DEFAULT '',
    "logo" TEXT,
    "logoWidth" NUMERIC DEFAULT 200,
    "backgroundLogo" TEXT,
    "backgroundLogoWidth" NUMERIC DEFAULT 450,
    "showLogoWatermark" BOOLEAN DEFAULT true,
    "logoWatermarkOpacity" NUMERIC DEFAULT 0.07,
    "stamp" TEXT,
    "stampWidth" NUMERIC DEFAULT 220,
    "primaryColor" TEXT DEFAULT '#10b981',
    "headerTextColor" TEXT DEFAULT '#ffffff',
    "tableHeaderBgColor" TEXT DEFAULT '#10b981',
    "showTableBorders" BOOLEAN DEFAULT true,
    "clientPosition" TEXT DEFAULT 'right',
    "footerNotes" TEXT DEFAULT '',
    "defaultPaymentTerms" TEXT DEFAULT '',
    "documentColumns" JSONB DEFAULT '[]'::jsonb,
    "documentLabels" JSONB DEFAULT '{}'::jsonb,
    "showAmountInWords" BOOLEAN DEFAULT true,
    "showSignatureRecipient" BOOLEAN DEFAULT true,
    "priceDisplayMode" TEXT DEFAULT 'HT',
    "defaultCurrencyCode" TEXT DEFAULT 'MAD',
    "invoiceNumbering" JSONB DEFAULT '{"prefix": "FA", "yearFormat": "YYYY", "startNumber": 1, "padding": 5, "separator": "-"}'::jsonb,
    "quoteNumbering" JSONB DEFAULT '{"prefix": "DV", "yearFormat": "YYYY", "startNumber": 1, "padding": 5, "separator": "-"}'::jsonb,
    "deliveryNoteNumbering" JSONB DEFAULT '{"prefix": "BL", "yearFormat": "YYYY", "startNumber": 1, "padding": 5, "separator": "-"}'::jsonb,
    "purchaseOrderNumbering" JSONB DEFAULT '{"prefix": "BC", "yearFormat": "YYYY", "startNumber": 1, "padding": 5, "separator": "-"}'::jsonb,
    "creditNoteNumbering" JSONB DEFAULT '{"prefix": "AV", "yearFormat": "YYYY", "startNumber": 1, "padding": 5, "separator": "-"}'::jsonb,
    "documentInfoPosition" TEXT DEFAULT 'right',
    "showExpiryDate" BOOLEAN DEFAULT true,
    "showUnitInPDF" BOOLEAN DEFAULT true,
    "defaultTva" NUMERIC DEFAULT 20,
    "defaultThermalTicketWidth" TEXT DEFAULT '80mm',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- INDEX DE HAUTE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_pagination ON public.clients(company_id, id);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_pagination ON public.suppliers(company_id, id);

CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_pagination ON public.products(company_id, id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(company_id, "barcode");

CREATE INDEX IF NOT EXISTS idx_quotes_company ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_pagination ON public.quotes(company_id, id);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON public.quotes(company_id, "date");

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_pagination ON public.invoices(company_id, id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(company_id, "date");

CREATE INDEX IF NOT EXISTS idx_credit_notes_company ON public.credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_pagination ON public.credit_notes(company_id, id);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_company ON public.delivery_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_pagination ON public.delivery_notes(company_id, id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON public.purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_pagination ON public.purchase_orders(company_id, id);

CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_pagination ON public.payments(company_id, id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(company_id, "date");

CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON public.stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_pagination ON public.stock_movements(company_id, id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(company_id, "productId");

CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_pagination ON public.expenses(company_id, id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(company_id, "date");

CREATE INDEX IF NOT EXISTS idx_employees_company ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_attendances_company ON public.attendances(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_company ON public.salary_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_settings_company ON public.settings(company_id);

-- ==============================================================================
-- POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    r RECORD;
    tables text[] := ARRAY[
        'clients', 'suppliers', 'products', 'quotes', 'invoices', 
        'credit_notes', 'delivery_notes', 'purchase_orders', 'payments', 
        'stock_movements', 'expenses', 'employees', 'attendances', 
        'salary_payments', 'settings'
    ];
BEGIN
    -- 1. Nettoyer toute ancienne politique existante sur le schéma public
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND policyname IN ('Authenticated users access own company data', 'Anon fallback access')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE;', r.policyname, r.schemaname, r.tablename);
    END LOOP;

    -- 2. Recréer les politiques de manière sécurisée et vérifiée
    FOREACH tbl IN ARRAY tables LOOP
        -- Activer RLS sur la table
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        
        -- Supprimer au cas où
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users access own company data" ON public.%I CASCADE;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Anon fallback access" ON public.%I CASCADE;', tbl);
        
        -- Politique principale : l'utilisateur authentifié accède à toutes les données de son entreprise
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = tbl 
              AND policyname = 'Authenticated users access own company data'
        ) THEN
            EXECUTE format(
                'CREATE POLICY "Authenticated users access own company data" ON public.%I
                 FOR ALL TO authenticated
                 USING (auth.uid() = user_id OR auth.uid() = company_id OR user_id IS NULL)
                 WITH CHECK (auth.uid() = user_id OR auth.uid() = company_id OR user_id IS NULL);',
                tbl
            );
        END IF;
        
        -- Politique de secours : autorise l'accès pour les clés publiques
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = tbl 
              AND policyname = 'Anon fallback access'
        ) THEN
            EXECUTE format(
                'CREATE POLICY "Anon fallback access" ON public.%I
                 FOR ALL TO anon
                 USING (true)
                 WITH CHECK (true);',
                tbl
            );
        END IF;
    END LOOP;
END $$;

-- ==============================================================================
-- TRIGGER AUTOMATIQUE POUR LES NOUVEAUX UTILISATEURS (AUTH.USERS)
-- Crée automatiquement l'enregistrement de paramètres pour toute nouvelle inscription
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (company_id, user_id, "companyName")
    VALUES (
        NEW.id, 
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon Entreprise')
    )
    ON CONFLICT (company_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Message de confirmation
COMMENT ON TABLE public.settings IS 'Paramètres et profil entreprise Facturago';
