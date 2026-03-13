# DOJO OS v3 — Hollywood Protocol
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
├── 404.html
├── _headers
├── .nojekyll
└── icons/
    ├── icon-192x192.png
    ├── icon-512x512.png
    ├── icon-maskable-192x192.png
    ├── icon-maskable-512x512.png
    ├── screenshot-wide.png        ← replace with real screenshot
    └── screenshot-narrow.png      ← replace with real screenshot
```

### 3 — Push to GitHub

```bash
git add -A
git commit -m "Deploy DOJO OS v3"
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

1. **Bump `SW_VERSION`** in `sw.js` — e.g. `'3.1'` → `'3.2'`
   This is the only step required to trigger the in-app update banner.

2. Push:
   ```bash
   git add -A
   git commit -m "v3.2 — describe your changes"
   git push origin main
   ```

3. Users who already have the app installed will see:
   **"NEW VERSION READY — UPDATE NOW"** banner the next time they open it.
   Clicking UPDATE NOW reloads the app with the new version instantly.

---

## Supabase cloud sync (optional)

The app works 100% offline with `localStorage`. To enable cross-device sync:

1. Create a free project at [supabase.com](https://supabase.com)
2. Run this SQL in the Supabase SQL editor to create the sync table:

```sql
create table dojo_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security: users can only read/write their own row
alter table dojo_sync enable row level security;

create policy "own row" on dojo_sync
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

3. Open `index.html`, search for `DOJO_SB_URL` and fill in your project URL and anon key:

```js
var DOJO_SB_URL = 'https://YOUR_PROJECT.supabase.co';
var DOJO_SB_KEY = 'YOUR_ANON_KEY';
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
solid-black placeholders. Replace them with real screenshots for the best
experience in the Chrome / Android install dialog:

- `screenshot-wide.png` — 1280 × 720px (desktop / landscape)
- `screenshot-narrow.png` — 390 × 844px (mobile / portrait)

---

## File reference

| File | Purpose |
|---|---|
| `index.html` | Entire app — self-contained, no build step |
| `sw.js` | Service worker — offline cache, update flow |
| `manifest.json` | PWA metadata — name, icons, shortcuts, colours |
| `404.html` | GitHub Pages SPA fallback for deep links |
| `_headers` | HTTP headers — MIME types, cache policy, security |
| `.nojekyll` | Tells GitHub Pages not to run Jekyll (required) |
| `icons/` | All PWA icons + screenshots |
