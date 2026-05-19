-- ═══════════════════════════════════════════════════════════════
-- Blog CMS — Add Missing Columns to Existing blog_posts table
-- Run this in Supabase SQL Editor if blog_posts already exists
-- ═══════════════════════════════════════════════════════════════

-- Add SEO columns if missing
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS focus_keyword TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 0;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_checks JSONB;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_image TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS reading_time INTEGER DEFAULT 1;

-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add category FK if missing
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL;

-- Create media table if not exists
CREATE TABLE IF NOT EXISTS blog_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    alt_text TEXT DEFAULT '',
    mime_type TEXT,
    size_bytes INTEGER,
    post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);

-- Seed default categories
INSERT INTO blog_categories (name, slug, description) VALUES
    ('Digital Marketing', 'digital-marketing', 'Digital marketing tips'),
    ('SEO', 'seo', 'Search engine optimization'),
    ('Web Development', 'web-development', 'Web dev tutorials'),
    ('Social Media', 'social-media', 'Social media strategies'),
    ('Business Growth', 'business-growth', 'Growth and scaling tips'),
    ('Case Studies', 'case-studies', 'Client success stories')
ON CONFLICT (slug) DO NOTHING;

-- Disable RLS for admin access (or add your own policies)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key (for development)
CREATE POLICY IF NOT EXISTS "Allow all blog_posts" ON blog_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all blog_categories" ON blog_categories FOR ALL USING (true) WITH CHECK (true);
