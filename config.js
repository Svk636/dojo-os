/*
  DOJO OS — Supabase Config
  =========================
  1. Go to https://supabase.com → your project → Settings → API
  2. Replace the placeholder values below with YOUR project URL and anon key
  3. The anon key is safe for client use — it has zero access
     without a valid user session + RLS policies enforcing access.

  ⚠️  THIS FILE IS IN .gitignore — it will NOT be committed to your repo.
      See config.example.js for a safe template to reference.

  ⚠️  NEVER put your service_role key here. Ever. It bypasses RLS.
*/

window.DOJO_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseKey: 'YOUR_ANON_KEY_HERE'
};
