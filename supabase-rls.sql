-- ══════════════════════════════════════════════════════════════════
-- ABIAL BLOG CMS — Supabase Row Level Security (RLS) Policies
-- Run this in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- Step 1: Enable RLS on all tables
ALTER TABLE blog_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories  ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- blog_posts policies
-- ────────────────────────────────────────────────────────────────

-- Public (anon): Can only READ published posts
CREATE POLICY "Public: read published posts"
  ON blog_posts FOR SELECT
  TO anon
  USING (status = 'published');

-- Authenticated (CMS admin): Full access to all posts
CREATE POLICY "Auth: full CRUD on posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- blog_categories policies
-- ────────────────────────────────────────────────────────────────

-- Public (anon): Can READ categories
CREATE POLICY "Public: read categories"
  ON blog_categories FOR SELECT
  TO anon
  USING (true);

-- Authenticated (CMS admin): Full access to categories
CREATE POLICY "Auth: full CRUD on categories"
  ON blog_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- Verify: Check RLS is enabled
-- ────────────────────────────────────────────────────────────────
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('blog_posts', 'blog_categories');
-- rowsecurity should be 'true' for both tables
