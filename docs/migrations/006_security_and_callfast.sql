-- Migration 006: Security hardening + Callfast schema additions
-- Idempotent: safe to run multiple times

BEGIN;

-- ============================================================
-- PART 1: Drop anonymous RLS policies
-- ============================================================

DROP POLICY IF EXISTS "Allow anon read audits" ON public.audits;
DROP POLICY IF EXISTS "Allow anon read calls" ON public.calls;
DROP POLICY IF EXISTS "Allow anon insert calls" ON public.calls;
DROP POLICY IF EXISTS "Allow anon read tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow anon read users" ON public.users;

-- ============================================================
-- PART 2: billing_status ENUM
-- ============================================================

DO $$ BEGIN
  CREATE TYPE billing_status AS ENUM ('pending', 'billed', 'free_tier');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PART 3: New tables
-- ============================================================

-- campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- subcampaigns
CREATE TABLE IF NOT EXISTS public.subcampaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- commercial_offers
CREATE TABLE IF NOT EXISTS public.commercial_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcampaign_id UUID NOT NULL REFERENCES public.subcampaigns(id),
  offer_data JSONB NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- silence_events
CREATE TABLE IF NOT EXISTS public.silence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id),
  start_seconds FLOAT NOT NULL,
  end_seconds FLOAT NOT NULL,
  duration_seconds FLOAT NOT NULL,
  channel INT NOT NULL, -- 0=agent, 1=client
  silence_type TEXT NOT NULL, -- 'dead_silence' | 'agent_listening' | 'hold'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_silence_events_call_id ON public.silence_events(call_id);

-- usage_logs
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  call_id UUID NOT NULL REFERENCES public.calls(id),
  audio_duration_seconds FLOAT NOT NULL,
  audio_duration_minutes FLOAT NOT NULL,
  pipeline_type TEXT NOT NULL,
  stt_cost_usd NUMERIC(10,6),
  llm_cost_usd NUMERIC(10,6),
  total_internal_cost_usd NUMERIC(10,6),
  billing_status billing_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_billing
  ON public.usage_logs(tenant_id, billing_status, created_at);

-- processing_logs
CREATE TABLE IF NOT EXISTS public.processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  call_id UUID NOT NULL REFERENCES public.calls(id),
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  model_version TEXT,
  prompt_hash TEXT,
  config_snapshot JSONB,
  duration_ms INT,
  input_tokens INT,
  output_tokens INT,
  cost_usd NUMERIC(10,6),
  error_message TEXT,
  audio_duration_seconds FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processing_logs_call_id
  ON public.processing_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_tenant_step
  ON public.processing_logs(tenant_id, step, created_at);
CREATE INDEX IF NOT EXISTS idx_processing_logs_provider
  ON public.processing_logs(provider, created_at);

-- tenant_domains
CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  hostname TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_hostname ON public.tenant_domains(hostname);

-- Seed tenant_domains
INSERT INTO public.tenant_domains (tenant_id, hostname, is_primary)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'localhost:3000', true),
  ('00000000-0000-0000-0000-000000000001', 'app.deepaudit.com', true)
ON CONFLICT (hostname) DO NOTHING;

-- ============================================================
-- PART 4: ALTER TABLE additions
-- ============================================================

-- tenants additions
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS pipeline_type TEXT DEFAULT 'legacy';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gemini_api_key_encrypted TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS stt_api_key_encrypted TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_model TEXT DEFAULT 'platform';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS price_per_minute NUMERIC(10,6);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS price_per_audit NUMERIC(10,6);

-- calls additions
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS stt_transcript_url TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS channel_count INT DEFAULT 1;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id);
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS subcampaign_id UUID REFERENCES public.subcampaigns(id);

-- audits additions
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS agent_transcript TEXT;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS client_transcript TEXT;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS total_silence_seconds FLOAT;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS silence_count INT;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS pipeline_type TEXT;

