# DOJO OS v1 — Hollywood Performance Protocol

> 90-Day Acting & Combat OS · PWA · Offline-First · Single File

---

## Deploy to GitHub Pages

### Option A — Automatic (recommended)

1. Create a new GitHub repository (public or private)
2. Upload all these files keeping the folder structure:
   ```
   /
   ├── dojo_os_v1.html      ← main app
   ├── index.html           ← redirect entry point
   ├── 404.html             ← SPA fallback
   ├── manifest.json        ← PWA manifest
   ├── sw.js                ← service worker
   ├── icons/
   │   ├── icon.svg
   │   ├── icon-192.png
   │   └── icon-512.png
   └── .github/
       └── workflows/
           └── deploy.yml   ← auto-deploy on push
   ```
3. Go to **Settings → Pages**
4. Set Source to **GitHub Actions**
5. Push to `main` — deploys automatically

Your app will be live at:
`https://<your-username>.github.io/<repo-name>/`

---

### Option B — Manual (drag & drop)

1. Create repo, upload files
2. Go to **Settings → Pages**
3. Set Source to **Deploy from a branch**
4. Choose `main` branch, `/ (root)` folder
5. Save — live in ~60 seconds

---

## Install as PWA

Once deployed:

**Android / Chrome:**
- Visit the URL → tap the install banner or ⋮ menu → *Add to Home Screen*

**iOS / Safari:**
- Visit the URL → tap **Share** → **Add to Home Screen**

**Desktop Chrome/Edge:**
- Visit the URL → click the install icon in the address bar

---

## File Reference

| File | Purpose |
|------|---------|
| `dojo_os_v1.html` | The entire app — all JS, CSS, HTML in one file |
| `index.html` | Entry point — redirects to the app |
| `404.html` | GitHub Pages SPA fallback |
| `manifest.json` | PWA install metadata, icons, shortcuts |
| `sw.js` | Service worker — offline caching |
| `icons/` | App icons for home screen |
| `.github/workflows/deploy.yml` | Auto-deploy GitHub Action |

---

## Data & Privacy

All data is stored **locally on your device** using `localStorage`.
Nothing is sent to any server. Zero tracking.

Export your data anytime via the toolbar: **DATA → EXPORT JSON**

---

## Version

DOJO OS v1 · Hollywood Performance Protocol
