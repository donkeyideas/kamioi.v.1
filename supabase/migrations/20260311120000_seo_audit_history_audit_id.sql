-- Add audit_id column to seo_audit_history so individual tab handlers
-- can look up the matching seo_audit_results rows.
ALTER TABLE public.seo_audit_history ADD COLUMN IF NOT EXISTS audit_id TEXT;
CREATE INDEX IF NOT EXISTS idx_seo_audit_history_audit_id ON public.seo_audit_history(audit_id);
