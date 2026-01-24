-- Migration: Clean database for fresh Enterprise start
-- Run this in Supabase SQL Editor
-- WARNING: This will DELETE all existing audits and calls data

-- Step 1: Delete all audits (child table first due to foreign key)
DELETE FROM audits;

-- Step 2: Delete all calls (parent table)
DELETE FROM calls;

-- Step 3: Reset sequences if any (optional, for clean IDs)
-- Note: UUIDs don't need reset

-- Step 4: Verify tables are empty
SELECT 'audits' as table_name, COUNT(*) as row_count FROM audits
UNION ALL
SELECT 'calls' as table_name, COUNT(*) as row_count FROM calls;

-- Note: Audio files in Supabase Storage should be cleaned manually
-- Go to Storage > audios bucket > Select all > Delete
-- Or keep them if you want to re-upload the same files

-- After running this:
-- 1. Go to Storage > audios bucket and delete old files (optional)
-- 2. Upload new audio files through the app
-- 3. They will be processed with Enterprise fields and new token costs
