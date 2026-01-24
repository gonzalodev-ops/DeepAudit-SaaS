-- Migration: Add Enterprise fields for risk detection and retention
-- Run this in Supabase SQL Editor

-- New enterprise-specific columns in audits table
ALTER TABLE audits
ADD COLUMN IF NOT EXISTS call_scenario TEXT CHECK (call_scenario IN
  ('retention', 'cancellation', 'dispute', 'collection', 'support', 'sales')),
ADD COLUMN IF NOT EXISTS client_sentiment TEXT CHECK (client_sentiment IN
  ('hostile', 'negative', 'neutral', 'positive', 'enthusiastic')),
ADD COLUMN IF NOT EXISTS legal_risk_level TEXT CHECK (legal_risk_level IN
  ('critical', 'high', 'medium', 'safe')),
ADD COLUMN IF NOT EXISTS legal_risk_reasons TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS call_outcome TEXT CHECK (call_outcome IN
  ('retained', 'churned', 'hung_up', 'escalated', 'pending')),
ADD COLUMN IF NOT EXISTS suggested_action TEXT CHECK (suggested_action IN
  ('immediate_termination', 'urgent_coaching', 'standard_coaching',
   'model_script', 'recognition', 'none'));

-- Indexes for enterprise queries
CREATE INDEX IF NOT EXISTS idx_audits_legal_risk ON audits(legal_risk_level);
CREATE INDEX IF NOT EXISTS idx_audits_call_outcome ON audits(call_outcome);
CREATE INDEX IF NOT EXISTS idx_audits_suggested_action ON audits(suggested_action);
CREATE INDEX IF NOT EXISTS idx_audits_client_sentiment ON audits(client_sentiment);

-- Comments for documentation
COMMENT ON COLUMN audits.call_scenario IS 'Tipo de escenario detectado en la llamada';
COMMENT ON COLUMN audits.client_sentiment IS 'Sentimiento del cliente durante la llamada';
COMMENT ON COLUMN audits.legal_risk_level IS 'Nivel de riesgo legal detectado';
COMMENT ON COLUMN audits.legal_risk_reasons IS 'Razones del riesgo legal detectado';
COMMENT ON COLUMN audits.call_outcome IS 'Resultado final de la llamada';
COMMENT ON COLUMN audits.suggested_action IS 'Accion sugerida para el agente';
