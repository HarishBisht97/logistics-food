# IPT APC food

Order lunch with the team. Prices already include GST. A draft on your phone is not an order until you press **Place order**.

## For the team

1. Open the site, then sign in with your email and password. First time, tap **Create an account**. The admin account must use `26m0311@iitb.ac.in`.
2. Pick your name once. Nobody else can take it after that.
3. Check the date at the top. It starts on today (India time).
4. Add dishes with **+** and **−**. **Main order** counts toward your limit. **Extra order** does not — use it only when budget is left. The orange dashed border means you are adding extras.
5. The meter on the right (or at the bottom of your phone) shows `spent / limit`. Green means you are within the limit, including exactly on it. Red means you are over.
6. **Place order** when you are done. The button turns green and shows the time. If you change anything after that, it goes back to a draft and you need to place it again.
7. Changes save on their own. You should see **Saving…** then **Saved**. If a red message appears, tap **Retry save** — don’t assume it went through.
8. **Ordering with friends** shares one order. The limit becomes the per-person limit times the number of people. Someone already in another group is greyed out. **Leave group** gives you an empty order; the others keep the dishes.

The limit starts at ₹6,000 for the day, split across 21 people (₹285.71 each), unless the admin sets a different budget. That updates live.

## Admin

Only `26m0311@iitb.ac.in` sees the admin page. Set a date’s budget, check who has placed, read the kitchen summary (one combined quantity per dish), and download the CSV. The file has a UTF-8 BOM so Excel shows ₹ correctly. **Release a name** if someone claimed the wrong one.

## Set up Firebase and deploy

From this folder, with the [Firebase CLI](https://firebase.google.com/docs/cli) installed:

```bash
npm install -g firebase-tools
firebase login
firebase projects:create ipt-apc-food --display-name "IPT APC food"
firebase use ipt-apc-food
```

If that project id is taken, pick another and use it in `firebase use`, `.firebaserc`, and `VITE_FIREBASE_PROJECT_ID`.

Turn on email sign-in in the console: Authentication → Sign-in method → Email/Password → Enable. Under Authentication → Settings → Authorized domains, keep `localhost` and the Hosting domain.

```bash
firebase firestore:databases:create "(default)" --location asia-south1 --project ipt-apc-food
firebase apps:create web "IPT APC food" --project ipt-apc-food
firebase apps:sdkconfig web --project ipt-apc-food
```

Copy `.env.example` to `.env` and fill in the SDK config:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

```bash
npm install
npm test
npm run build
firebase deploy --only firestore:rules,hosting
```

Vite 7 prints a warning on Node 20.18. The build still completes. Node 20.19 or newer removes that warning.

`firebase deploy` also runs the production build before upload. The admin email in `src/lib/constants.ts` and `firestore.rules` must stay the same.

Menu prices live in `src/data/menu.json` and should not be edited.
# logistics-food
