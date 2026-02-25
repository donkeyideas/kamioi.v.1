-- ============================================================================
-- Kamioi Platform - Smart Receipt Processing Migration
-- Version: 007
-- Date: 2026-02-25
-- Description: Adds receipt processing tables, storage setup, and
--              receipt-sourced transaction tracking
-- ============================================================================

-- Ensure search_path includes public
SET search_path TO public, storage, auth;

-- ============================================================================
-- TABLE: receipts
-- Stores uploaded receipt images and their AI-extracted data
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
    id               SERIAL PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    filename         TEXT NOT NULL,
    storage_path     TEXT NOT NULL,
    file_type        TEXT NOT NULL
                     CHECK (file_type IN ('image/png', 'image/jpeg', 'application/pdf')),
    file_size_bytes  INTEGER,
    status           TEXT NOT NULL DEFAULT 'uploaded'
                     CHECK (status IN ('uploaded', 'processing', 'parsed', 'allocated', 'completed', 'failed')),
    ai_provider      TEXT CHECK (ai_provider IN ('deepseek', 'claude', 'openai')),
    raw_ocr_text     TEXT,
    parsed_data      JSONB,
    allocation_data  JSONB,
    round_up_amount  DECIMAL(10,2),
    user_corrections JSONB,
    error_message    TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON public.receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts(created_at DESC);

-- updated_at trigger (re-uses the function from 001_schema.sql)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_receipts_updated_at'
    ) THEN
        CREATE TRIGGER set_receipts_updated_at
            BEFORE UPDATE ON public.receipts
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: receipt_allocations
-- Links receipt → stock allocation with amounts and confidence
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipt_allocations (
    id                    SERIAL PRIMARY KEY,
    receipt_id            INT NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
    transaction_id        INT REFERENCES public.transactions(id) ON DELETE SET NULL,
    stock_symbol          VARCHAR(10) NOT NULL,
    stock_name            TEXT,
    allocation_amount     DECIMAL(10,2) NOT NULL,
    allocation_percentage DECIMAL(5,2) NOT NULL,
    confidence            DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    reason                TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_alloc_receipt ON public.receipt_allocations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_alloc_txn ON public.receipt_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipt_alloc_symbol ON public.receipt_allocations(stock_symbol);

ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ADD receipt_id to transactions (links receipt-sourced transactions)
-- ============================================================================
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS receipt_id INT REFERENCES public.receipts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_receipt ON public.transactions(receipt_id)
    WHERE receipt_id IS NOT NULL;

-- ============================================================================
-- Supabase Storage: create receipts bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false,
    10485760,  -- 10 MB
    ARRAY['image/png', 'image/jpeg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own receipts folder
CREATE POLICY "Users can upload receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own receipts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own receipts"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Service role can access all receipts (for edge functions)
CREATE POLICY "Service role full access to receipts"
    ON storage.objects FOR ALL
    USING (bucket_id = 'receipts' AND auth.role() = 'service_role');
