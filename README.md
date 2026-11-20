# Lamiya Fashion House

A responsive showcase for stitched women's kamiz. Customers browse products
and contact the business directly; there is no cart, checkout, payment, or
order management.

## Run locally

```sh
npm install
npm run dev
```

## Connect Supabase

1. Create a Supabase project.
2. In the Supabase Dashboard, open **SQL Editor**, paste in
   [`supabase/setup.sql`](./supabase/setup.sql), and run it. This creates the
   product/category tables, the public photo bucket, access policies, and
   starter categories. The product table starts empty.
3. In **Authentication → Users**, add the owner's email and password. Disable
   public sign-ups in **Authentication → Providers → Email** so visitors cannot
   create accounts.
4. In SQL Editor, mark that user as the owner by replacing the example email
   and running:

   ```sql
   update auth.users
   set raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"lamiya_admin": true}'::jsonb
   where email = 'owner@example.com';
   ```

   Sign out and sign back in after setting the owner flag.
5. Copy `.env.example` to `.env.local`. In Supabase **Project Settings → API**,
   set `VITE_SUPABASE_URL` to the Project URL and `VITE_SUPABASE_ANON_KEY` to
   the public anon/publishable key. Restart the Vite server after changing
   these values.
6. Open the website, scroll to the footer, and choose **Admin**. Sign in with
   the owner's Supabase email and password to manage the live catalogue.

Product and category writes and photo uploads are protected by Supabase Auth
and row-level security. The anon/publishable key is intended for browser use;
**never put a Supabase service-role/secret key in `.env.local` or frontend code**.

Until Supabase is configured, the site shows local sample products. Once
configured, it reads from Supabase instead; sample products are not copied
automatically. Add the business's real products through Admin. Uploaded product
photos are public for display, while only the configured owner can upload or
delete them. Replace the sample contact email in `src/App.tsx` with the
business's actual address before publishing.

## Catalog data

- The public catalogue reads published products and categories from Supabase.
- The Admin panel supports product photo uploads, a selectable main photo,
  product details, featured/visibility settings, and category management.
- Product and category types are in `src/types/`; Supabase access is kept in
  `src/data/catalog-api.ts`.

## Checks

```sh
npm run build
npm run lint
```
