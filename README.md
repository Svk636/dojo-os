# 🥋 DOJO OS v3 — Hollywood Protocol
### 90-Day Performance Operating System · PWA Edition

---

## What It Is

DOJO OS is a single-file Progressive Web App (PWA) built for martial artists pursuing Hollywood-level performance. It runs entirely in the browser — no server, no login, no subscription. All data lives in your device's `localStorage`. Install it to your home screen and it works fully offline.

---

## File Structure

```
your-deployment-folder/
├── dojo_os_v3.html          ← The entire app (single file)
├── manifest.json            ← PWA identity & icon declarations
├── sw.js                    ← Service Worker (offline + caching)
├── favicon.ico              ← Browser tab icon (16/32/48px)
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png          ← Required: Android home screen
    ├── icon-384.png
    ├── icon-512.png          ← Required: Play Store / splash screens
    └── apple-touch-icon.png  ← iOS home screen (180×180)
```

---

## Deployment

### Option A — GitHub Pages (Recommended, Free)

1. Create a new GitHub repo (e.g. `dojo-os`)
2. Upload all files **maintaining the folder structure above**
3. Go to **Settings → Pages → Source: main branch / root**
4. Your app will be live at `https://yourusername.github.io/dojo-os/dojo_os_v3.html`

> **Important:** GitHub Pages requires HTTPS, which is mandatory for Service Workers and PWA install prompts. It's enabled automatically.

### Option B — Any Static Host

Upload all files to Netlify, Vercel, Cloudflare Pages, or any web host that serves static files over HTTPS. No build step required.

### Option C — Local File (No Install Prompt)

Open `dojo_os_v3.html` directly in a browser. The app works fully, but PWA install and Service Worker features require HTTPS — they will be silently skipped on `file://`.

---

## Installing to Home Screen

### Android (Chrome / Edge)
1. Open the app URL in Chrome
2. The **INSTALL TO HOME SCREEN** modal appears automatically on first load
3. Tap **INSTALL** — the native browser prompt will appear
4. Tap **Add** — done

### iPhone / iPad (Safari)
1. Open the app URL in Safari
2. The install modal will show with iOS instructions
3. Tap the **Share ↑** button at the bottom of Safari
4. Scroll down and tap **"Add to Home Screen"**
5. Tap **Add** — done

### Desktop (Chrome / Edge)
1. Open the app URL
2. Look for the **install icon** (⊕) in the browser address bar, **or**
3. The install modal will appear automatically on first visit
4. Click **Install** in the browser prompt

---

## Updating the App

When you deploy a new version of `dojo_os_v3.html`:

1. **Bump the cache version** in `sw.js`:
   ```js
   const CACHE_VER = 'dojo-os-v3.1.0'; // ← change this
   ```
2. Push to your host
3. The Service Worker will detect the change on next load, fetch the new version, and activate it automatically — no user action needed

---

## Data & Privacy

- **All data is stored locally** in your browser's `localStorage`
- Nothing is sent to any server — ever
- To back up your data: use the **Export** button in the app toolbar
- To restore: use the **Import** button and select your backup JSON
- Clearing browser data / site data **will erase your logs** — export first

---

## PWA Technical Notes

| Feature | Detail |
|---|---|
| Manifest | `./manifest.json` |
| Service Worker | `./sw.js` (Cache-First for assets, Network-First for HTML) |
| Offline Support | Full — entire app cached on first load |
| Install Prompt | Auto on first visit (Chrome/Edge/Android); manual on iOS Safari |
| Display Mode | `standalone` — no browser chrome when installed |
| Theme Color | `#c9a84c` (DOJO Gold) |
| Background Color | `#090909` (DOJO Black) |

---

## Troubleshooting

**Install prompt not appearing**
- Must be served over HTTPS (not `file://` or `http://`)
- Chrome requires the page to have been visited at least once and pass basic PWA criteria
- Check DevTools → Application → Manifest for errors

**App not updating after deploy**
- Hard refresh: `Ctrl+Shift+R` / `Cmd+Shift+R`
- Or: DevTools → Application → Service Workers → **Update**
- Or: bump `CACHE_VER` in `sw.js`

**Data disappeared**
- Check if browser site data was cleared
- Restore from your most recent export JSON

**"Add to Home Screen" missing on iOS**
- Must use Safari — Chrome/Firefox on iOS cannot install PWAs
- iOS 16.4+ supports full PWA install via Safari

---

## License

Personal use only. Built for the Hollywood Protocol — 90-Day Performance OS.
