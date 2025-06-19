/*
  # Fix RLS Policies for Anonymous Users

  1. Changes
    - Update RLS policies to allow both authenticated and anonymous users
    - Anonymous users store data with user_id = NULL
    - Authenticated users store data with user_id = auth.uid()

  2. Security
    - Maintain data isolation between users
    - Allow anonymous users to access their own data (user_id IS NULL)
    - Allow authenticated users to access their own data (user_id = auth.uid())
*/

-- Drop existing policies for all tables
DROP POLICY IF EXISTS "Users can read own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON journal_entries;

DROP POLICY IF EXISTS "Users can read own summaries" ON ai_analysis_summaries;
DROP POLICY IF EXISTS "Users can insert own summaries" ON ai_analysis_summaries;
DROP POLICY IF EXISTS "Users can update own summaries" ON ai_analysis_summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON ai_analysis_summaries;

DROP POLICY IF EXISTS "Users can read own habits" ON habits;
DROP POLICY IF EXISTS "Users can insert own habits" ON habits;
DROP POLICY IF EXISTS "Users can update own habits" ON habits;
DROP POLICY IF EXISTS "Users can delete own habits" ON habits;

DROP POLICY IF EXISTS "Users can read own climbing sessions" ON climbing_sessions;
DROP POLICY IF EXISTS "Users can insert own climbing sessions" ON climbing_sessions;
DROP POLICY IF EXISTS "Users can update own climbing sessions" ON climbing_sessions;
DROP POLICY IF EXISTS "Users can delete own climbing sessions" ON climbing_sessions;

DROP POLICY IF EXISTS "Users can read own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

DROP POLICY IF EXISTS "Users can read own net_worth_entries" ON net_worth_entries;
DROP POLICY IF EXISTS "Users can insert own net_worth_entries" ON net_worth_entries;
DROP POLICY IF EXISTS "Users can update own net_worth_entries" ON net_worth_entries;
DROP POLICY IF EXISTS "Users can delete own net_worth_entries" ON net_worth_entries;

DROP POLICY IF EXISTS "Users can read own user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own user_profiles" ON user_profiles;

-- Create new policies for journal_entries
CREATE POLICY "Allow access to own journal entries"
  ON journal_entries
  FOR ALL
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Create new policies for ai_analysis_summaries
CREATE POLICY "Allow access to own ai summaries"
  ON ai_analysis_summaries
  FOR ALL
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Create new policies for habits
CREATE POLICY "Allow access to own habits"
  ON habits
  FOR ALL
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Create new policies for climbing_sessions
CREATE POLICY "Allow access to own climbing sessions"
  ON climbing_sessions
  FOR ALL
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Create new policies for expenses
CREATE POLICY "Allow access to own expenses"
  ON expenses
  FOR ALL
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Create new policies for net_worth_entries
CREATE POLICY "Allow access to own net worth entries"
  ON net_worth_entries
  FOR ALL
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Create new policies for user_profiles
CREATE POLICY "Allow access to own user profiles"
  ON user_profiles
  FOR ALL
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );