-- Amélioration des performances pour les comptes avec beaucoup de données
-- Exécutez ces commandes dans votre console SQL Supabase (SQL Editor)

-- Index pour accélérer le filtrage par entreprise sur les tables principales
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);

-- Index composite pour la pagination rapide (filtrage + ordonnancement)
CREATE INDEX IF NOT EXISTS idx_products_company_pagination ON products(company_id, id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_pagination ON invoices(company_id, id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_pagination ON stock_movements(company_id, id);
CREATE INDEX IF NOT EXISTS idx_payments_company_pagination ON payments(company_id, id);
