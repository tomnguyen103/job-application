-- Tighten execute privileges on the dashboard stats SECURITY DEFINER RPC.
REVOKE ALL ON FUNCTION public.get_dashboard_job_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_job_stats(uuid) TO authenticated;
