# DOJO OS — Hollywood Protocol

**90-Day Martial Arts Performance Operating System**

A single-file PWA (Progressive Web App) for tracking a 9-block daily protocol covering meditation, combat training, craft practice, deep work, and recovery. Works fully offline. Optional cloud sync via Supabase.

---

## 🚀 GitHub Pages Deployment (5 minutes)

### 1. Fork or upload this repo
Push all files to a GitHub repository.

### 2. Enable GitHub Pages
`Settings → Pages → Source: Deploy from branch → main → / (root) → Save`

Your app will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### 3. Set up cloud sync (optional)
Cloud sync lets you access your data across devices and share read-only access with a coach.

**a) Create a free Supabase project** at [supabase.com](https://supabase.com)

**b) Run the database setup:**
`Supabase Dashboard → SQL Editor → New Query → paste contents of supabase_setup.sql → Run`

**c) Configure your credentials:**
```
# Copy the example config and fill in your real values
cp config.example.js config.js
```
Edit `config.js` and replace the placeholder values with your Supabase project URL and anon key (found at `Settings → API`).

**d) Add config.js to your deployment** — since it's in `.gitignore`, you'll need to either:
- Upload it manually to your server/hosting, OR
- Use GitHub Actions secrets to inject it at build time, OR
- For GitHub Pages: add it via a deployment step (see below)

> **Security note:** `config.js` is intentionally excluded from version control. The Supabase anon key is safe for client use (RLS policies protect all data), but best practice is to keep it out of public repos. Never commit your `service_role` key anywhere.

---

## 📁 File Structure

```
├── index.html          # The entire app (single file)
├── sw.js               # Service Worker (offline support + caching)
├── manifest.json       # PWA manifest (install to home screen)
├── config.js           # YOUR Supabase credentials — NOT committed
├── config.example.js   # Safe template — copy → config.js
├── supabase-sync.js    # Cloud sync module
├── supabase_setup.sql  # Run once in Supabase SQL Editor
├── 404.html            # Redirect fallback for GitHub Pages
├── .gitignore          # Excludes config.js from version control
└── icons/              # PWA icons (create these — see below)
```

---

## 🖼 Icons

The PWA requires icons in an `icons/` folder. Create icons at these sizes:
`72, 96, 128, 144, 152, 192, 384, 512` px (PNG format).

Quick option: generate all sizes from a single 512×512 PNG using [realfavicongenerator.net](https://realfavicongenerator.net) or [maskable.app](https://maskable.app).

---

## 🔧 Local Development

No build step required. Serve the files with any static server:

```bash
# Python 3
python3 -m http.server 8080

# Node (npx)
npx serve .

# VS Code: Live Server extension
```

Then open `http://localhost:8080`

---

## 🔒 Security

- All data is protected by Supabase Row Level Security (RLS) — each user can only read/write their own data
- The anon key in `config.js` cannot access any data without a valid user session
- Coach access is read-only, enforced both client-side and by RLS policy
- The service worker never caches `config.js` — credentials are always fetched live
- Content Security Policy headers are set in `index.html`

---

## 📱 PWA Installation

- **Android / Chrome / Edge:** Browser will prompt to install. Tap "Add to Home Screen"
- **iOS Safari:** Tap the Share button → "Add to Home Screen"
- **Desktop Chrome/Edge:** Click the install icon in the address bar

---

## ☁️ Coach Access

To grant a coach read-only access to your data, run this in the Supabase SQL Editor **while logged in as yourself:**

```sql
INSERT INTO public.coach_access (athlete_id, coach_email)
VALUES (auth.uid(), 'your-coach@email.com');
```

To revoke:
```sql
DELETE FROM public.coach_access
WHERE athlete_id = auth.uid()
  AND coach_email = 'your-coach@email.com';
```
