CREATE TABLE IF NOT EXISTS public.run_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  type text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  votes jsonb NOT NULL DEFAULT '{}',
  timeout_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  result text,
  resolved_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS run_votes_session_id_status_idx
  ON public.run_votes(session_id, status);

ALTER TABLE public.run_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session members can read votes" ON public.run_votes;
DROP POLICY IF EXISTS "session members can vote" ON public.run_votes;
DROP POLICY IF EXISTS "host can create votes" ON public.run_votes;

CREATE POLICY "session members can read votes"
  ON public.run_votes FOR SELECT
  USING (
    session_id IN (
      SELECT session_id FROM public.session_members
      WHERE player_id = auth.uid()
    )
  );

CREATE POLICY "session members can vote"
  ON public.run_votes FOR UPDATE
  USING (
    session_id IN (
      SELECT session_id FROM public.session_members
      WHERE player_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT session_id FROM public.session_members
      WHERE player_id = auth.uid()
    )
  );

CREATE POLICY "host can create votes"
  ON public.run_votes FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE host_id = auth.uid()
         OR created_by = auth.uid()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'run_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.run_votes;
  END IF;
END $$;
