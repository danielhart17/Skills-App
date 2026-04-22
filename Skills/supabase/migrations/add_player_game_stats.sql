-- Migration: Parent game stats logging + allow parents to save shooting sessions for linked children

-- =============================================
-- PLAYER GAME STATS
-- =============================================
CREATE TABLE IF NOT EXISTS public.player_game_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_date DATE NOT NULL,
  opponent TEXT,
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  fg_made INTEGER DEFAULT 0,
  fg_attempted INTEGER DEFAULT 0,
  three_made INTEGER DEFAULT 0,
  three_attempted INTEGER DEFAULT 0,
  ft_made INTEGER DEFAULT 0,
  ft_attempted INTEGER DEFAULT 0,
  shot_chart JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_game_stats_parent_id ON public.player_game_stats(parent_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_child_id ON public.player_game_stats(child_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_game_date ON public.player_game_stats(game_date DESC);

ALTER TABLE public.player_game_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can manage their own game stats logs"
  ON public.player_game_stats
  FOR ALL
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

COMMENT ON TABLE public.player_game_stats IS 'Game box scores and shot charts logged by parents for linked children';

-- =============================================
-- SHOOTING SESSIONS: parent may insert for linked child (Parent Dashboard tab 4)
-- =============================================
CREATE POLICY "Parents insert shooting sessions for linked children"
  ON public.shooting_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid()
        AND pcl.child_id = shooting_sessions.user_id
        AND pcl.status = 'linked'
    )
  );
