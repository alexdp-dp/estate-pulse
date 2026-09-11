# Estate Pulse — live Supabase build

Static dashboard build prepared for GitHub / GitHub Pages.

## What changed from the demo

- Removed all mock/demo datasets.
- Removed the "Campanii" section.
- Removed "DATE DEMONSTRATIVE", "DEMO", "Reîncarcă demo" and "Google Sheets neconectat".
- Removed fake campaign/channel data and fake spend/CPL fallback.
- Dashboard now reads live values from Supabase:
  - `developers`
  - `monthly_metrics`
- The current BLU data is therefore shown directly from the Google Sheets → Supabase sync.
- Spend/CPL remain `—` until media spend is imported into `monthly_metrics.spend`.

## IMPORTANT — do this before making the repo/site public

Open Supabase → SQL Editor and run the whole file:

`SECURITY_SETUP.sql`

At the moment this project was packaged, RLS was disabled on the four public tables.
The browser key in `config.js` is a public Supabase publishable key (normal for client-side Supabase),
but it is only safe once RLS restricts access.

`SECURITY_SETUP.sql`:
- allows read-only access to active developers;
- allows read-only access to monthly dashboard metrics;
- blocks browser access to `sync_sources` and `sync_runs`;
- does not break `sync-google-sheet`, because that Edge Function uses the service-role key.

## Deploy on GitHub Pages

1. Create/open the repository.
2. Upload all files from this folder to the repository root.
3. Commit/push.
4. GitHub → Settings → Pages.
5. Source: `Deploy from a branch`.
6. Branch: `main`, folder `/ (root)`.
7. Save.

There is no Node build step. It is a static frontend.

## Supabase configuration

`config.js` already contains:
- Supabase project URL
- browser publishable key

Do **not** add:
- service-role key
- Google service-account JSON
- private Google key
- any `.env` containing secrets

Those stay only in Supabase secrets.

## Current data behavior

The dashboard is dynamic:
- new developers added to `developers` appear automatically;
- new monthly data added by the daily Google Sheets sync appears automatically;
- filters are generated from live Supabase data;
- one cron / one sync function can service all configured client spreadsheets.

## Files

- `index.html` — app structure
- `styles.css` — visual design
- `app.js` — filters, aggregation, chart, live Supabase reads
- `config.js` — public frontend Supabase configuration
- `SECURITY_SETUP.sql` — one-time RLS setup
