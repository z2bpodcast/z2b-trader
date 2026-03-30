# Z2B Trading Command Centre — PWA Deployment Guide
## Rev Mokoro Manana · Zero2Billionaires Legacy Builders

---

## WHAT IS IN THIS FOLDER

```
z2b-pwa/
├── index.html        ← Your complete trading app (Purple/Gold theme)
├── sw.js             ← Service Worker (offline + notifications)
├── manifest.json     ← PWA manifest (install + home screen)
├── vercel.json       ← Vercel deployment config
├── icons/
│   ├── icon-72.png   ← App icons (all sizes)
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png  ← Primary icon
│   ├── icon-384.png
│   ├── icon-512.png  ← Splash screen icon
│   └── screenshot-mobile.png
└── DEPLOY.md         ← This file
```

---

## DEPLOY TO VERCEL — 3 METHODS

### METHOD 1: DRAG & DROP (Easiest — 2 minutes)

1. Go to **vercel.com** and log in with your GitHub account
2. Click **"Add New Project"**
3. Click **"Upload"** tab (not Import)
4. **Drag the entire z2b-pwa folder** into the upload area
5. Project name: `z2b-trading-centre` (or anything you like)
6. Click **Deploy**
7. Your app is live at: `https://z2b-trading-centre.vercel.app`

---

### METHOD 2: GITHUB + VERCEL (Best for updates)

1. Go to **github.com** → New Repository → name it `z2b-trading-centre`
2. Upload all files from the z2b-pwa folder to the repo
3. Go to **vercel.com** → Add New Project → Import from GitHub
4. Select your `z2b-trading-centre` repo
5. Click Deploy
6. **Future updates:** Just update files on GitHub → Vercel auto-deploys

---

### METHOD 3: VERCEL CLI (For developers)

```bash
npm install -g vercel
cd z2b-pwa
vercel --prod
```

---

## AFTER DEPLOYMENT

### Install on Your Phone (Android)

1. Open Chrome on your Android phone
2. Go to your Vercel URL (e.g. `https://z2b-trading-centre.vercel.app`)
3. Wait 3 seconds — the **INSTALL** banner appears at the bottom
4. Tap **INSTALL**
5. The app appears on your home screen as **"Z2B Trader"**
6. Open it — full screen, no browser bar, works offline

### Install on iPhone (iOS)

1. Open Safari on your iPhone
2. Go to your Vercel URL
3. Tap the **Share** button (box with arrow)
4. Scroll down and tap **"Add to Home Screen"**
5. Tap **"Add"**
6. The Z2B Trader icon appears on your home screen

### Enable Bell Notifications

1. Open the installed app
2. Go to **📡 SCANNER** tab
3. Tap **🔔 ENABLE BELL**
4. Allow notifications when prompted
5. Done — bell fires even when app is in background

---

## HOW YOUR DATA IS SAVED

- All trades saved to **browser localStorage** automatically
- Data persists between sessions on the same device
- **Export CSV weekly** as backup (Journal tab → Export button)
- Daily data (signals, losses) resets automatically each new day

---

## UPDATING THE APP

When you receive an updated version:

**Method A (Drag & Drop):**
1. Go to vercel.com → Your project → Settings → Deployments
2. Upload the new files

**Method B (GitHub):**
1. Replace files in your GitHub repo
2. Vercel auto-deploys within 30 seconds
3. App shows "New version available — tap to update" banner

---

## YOUR APP URL STRUCTURE

After deploying, your app will be at:
- `https://z2b-trading-centre.vercel.app` (or your custom name)

You can also add a **custom domain** from your existing domains:
- Settings → Domains → Add `trade.z2blegacybuilders.co.za`

---

## TECHNICAL DETAILS

| Feature | Status |
|---|---|
| Offline mode | ✅ Full app works without internet |
| Install on phone | ✅ Android + iOS |
| Push notifications | ✅ When bell fires |
| Trade data persistence | ✅ localStorage |
| Live forex data | ✅ Twelve Data API |
| HTTPS (required for PWA) | ✅ Vercel automatic |
| Custom domain | ✅ Add in Vercel settings |
| Auto-updates | ✅ Service worker |

---

## SUPPORT

Built by Claude for Rev Mokoro Manana
Z2B Legacy Builders · z2blegacybuilders.co.za

*"The plans of the diligent lead surely to abundance." — Proverbs 21:5*
