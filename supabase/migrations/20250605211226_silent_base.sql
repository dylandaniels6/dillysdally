/*
  # Add AI reflection to journal entries

  1. Changes
    - Add `ai_reflection` column to journal_entries table
    - Add `context_data` column to store additional data points
  
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS ai_reflection text,
ADD COLUMN IF NOT EXISTS context_data jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN journal_entries.ai_reflection IS 'GPT-generated therapeutic reflection';
COMMENT ON COLUMN journal_entries.context_data IS 'Additional context data like habits, mood, etc.';