-- audits: drop deprecated columns
ALTER TABLE public.audits DROP COLUMN IF EXISTS cost_usd;
ALTER TABLE public.audits DROP COLUMN IF EXISTS stt_cost_usd;
ALTER TABLE public.audits DROP COLUMN IF EXISTS input_tokens;
ALTER TABLE public.audits DROP COLUMN IF EXISTS output_tokens;
ALTER TABLE public.audits DROP COLUMN IF EXISTS total_tokens;

-- ============================================================
-- PART 5: RLS on new tables
-- ============================================================

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcampaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- usage_logs: service_role only
DROP POLICY IF EXISTS "Service role full access on usage_logs" ON public.usage_logs;
CREATE POLICY "Service role full access on usage_logs" ON public.usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- processing_logs: service_role only
DROP POLICY IF EXISTS "Service role full access on processing_logs" ON public.processing_logs;
CREATE POLICY "Service role full access on processing_logs" ON public.processing_logs
  FOR ALL USING (auth.role() = 'service_role');

-- campaigns: service_role only
DROP POLICY IF EXISTS "Service role full access on campaigns" ON public.campaigns;
CREATE POLICY "Service role full access on campaigns" ON public.campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- subcampaigns: service_role only
DROP POLICY IF EXISTS "Service role full access on subcampaigns" ON public.subcampaigns;
CREATE POLICY "Service role full access on subcampaigns" ON public.subcampaigns
  FOR ALL USING (auth.role() = 'service_role');

-- commercial_offers: service_role only
DROP POLICY IF EXISTS "Service role full access on commercial_offers" ON public.commercial_offers;
CREATE POLICY "Service role full access on commercial_offers" ON public.commercial_offers
  FOR ALL USING (auth.role() = 'service_role');

-- silence_events: service_role only
DROP POLICY IF EXISTS "Service role full access on silence_events" ON public.silence_events;
CREATE POLICY "Service role full access on silence_events" ON public.silence_events
  FOR ALL USING (auth.role() = 'service_role');

-- tenant_domains: service_role full + authenticated SELECT
DROP POLICY IF EXISTS "Service role full access on tenant_domains" ON public.tenant_domains;
CREATE POLICY "Service role full access on tenant_domains" ON public.tenant_domains
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated read tenant_domains" ON public.tenant_domains;
CREATE POLICY "Authenticated read tenant_domains" ON public.tenant_domains
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- PART 6: Updated RLS policies for existing tables
-- ============================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all on calls" ON public.calls;
DROP POLICY IF EXISTS "Allow all on audits" ON public.audits;
DROP POLICY IF EXISTS "Allow all on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all on users" ON public.users;
DROP POLICY IF EXISTS "Allow read on calls" ON public.calls;
DROP POLICY IF EXISTS "Allow read on audits" ON public.audits;
DROP POLICY IF EXISTS "Allow read on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow read on users" ON public.users;

-- Service role bypass for all tables
DROP POLICY IF EXISTS "Service role full access on calls" ON public.calls;
CREATE POLICY "Service role full access on calls" ON public.calls
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on audits" ON public.audits;
CREATE POLICY "Service role full access on audits" ON public.audits
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on tenants" ON public.tenants;
CREATE POLICY "Service role full access on tenants" ON public.tenants
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Tenant isolation for authenticated users
DROP POLICY IF EXISTS "Tenant isolation on calls" ON public.calls;
CREATE POLICY "Tenant isolation on calls" ON public.calls
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation on audits" ON public.audits;
CREATE POLICY "Tenant isolation on audits" ON public.audits
  FOR ALL
  USING (call_id IN (SELECT id FROM calls WHERE tenant_id IN (SELECT tenant_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Tenant isolation on tenants" ON public.tenants;
CREATE POLICY "Tenant isolation on tenants" ON public.tenants
  FOR SELECT
  USING (id IN (SELECT tenant_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation on users" ON public.users;
CREATE POLICY "Tenant isolation on users" ON public.users
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE auth_id = auth.uid()));

COMMIT;

-- =============================================
-- Auto-create users row on Supabase Auth signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, full_name, tenant_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    '00000000-0000-0000-0000-000000000001',  -- default tenant for POC
    'agent'  -- default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to make idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
