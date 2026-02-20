-- ============================================================================
-- Migration 004: Blog Posts
-- ============================================================================
-- Adds the blog_posts table and related blog infrastructure.
-- This table was missing from 001_schema.sql and is required by:
--   - frontend/src/pages/Blog.tsx (public listing)
--   - frontend/src/pages/BlogPost.tsx (single post view)
--   - frontend/src/components/admin/ContentMarketingTab.tsx (CRUD)
--   - supabase/functions/blog-generate (AI content generation)
-- ============================================================================


-- ============================================================================
-- TABLE: blog_posts
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id               SERIAL PRIMARY KEY,
    title            VARCHAR(500) NOT NULL,
    slug             VARCHAR(500) UNIQUE NOT NULL,
    content          TEXT,
    excerpt          TEXT,
    featured_image   TEXT,
    status           VARCHAR(50) DEFAULT 'draft'
                     CHECK (status IN ('draft', 'published')),
    author           VARCHAR(255),
    author_id        INT REFERENCES users(id) ON DELETE SET NULL,
    category         VARCHAR(100),
    tags             JSONB DEFAULT '[]'::jsonb,
    seo_title        VARCHAR(500),
    seo_description  TEXT,
    seo_keywords     TEXT,
    meta_robots      VARCHAR(100) DEFAULT 'index,follow',
    canonical_url    TEXT,
    og_title         VARCHAR(500),
    og_description   TEXT,
    og_image         TEXT,
    schema_markup    TEXT,
    ai_seo_score     INT DEFAULT 0,
    ai_seo_suggestions JSONB DEFAULT '[]'::jsonb,
    read_time        INT DEFAULT 0,
    word_count       INT DEFAULT 0,
    views            INT DEFAULT 0,
    published_at     TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at DESC);

CREATE TRIGGER trigger_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read published posts
CREATE POLICY "blog_posts_public_read"
    ON blog_posts FOR SELECT
    USING (status = 'published');

-- Admin: full access to all posts (draft and published)
CREATE POLICY "blog_posts_admin_all"
    ON blog_posts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.account_type = 'admin'
        )
    );

-- Service role bypass (for edge functions)
CREATE POLICY "blog_posts_service_role"
    ON blog_posts FOR ALL
    USING (auth.role() = 'service_role');
