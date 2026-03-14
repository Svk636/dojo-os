# DOJO OS v4 — Hollywood Protocol
### 90-Day Performance Operating System · PWA

---

## Deploy to GitHub Pages in 5 minutes

### 1 — Create the repository

```bash
# Option A: GitHub CLI
gh repo create dojo-os --public --clone
cd dojo-os

# Option B: manually
# Create a new public repo at github.com, then clone it
git clone https://github.com/YOUR_USERNAME/dojo-os.git
cd dojo-os
```

### 2 — Copy these files into the repo root

Your repo must look exactly like this:

```
dojo-os/
├── index.html
├── sw.js
├── manifest.json
├── .nojekyll
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    ├── icon-512x512.png
    ├── icon-maskable-192x192.png
    ├── icon-maskable-512x512.png
    ├── apple-touch-icon.png
    ├── screenshot-wide.png        ← replace with real screenshot
    └── screenshot-narrow.png      ← replace with real screenshot
```

> **Note:** `_headers` and `404.html` are **not included**.  
> `_headers` is a Netlify/Cloudflare feature — GitHub Pages ignores it entirely.  
> `404.html` is only needed for path-based SPA routers (React Router, Vue Router etc).  
> This app uses query-param routing (`?goto=sXX`) and never generates deep paths,  
> so neither file has any effect.

### 3 — Push to GitHub

```bash
git add -A
git commit -m "Deploy DOJO OS v4"
git push origin main
```

### 4 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main` · Folder: `/ (root)`
4. Click **Save**

GitHub will give you a URL like:
`https://YOUR_USERNAME.github.io/dojo-os/`

Allow 1–2 minutes for the first build.

---

## Updating the app

Every time you push a new version:

1. **Bump `SW_VERSION`** in `sw.js` — e.g. `'3.2'` → `'3.3'`
   This is the only step required to trigger the in-app update banner.

2. Push:
   ```bash
   git add -A
   git commit -m "v3.3 — describe your changes"
   git push origin main
   ```

3. Users who already have the app installed will see:
   **"NEW VERSION READY — UPDATE NOW"** banner the next time they open it.
   Clicking UPDATE NOW reloads the app with the new version instantly.

---

## Supabase cloud sync (optional)

The app works 100% offline with `localStorage`. Cloud sync lets you access your
data on multiple devices. Credentials are already set inside `index.html` —
search for `DOJO_SB_URL` if you need to change them.

To set up the database:

1. Create a free project at [supabase.com](https://supabase.com)

2. Go to **Dashboard → SQL Editor → New Query**, paste the full contents of
   `dojo_setup_v4.sql`, and click **Run**.

   This creates:
   - `dojo_sync` table — one row per user, holds all 23 localStorage keys
   - `coach_access` table — optional read-only coach access
   - Row Level Security policies — users can only read/write their own row
   - Indexes and auto-updated `updated_at` trigger

3. Your Supabase project URL and anon key are already filled in `index.html`.
   If you need to update them, search for `DOJO_SB_URL` in the file.

4. Open the app, sign in via the **☁ CLOUD SYNC** banner at the top, and
   click **PUSH** to save your data to the cloud.

### Granting coach access (optional)

Run this in the Supabase SQL Editor while signed in as the athlete:

```sql
insert into public.coach_access (athlete_id, coach_email)
values (auth.uid(), 'coach@email.com')
on conflict (athlete_id, coach_email) do nothing;
```

To revoke:
```sql
delete from public.coach_access
where athlete_id = auth.uid() and coach_email = 'coach@email.com';
```

---

## PWA install behaviour

| Platform | Behaviour |
|---|---|
| Android Chrome | Native "Add to Home Screen" banner + full-screen modal on first visit |
| Desktop Chrome / Edge | Install button appears in address bar + modal on first visit |
| iOS Safari | Modal shows with manual "Share → Add to Home Screen" instructions |
| Already installed | All install UI is hidden automatically |

Once installed the app runs fully offline — all data is stored in `localStorage`.

---

## Screenshot placeholders

The two files `icons/screenshot-wide.png` and `icons/screenshot-narrow.png` are
placeholder images. Replace them with real screenshots for the best experience
in the Chrome / Android install dialog:

- `screenshot-wide.png` — 1280 × 720px (desktop / landscape)
- `screenshot-narrow.png` — 390 × 844px (mobile / portrait)

---

## File reference

| File | Purpose |
|---|---|
| `index.html` | Entire app — self-contained, no build step |
| `sw.js` | Service worker — offline cache, update flow |
| `manifest.json` | PWA metadata — name, icons, shortcuts, colours |
| `dojo_setup_v4.sql` | Supabase database setup — run once in SQL Editor |
| `.nojekyll` | Tells GitHub Pages not to run Jekyll (required) |
| `icons/` | All PWA icons (8 sizes + maskable + apple-touch) and screenshots |
