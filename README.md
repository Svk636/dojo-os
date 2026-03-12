# DOJO OS v3 — Hollywood Protocol

> 90-Day Performance OS for Martial Arts & Acting

## What Changed in v3
- **Tabs fixed**: Resolved critical JS scoping bug — all 28 nav buttons now respond
- **Current block visible**: Ribbon always shows active block or countdown to next
- **Syntax fix**: Unclosed IIFE in Week Plan module caused silent JS failure in all browsers
- **Dashboard**: Block pills now correctly highlight the active execution block

## Deploy to GitHub Pages (main branch)

### Step 1 — Create repo
1. Go to github.com/new
2. Create a **public** repository (e.g. `dojo-os`)
3. Do **not** initialize with README

### Step 2 — Upload files
Upload these files preserving the exact folder structure:

```
dojo_os_v3.html     <- main app
index.html          <- root redirect
404.html            <- SPA fallback
manifest.json       <- PWA manifest
sw.js               <- service worker
README.md           <- this file
icons/
  icon-72x72.png
  icon-96x96.png
  icon-128x128.png
  icon-144x144.png
  icon-152x152.png
  icon-192x192.png
  icon-384x384.png
  icon-512x512.png
```

**Easiest way:** drag-and-drop all files into the GitHub repo via the web UI.
For `icons/` folder: create the folder first by uploading one icon file with path `icons/icon-192x192.png`.

### Step 3 — Enable GitHub Pages
1. Go to repo **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main` | Folder: `/ (root)`
4. Click **Save**

### Step 4 — Access your PWA
Your app will be live at: `https://USERNAME.github.io/REPO-NAME/`

**Install as PWA:**
- Android/Chrome: tap the install banner or browser menu → "Add to Home Screen"
- iOS/Safari: tap Share → "Add to Home Screen"

---

## Bug Fixes in v3

### Fix 1: Tab Navigation (Critical)
**Root cause:** All core functions (`doNav`, `updDash`, `buildHabits`, etc.) were defined inside an IIFE (Immediately Invoked Function Expression). HTML `onclick="doNav('s0')"` handlers look for functions in global scope — they couldn't find them, so every tab click silently failed.

**Fix:** Added 60+ `window.X = X` exports at the end of the IIFE.

### Fix 2: Week Plan IIFE Unclosed (Critical Syntax Error)
**Root cause:** The Week Plan module was wrapped in an IIFE that never had its closing `})();`. This caused JavaScript engines to report a syntax error and abort ALL script execution — meaning the entire app was non-functional.

**Fix:** Added the missing `})();` closing bracket for the outer Week Plan IIFE.

### Fix 3: Current Block Ribbon Always Visible
**Root cause:** The ribbon (`#rib`) only showed when the current time was inside a defined block. Outside block hours (e.g. early morning or late at night), it disappeared entirely.

**Fix:** Ribbon now always shows — displaying either the active block with progress bar, or a countdown to the next block, or "NIGHT CLOSE" after 21:30.

### Fix 4: Dashboard Implementation Score
**Root cause:** Implementation % was reading from wrong localStorage keys, always returning 0%.

**Fix:** Now reads from `dojo_tf_v1` using correct block score keys.

---

## Storage Keys Reference
| Key | Contents |
|-----|----------|
| `dojo_v1` | Main data (identity, goals, habits, scores) |
| `dojo_tf_v1` | Today's Flow block scores and notes |
| `dojo_bm_v1` | Benchmarks |
| `dojo_phys_v1` | Week Plan physical data |
| `dojo_craft_scores` | Craft score history |
| `dojo_history_v1` | Day history log |

---

## Upgrade from v1/v2
All data is preserved — same localStorage keys. No migration needed.
Just replace `index.html` and `dojo_os_v1.html` with the v3 versions.
