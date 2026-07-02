-- Aggregate dashboard job stats in the database so the Dashboard page does not
-- depend on row-capped PostgREST result sets for all-time counts and averages.
CREATE OR REPLACE FUNCTION public.get_dashboard_job_stats(p_user_id uuid)
RETURNS TABLE (
  total_jobs_found bigint,
  avg_match_rate numeric,
  companies_researched bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    count(*)::bigint AS total_jobs_found,
    avg(jobs.match_score)::numeric AS avg_match_rate,
    count(*) FILTER (WHERE jobs.company_research IS NOT NULL)::bigint AS companies_researched
  FROM public.jobs
  WHERE jobs.user_id = p_user_id
    AND auth.uid() IS NOT NULL
    AND auth.uid() IS NOT DISTINCT FROM p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_job_stats(uuid) TO authenticated;
