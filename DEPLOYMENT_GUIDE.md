# 🍽️ Our Table — Deployment Guide

Everything you need to go from these files to a live website, free forever.

**Stack:**
- **Supabase** — free cloud database + real-time sync
- **Vercel** — free hosting with automatic deploys
- **OpenStreetMap / Nominatim** — free map tiles and geocoding (no API key needed)

---

## Step 1 — Set Up Supabase (your database)

1. Go to [supabase.com](https://supabase.com) and click **Start for Free**
2. Sign up with GitHub or email
3. Click **New Project**, give it a name like `our-table`, choose a region close to you, set a database password (save it somewhere), click **Create project**
4. Wait ~2 minutes for it to spin up

### Create the tables

5. In the left sidebar, click **SQL Editor**
6. Click **New query**
7. Copy the entire contents of `supabase-schema.sql` (included with the project files) and paste it in
8. Click **Run** (or press Ctrl+Enter)
9. You should see "Success. No rows returned" — that means it worked ✅

### Change your PIN

10. Still in SQL Editor, run this (replace `1234` with your actual PIN):
```sql
UPDATE settings SET value = 'your-pin-here' WHERE key = 'edit_pin';
```

### Get your API keys

11. In the left sidebar go to **Project Settings → API**
12. Copy two values:
    - **Project URL** — looks like `https://abcxyz.supabase.co`
    - **anon public** key — a long string starting with `eyJ...`

Keep these handy for Step 3.

---

## Step 2 — Put the code on GitHub

1. Go to [github.com](https://github.com) and sign up / log in
2. Click **New repository**, name it `our-table`, keep it **Private**, click **Create repository**
3. On your computer, open a terminal in the `our-table` project folder and run:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/our-table.git
git push -u origin main
```

> If you don't have Git installed: [git-scm.com/downloads](https://git-scm.com/downloads)

---

## Step 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and click **Sign Up** → choose **Continue with GitHub**
2. Click **Add New → Project**
3. Find your `our-table` repo and click **Import**
4. Vercel will auto-detect it's a React app. Before clicking Deploy, click **Environment Variables** and add:

| Name | Value |
|------|-------|
| `REACT_APP_SUPABASE_URL` | your Project URL from Step 1 |
| `REACT_APP_SUPABASE_ANON_KEY` | your anon key from Step 1 |

5. Click **Deploy** and wait ~2 minutes
6. Vercel gives you a free URL like `our-table-xyz.vercel.app` 🎉

---

## Step 4 — Get a nice custom URL (optional, still free)

Vercel lets you set a custom subdomain for free:
1. In Vercel, go to your project → **Settings → Domains**
2. Type something like `our-table` → it'll become `our-table.vercel.app`
3. That's your permanent shareable link

---

## Step 5 — Test it!

1. Open the URL on your phone and your partner's phone
2. Both of you should be able to **view** all restaurants immediately
3. To **add or edit**: click the lock icon → enter your PIN → you're in edit mode
4. Any change either of you makes syncs to the other in **real time** (thanks to Supabase's live subscriptions)

---

## How the PIN works

- The PIN is stored in Supabase's `settings` table
- Without the PIN, the site is **read-only** — anyone with the link can browse, but not edit
- With the PIN, you enter edit mode for that session
- To change the PIN later, just run the SQL update command in Step 1 again

---

## Ongoing: Adding new restaurants from your Google Sheet

In the app, use **Edit mode → add restaurants manually** (recommended), OR:

1. Open your Google Sheet
2. Make sure columns are: `Name | Cuisine | Location | Address | Status | Date | Your Rating | Partner Rating | Note`
3. Select the rows, copy them (Ctrl+C)
4. Use the **Import from Sheets** button in the app

---

## Future updates

Whenever you want to change the app, just edit the files and push to GitHub:

```bash
git add .
git commit -m "describe your change"
git push
```

Vercel automatically rebuilds and redeploys in ~1 minute. No extra steps.

---

## Free tier limits (you won't hit these)

| Service | Free limit |
|---------|------------|
| Supabase | 500MB database, 2GB bandwidth/month, unlimited rows |
| Vercel | 100GB bandwidth/month, unlimited deploys |
| OpenStreetMap | Unlimited map tiles (fair use) |

Both services are genuinely free with no credit card required for the free tier.
