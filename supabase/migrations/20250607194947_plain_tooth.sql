/*
  # Comprehensive Journal System Schema Update

  1. New Tables
    - `ai_analysis_summaries` - Store AI-generated summaries for different time periods
    - Update existing tables to support the new system

  2. Changes to existing tables
    - Add user_id and date columns to habits and climbing_sessions
    - Ensure all tables have proper RLS policies

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create AI analysis summaries table
CREATE TABLE IF NOT EXISTS ai_analysis_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  summary_type text NOT NULL, -- 'weekly', 'monthly', 'yearly', 'patterns'
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Update habits table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE habits ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'date'
  ) THEN
    ALTER TABLE habits ADD COLUMN date date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'title'
  ) THEN
    ALTER TABLE habits ADD COLUMN title text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'description'
  ) THEN
    ALTER TABLE habits ADD COLUMN description text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE habits ADD COLUMN frequency text NOT NULL DEFAULT 'daily';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'target'
  ) THEN
    ALTER TABLE habits ADD COLUMN target integer NOT NULL DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'progress'
  ) THEN
    ALTER TABLE habits ADD COLUMN progress integer NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'completed'
  ) THEN
    ALTER TABLE habits ADD COLUMN completed boolean NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'color'
  ) THEN
    ALTER TABLE habits ADD COLUMN color text DEFAULT '#3B82F6';
  END IF;
END $$;

-- Create climbing_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS climbing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  date date NOT NULL,
  location text NOT NULL,
  duration integer NOT NULL DEFAULT 60,
  notes text,
  routes jsonb DEFAULT '[]'::jsonb
);

-- Update journal_entries to ensure date column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'date'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN date date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE ai_analysis_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE climbing_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_analysis_summaries
CREATE POLICY "Users can read own summaries"
  ON ai_analysis_summaries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
  ON ai_analysis_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON ai_analysis_summaries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
  ON ai_analysis_summaries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for habits
CREATE POLICY "Users can read own habits"
  ON habits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
  ON habits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON habits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON habits
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for climbing_sessions
CREATE POLICY "Users can read own climbing sessions"
  ON climbing_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own climbing sessions"
  ON climbing_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own climbing sessions"
  ON climbing_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own climbing sessions"
  ON climbing_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_habits_user_date ON habits(user_id, date);
CREATE INDEX IF NOT EXISTS idx_climbing_sessions_user_date ON climbing_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_period ON ai_analysis_summaries(user_id, period_start, period_end);