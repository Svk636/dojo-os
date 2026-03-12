/*
  DOJO OS — Supabase Config TEMPLATE
  ====================================
  1. Copy this file and rename it:  config.js
  2. Go to https://supabase.com → your project → Settings → API
  3. Replace the placeholder values below with YOUR project URL and anon key

  ⚠️  config.js is in .gitignore — it will NOT be committed.
      This template file (config.example.js) IS committed as a safe guide.

  ⚠️  NEVER put your service_role key here. Ever. It bypasses RLS.
      The anon key is safe for client use — it only works with valid sessions + RLS.
*/

window.DOJO_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseKey: 'YOUR_ANON_KEY_HERE'
};
