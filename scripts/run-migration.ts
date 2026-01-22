import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('Running migration: Add token tracking columns...')

  // Check current table structure
  const { data: columns, error: checkError } = await supabase
    .from('audits')
    .select('*')
    .limit(1)

  if (checkError) {
    console.error('Error checking table:', checkError)
    return
  }

  console.log('Current audit columns:', columns ? Object.keys(columns[0] || {}) : 'empty table')

  // Test if new columns exist by trying to select them
  const { error: testError } = await supabase
    .from('audits')
    .select('input_tokens, output_tokens, cost_usd, processing_mode, key_moments')
    .limit(1)

  if (testError) {
    console.log('New columns do not exist yet. Please run the following SQL in Supabase Dashboard:')
    console.log(`
-- Migration: Add token tracking and compliance mode support
ALTER TABLE audits
ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS processing_mode TEXT DEFAULT 'full',
ADD COLUMN IF NOT EXISTS key_moments JSONB DEFAULT '[]'::jsonb;
    `)
  } else {
    console.log('✓ New columns already exist!')
  }
}

runMigration().catch(console.error)
