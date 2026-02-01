-- FAIghtClub Database Schema
-- Run this in Supabase SQL Editor or via CLI

-- battles table
CREATE TABLE IF NOT EXISTS battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  agent_a_name text NOT NULL,
  agent_b_name text NOT NULL,
  agent_a_code text,
  agent_b_code text,
  agent_a_refined text,
  agent_b_refined text,
  critique text,
  winner text,
  score jsonb,
  created_at timestamptz DEFAULT now()
);

-- leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  agent_name text PRIMARY KEY,
  wins int DEFAULT 0,
  battles int DEFAULT 0,
  avg_score numeric DEFAULT 0
);

-- Enable RLS
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Public read for battles
CREATE POLICY "Public read battles" ON battles
  FOR SELECT USING (true);

-- Public read for leaderboard
CREATE POLICY "Public read leaderboard" ON leaderboard
  FOR SELECT USING (true);

-- Server insert for battles (using service role bypasses RLS anyway)
CREATE POLICY "Server insert battles" ON battles
  FOR INSERT WITH CHECK (true);

-- Server all for leaderboard (using service role bypasses RLS anyway)
CREATE POLICY "Server all leaderboard" ON leaderboard
  FOR ALL USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS battles_created_at_idx ON battles (created_at DESC);
CREATE INDEX IF NOT EXISTS leaderboard_wins_idx ON leaderboard (wins DESC);
