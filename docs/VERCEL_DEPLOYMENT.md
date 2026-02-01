# Deploy Family Travel Tracker to Vercel from GitHub

## 1. Push your code to GitHub

If you haven’t already:

```bash
git add .
git commit -m "Ready for Vercel"
git push origin main
```

Repo: **https://github.com/lassise/FamilyTravelTracker**

---

## 2. Connect the repo to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in (use “Continue with GitHub”).
2. Click **Add New…** → **Project**.
3. **Import** the `lassise/FamilyTravelTracker` repo (or paste the GitHub URL).
4. Vercel will detect **Vite** and set:
   - **Framework Preset:** Vite  
   - **Build Command:** `npm run build`  
   - **Output Directory:** `dist`  
   (The repo’s `vercel.json` also sets these and SPA rewrites.)

5. **Do not** click Deploy yet — add env vars first.

---

## 3. Add environment variables

In the same “Configure Project” screen, open **Environment Variables** and add:

| Name | Value | Notes |
|------|--------|------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | From Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key | Same place; use the **anon** key |
| `VITE_MAPBOX_PUBLIC_TOKEN` | (Optional) Mapbox public token | Only if you use the map; can leave blank |

- Copy these from your local `.env` (same names).
- Add them for **Production** (and optionally Preview if you want preview deployments to work).

Then click **Deploy**.

---

## 4. After deploy

- Vercel will build and deploy. The first run usually takes 1–2 minutes.
- You’ll get a URL like `https://family-travel-tracker-xxxx.vercel.app`.
- You can add a **custom domain** in the project’s **Settings → Domains**.

---

## 5. Supabase (auth & API)

- In **Supabase Dashboard → Authentication → URL Configuration**, add your Vercel URL to **Redirect URLs** and **Site URL** (e.g. `https://your-app.vercel.app`).
- If you use Supabase Edge Functions or RLS, your app will call the same Supabase URL; no extra config if you only use the anon key in the frontend.

---

## 6. Re-deploys

Every push to `main` (or your production branch) will trigger a new deployment. Preview deployments are created for other branches/PRs if you enable them.

---

## Troubleshooting

- **Build fails:** Check the build log; ensure all env vars are set and that `npm run build` works locally.
- **Blank page / 404 on refresh:** The `vercel.json` rewrites send all routes to `index.html`; if you removed it, add the rewrites back.
- **Auth redirect broken:** Add the exact Vercel URL (and custom domain) in Supabase redirect URLs.
