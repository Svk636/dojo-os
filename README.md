# DOJO OS v1 — Hollywood Protocol

> 90-Day Performance OS for Martial Arts & Acting

## Deploy to GitHub Pages (main branch)

### Step 1 — Create repo
1. Go to [github.com/new](https://github.com/new)
2. Create a **public** repository (e.g. `dojo-os`)
3. Do **not** initialize with README

### Step 2 — Upload files
Upload these files preserving the exact folder structure:

```
dojo_os_v1.html       ← main app
index.html            ← root redirect
404.html              ← SPA fallback
manifest.json         ← PWA manifest
sw.js                 ← service worker
README.md             ← this file
icons/
  icon.svg
  icon-192.png
  icon-512.png
```

**Easiest way:** drag-and-drop all files into the GitHub repo via the web UI.  
For `icons/` folder: create the folder first by uploading one icon file with path `icons/icon.svg`.

### Step 3 — Enable GitHub Pages
1. Go to repo **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main` | Folder: `/ (root)`
4. Click **Save**

### Step 4 — Access your app
After ~60 seconds your app will be live at:

```
https://YOUR-USERNAME.github.io/REPO-NAME/
```

The root URL redirects automatically to `dojo_os_v1.html`.

---

## Install as PWA

### Android / Chrome
1. Open the app URL in Chrome
2. Tap the **⋮ menu → Add to Home Screen**
3. Or wait for the install prompt inside the app

### iPhone / Safari
1. Open the app URL in Safari
2. Tap **Share → Add to Home Screen**

---

## Files

| File | Purpose |
|---|---|
| `dojo_os_v1.html` | Complete single-file app (all JS/CSS inline) |
| `index.html` | Redirects root URL to the app |
| `404.html` | Catches all unknown paths, redirects to app |
| `manifest.json` | PWA manifest — name, icons, display mode |
| `sw.js` | Service worker — offline cache |
| `icons/` | App icons for home screen & browser |

---

## localStorage Keys

All data is stored locally in the browser:

| Key | Contents |
|---|---|
| `dojo_v1` | Main data object |
| `dojo_tf_v1` | Today's Flow block data |
| `dojo_history_v1` | Daily close history |
| `dojo_phys_v1` | Physical metrics |
| `dojo_craft_scores` | Craft dimension scores |
| `dojo_scenes` | Scene tracker |
| `dojo_tapes` | Reel & tapes |
| `dojo_contacts` | Network contacts |
| `dojo_events` | Events & auditions |
| `dojo_reel_notes` | Reel notes |

**Backup:** Use the Export button in the app to save a JSON snapshot.

---

*DOJO OS — Built for the committed.*
