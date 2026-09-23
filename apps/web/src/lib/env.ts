export function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error('Missing required env var: SUPABASE_URL');
  }
  if (!publishableKey) {
    throw new Error('Missing required env var: SUPABASE_PUBLISHABLE_KEY');
  }

  return { url, publishableKey };
}
