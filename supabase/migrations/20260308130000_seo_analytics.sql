-- SEO Analytics tables for audit results, history, and recommendations

CREATE TABLE IF NOT EXISTS public.seo_audit_results (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id                TEXT NOT NULL,
    page_url                TEXT NOT NULL,
    page_name               TEXT,
    overall_score           INT DEFAULT 0,
    title_tag               TEXT,
    title_length            INT DEFAULT 0,
    title_status            TEXT DEFAULT 'unknown',
    meta_description        TEXT,
    meta_description_length INT DEFAULT 0,
    meta_description_status TEXT DEFAULT 'unknown',
    canonical_url           TEXT,
    canonical_valid         BOOLEAN DEFAULT TRUE,
    h1_count                INT DEFAULT 0,
    h1_values               JSONB DEFAULT '[]',
    images_total            INT DEFAULT 0,
    images_with_alt         INT DEFAULT 0,
    structured_data_types   JSONB DEFAULT '[]',
    structured_data_valid   BOOLEAN DEFAULT TRUE,
    og_tags_complete        BOOLEAN DEFAULT FALSE,
    internal_links          INT DEFAULT 0,
    external_links          INT DEFAULT 0,
    has_faq_schema          BOOLEAN DEFAULT FALSE,
    faq_count               INT DEFAULT 0,
    issues                  JSONB DEFAULT '[]',
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.seo_audit_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_date      TEXT NOT NULL,
    overall_score   INT DEFAULT 0,
    technical_score INT DEFAULT 0,
    content_score   INT DEFAULT 0,
    geo_score       INT DEFAULT 0,
    aeo_score       INT DEFAULT 0,
    cro_score       INT DEFAULT 0,
    pages_audited   INT DEFAULT 0,
    total_issues    INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.seo_recommendations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority        TEXT NOT NULL CHECK (priority IN ('critical', 'important', 'nice_to_have')),
    category        TEXT NOT NULL CHECK (category IN ('technical', 'content', 'structured_data', 'geo', 'aeo', 'cro', 'performance')),
    title           TEXT NOT NULL,
    description     TEXT,
    impact          TEXT DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
    effort          TEXT DEFAULT 'medium' CHECK (effort IN ('high', 'medium', 'low')),
    affected_pages  JSONB DEFAULT '[]',
    status          TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    resolved_at     TIMESTAMPTZ,
    dismissed_at    TIMESTAMPTZ,
    audit_id        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_audit_results_audit_id ON public.seo_audit_results(audit_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_history_date ON public.seo_audit_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_recommendations_status ON public.seo_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_seo_recommendations_category ON public.seo_recommendations(category);
