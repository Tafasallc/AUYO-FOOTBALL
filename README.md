# Auyo Football — deployment guide

This turns the chat preview into a real, installable app — completely free.

## 1. Set up the free database (5 min)

The app needs somewhere to store scores/news that every visitor shares (not just
their own phone). Firebase's free tier is plenty for this.

1. Go to https://console.firebase.google.com → **Add project** → name it anything.
2. In the left menu: **Build → Firestore Database → Create database → Start in test mode**.
3. Click the gear icon → **Project settings → General → Your apps → Add app (Web `</>`)**.
4. Firebase shows you a `firebaseConfig` object. Copy it into `src/firebase.js`,
   replacing the placeholder values there.

> Test mode leaves the database open to anyone for 30 days. Before that expires,
> go to Firestore → Rules and lock it down (ask me and I'll write the rules for you).

## 2. Run it locally to check everything works

```
npm install
npm run dev
```

Open the local URL it prints. Try the Admin tab (PIN `2027`) and confirm scores save.

## 3. Deploy it for free (pick one)

**Netlify (easiest, drag-and-drop):**
```
npm run build
```
Go to https://app.netlify.com/drop and drag the generated `dist` folder in.
You get a live `https://your-app.netlify.app` URL instantly, for free.

**Vercel (best if you're using GitHub):**
Push this folder to a GitHub repo, then go to https://vercel.com/new, import the
repo, and click Deploy. Free tier, auto-redeploys whenever you push changes.

## 4. Install it like an app on phones

No app store needed:

- **Android (Chrome):** open the live URL → menu (⋮) → **Add to Home screen**.
- **iPhone (Safari):** open the live URL → Share icon → **Add to Home Screen**.

It installs as a full-screen icon with no browser bar, works like a native app.

## 5. Optional: an actual Play Store / App Store listing

If you eventually want it in the Google Play Store or Apple App Store instead of
"Add to Home Screen":

- Go to https://www.pwabuilder.com, paste your deployed URL, and it packages your
  site into an Android APK/AAB or iOS project automatically.
- Google Play: one-time $25 developer fee.
- Apple App Store: $99/year developer fee, and you'll need a Mac with Xcode to
  submit it.

This step is optional — the free "Add to Home Screen" install already looks and
behaves like a real app for your players and fans.
