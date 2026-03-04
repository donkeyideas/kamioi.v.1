-- ============================================================================
-- Kamioi Platform - Social Media Posts Migration
-- Version: 008
-- Date: 2026-03-04
-- Description: Adds social media post management table for admin social
--              posting across platforms with AI-powered content generation.
--              Platform credentials and automation config use admin_settings.
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- TABLE: social_media_posts
-- Stores social media posts across all platforms with scheduling
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_media_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform        TEXT NOT NULL
                    CHECK (platform IN ('TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK')),
    content         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELLED')),
    hashtags        TEXT[] DEFAULT '{}',
    image_prompt    TEXT,
    scheduled_at    TIMESTAMPTZ,
    published_at    TIMESTAMPTZ,
    error_message   TEXT,
    platform_post_id TEXT,
    created_by      INT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON public.social_media_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON public.social_media_posts(scheduled_at)
    WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON public.social_media_posts(created_at DESC);

-- updated_at trigger (reuses existing function from 001_schema.sql)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_social_posts_updated_at'
    ) THEN
        CREATE TRIGGER set_social_posts_updated_at
            BEFORE UPDATE ON public.social_media_posts
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;

-- Row Level Security
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_posts_admin_all"
    ON public.social_media_posts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid()
            AND account_type = 'admin'
        )
    );
