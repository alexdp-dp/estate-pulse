-- Estate Pulse — one-time Supabase security setup
-- Run this in Supabase SQL Editor BEFORE publishing the dashboard.
--
-- Why:
-- The browser uses the public anon key, which is normal for Supabase frontends.
-- RLS must therefore be enabled so that the anon role can only READ the two
-- dashboard tables and cannot access the sync configuration/history.
--
-- The sync-google-sheet Edge Function uses SUPABASE_SERVICE_ROLE_KEY internally,
-- so it will continue to write even with RLS enabled.

ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estate pulse read active developers" ON public.developers;
CREATE POLICY "estate pulse read active developers"
ON public.developers
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "estate pulse read monthly metrics" ON public.monthly_metrics;
CREATE POLICY "estate pulse read monthly metrics"
ON public.monthly_metrics
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.developers d
    WHERE d.id = monthly_metrics.developer_id
      AND d.is_active = true
  )
);

-- Intentionally NO anon/authenticated policies on sync_sources or sync_runs.
-- They remain inaccessible to the dashboard.
