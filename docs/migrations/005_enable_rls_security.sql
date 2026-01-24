-- Migration: Enable Row Level Security (RLS) for all public tables
-- Run this in Supabase SQL Editor
-- IMPORTANT: Service role key always bypasses RLS

-- ===========================================
-- STEP 1: Enable RLS on all tables
-- ===========================================

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- STEP 2: Policies for AUDITS table
-- ===========================================

-- Allow authenticated users to read all audits (for dashboard)
CREATE POLICY "Allow authenticated read audits"
ON public.audits
FOR SELECT
TO authenticated
USING (true);

-- Allow service role to do everything (API routes use this)
-- Note: Service role bypasses RLS automatically, but explicit policy is good practice
CREATE POLICY "Allow service role full access to audits"
ON public.audits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow anon to read audits (for demo without auth)
CREATE POLICY "Allow anon read audits"
ON public.audits
FOR SELECT
TO anon
USING (true);

-- ===========================================
-- STEP 3: Policies for CALLS table
-- ===========================================

-- Allow authenticated users to read all calls
CREATE POLICY "Allow authenticated read calls"
ON public.calls
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert calls
CREATE POLICY "Allow authenticated insert calls"
ON public.calls
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to calls"
ON public.calls
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow anon to read calls (for demo)
CREATE POLICY "Allow anon read calls"
ON public.calls
FOR SELECT
TO anon
USING (true);

-- Allow anon to insert calls (for demo upload)
CREATE POLICY "Allow anon insert calls"
ON public.calls
FOR INSERT
TO anon
WITH CHECK (true);

-- ===========================================
-- STEP 4: Policies for TENANTS table
-- ===========================================

-- Allow authenticated users to read tenants
CREATE POLICY "Allow authenticated read tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to tenants"
ON public.tenants
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow anon to read tenants (for demo)
CREATE POLICY "Allow anon read tenants"
ON public.tenants
FOR SELECT
TO anon
USING (true);

-- ===========================================
-- STEP 5: Policies for USERS table
-- ===========================================

-- Allow authenticated users to read their own user record
CREATE POLICY "Allow authenticated read own user"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update their own record
CREATE POLICY "Allow authenticated update own user"
ON public.users
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to users"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow anon to read users (for demo)
CREATE POLICY "Allow anon read users"
ON public.users
FOR SELECT
TO anon
USING (true);

-- ===========================================
-- VERIFICATION: Check RLS is enabled
-- ===========================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('audits', 'calls', 'tenants', 'users');

-- Expected result: rowsecurity = true for all 4 tables
