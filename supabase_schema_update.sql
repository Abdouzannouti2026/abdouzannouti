-- ==============================================================================
-- FACTURAGO - MISE À JOUR DU SCHÉMA DE BASE DE DONNÉES SUPABASE
-- ==============================================================================
-- Ce script est idempotent et sécurisé pour mettre à jour les tables existantes.
-- Vous pouvez l'exécuter dans le SQL Editor de Supabase (https://xyictkllviwkssaljufv.supabase.co).
-- ==============================================================================

-- 1. Table Settings : format ticket thermique par défaut et colonnes personnalisées
ALTER TABLE IF EXISTS public.settings 
  ADD COLUMN IF NOT EXISTS "defaultThermalTicketWidth" TEXT DEFAULT '80mm';

ALTER TABLE IF EXISTS public.settings 
  ADD COLUMN IF NOT EXISTS "documentColumns" JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.settings 
  ADD COLUMN IF NOT EXISTS "documentLabels" JSONB DEFAULT '{}'::jsonb;

-- 2. Table Avoirs (Credit Notes) : articles et retours
ALTER TABLE IF EXISTS public.credit_notes
  ADD COLUMN IF NOT EXISTS "lineItems" JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.credit_notes
  ADD COLUMN IF NOT EXISTS "calculationMode" TEXT;

ALTER TABLE IF EXISTS public.credit_notes
  ADD COLUMN IF NOT EXISTS "showDimensions" BOOLEAN DEFAULT false;

-- 3. Mise à jour de l'index sur settings
CREATE INDEX IF NOT EXISTS idx_settings_company ON public.settings(company_id);

