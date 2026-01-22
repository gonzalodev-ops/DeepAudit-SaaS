-- Migration: Add token tracking and compliance mode support
-- Run this in Supabase SQL Editor

-- Add token tracking columns to audits table
ALTER TABLE audits
ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS processing_mode TEXT DEFAULT 'full' CHECK (processing_mode IN ('full', 'compliance')),
ADD COLUMN IF NOT EXISTS key_moments JSONB DEFAULT '[]'::jsonb;

-- Add index for cost analysis
CREATE INDEX IF NOT EXISTS idx_audits_cost ON audits(cost_usd);
CREATE INDEX IF NOT EXISTS idx_audits_processing_mode ON audits(processing_mode);

-- Add comment for documentation
COMMENT ON COLUMN audits.input_tokens IS 'Tokens de entrada (prompt + audio)';
COMMENT ON COLUMN audits.output_tokens IS 'Tokens de salida (respuesta)';
COMMENT ON COLUMN audits.cost_usd IS 'Costo real calculado en USD';
COMMENT ON COLUMN audits.processing_mode IS 'full = con transcripcion, compliance = solo metadata y citas';
COMMENT ON COLUMN audits.key_moments IS 'Momentos clave con timestamps y citas textuales';

-- View for cost analysis
CREATE OR REPLACE VIEW audit_cost_summary AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_audits,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  AVG(cost_usd) as avg_cost_per_audit,
  processing_mode
FROM audits
WHERE cost_usd IS NOT NULL
GROUP BY DATE_TRUNC('day', created_at), processing_mode
ORDER BY date DESC;
