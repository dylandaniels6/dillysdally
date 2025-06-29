/*
  # Create journal entries table with Clerk authentication

  1. New Tables
    - `journal_entries`
      - `id` (uuid, primary key)
      - `user_id` (text, Clerk user ID)
      - `title` (text)
      - `content` (text)
      - `mood` (text)
      - `tags` (text[])
      - `date` (date)
      - `ai_reflection` (text)
      - `context_data` (jsonb)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on all tables
    - Add function to extract Clerk user ID from JWT
    - Add policies for authenticated users to manage their own entries
*/

-- Function to get Clerk user ID from JWT claims
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'user_id',
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  mood text DEFAULT 'neutral',
  tags text[] DEFAULT '{}',
  ai_reflection text,
  context_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create income table
CREATE TABLE IF NOT EXISTS income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create net_worth_entries table
CREATE TABLE IF NOT EXISTS net_worth_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  cash_accounts numeric NOT NULL DEFAULT 0,
  liabilities numeric NOT NULL DEFAULT 0,
  assets numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  title text NOT NULL,
  description text,
  frequency text NOT NULL DEFAULT 'daily',
  target integer NOT NULL DEFAULT 1,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  color text DEFAULT '#3B82F6',
  completed_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create climbing_sessions table
CREATE TABLE IF NOT EXISTS climbing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  location text NOT NULL,
  duration integer NOT NULL DEFAULT 60,
  notes text,
  routes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id text PRIMARY KEY,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ai_analysis_summaries table
CREATE TABLE IF NOT EXISTS ai_analysis_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  summary_type text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE climbing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using Clerk user ID function
CREATE POLICY "Users can manage own journal entries"
  ON journal_entries
  FOR ALL
  TO authenticated
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can manage own expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can manage own income"
  ON income
  FOR ALL
  TO authenticated
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can manage own net worth entries"
  ON net_worth_entries
  FOR ALL
  TO authenticated
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can manage own habits"
  ON habits
  FOR ALL
  TO authenticated
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can manage own climbing sessions"
  ON climbing_sessions
  FOR ALL
  TO authenticated
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can manage own tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can manage own profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can manage own AI summaries"
  ON ai_analysis_summaries
  FOR ALL
  TO authenticated
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_income_user_date ON income(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_net_worth_entries_user_date ON net_worth_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habits_user_date ON habits(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_climbing_sessions_user_date ON climbing_sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_period ON ai_analysis_summaries(user_id, period_start, period_end);