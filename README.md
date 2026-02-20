# orderflow – Expo + Web

Group ordering app for restaurants: host uses the app (Expo), guests open a link/QR in the browser.

## Structure

- `supabase/` – Schema and migrations (orders, order_items, Realtime).
- `web/` – Web app for guests: `/join/[orderId]` (form + live list).
- `app/` – Expo app for the host: create order, QR, list, summary, export.

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration in SQL (Dashboard → SQL Editor): paste the content of `supabase/migrations/001_orders_and_items.sql`. If the `alter publication supabase_realtime` line fails, add the tables `orders` and `order_items` to Realtime in Dashboard → Database → Replication.
3. In Dashboard → Database → Replication, make sure `orders` and `order_items` are in the Realtime publication.
4. Copy URL and anon key to:
   - `web/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `app/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_JOIN_BASE_URL` (base URL of the web where guests open the link, e.g. `https://orderflow.vercel.app`)

## Development

```bash
# Web for guests
cd web && npm i && npm run dev

# Expo app
cd app && npm i && npx expo start
```

## Order URL (QR / link)

The URL shared by the host is: `https://YOUR_WEB_DOMAIN/join/{orderId}`. Set `VITE_JOIN_BASE_URL` in web (build) and the same base in the app to generate the QR.
