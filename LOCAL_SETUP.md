# BookMarket Ghana — localhost setup

This package contains the updated account sign-in and student study-selection fixes, existing admin features and Paystack integration. Dependencies, private credentials and generated build output are excluded.

## Start locally

Install Node.js 22 or newer (or Bun), open a terminal in this folder, and run:

```sh
npm install
```

Copy `.env.example` to `.env`, then run:

```sh
npm run dev -- --port 8081
```

Open the localhost address printed in the terminal. With Bun, use `bun install` and `bun run dev -- --port 8081` instead.

## Important: browsing is not a complete local backend

The public settings in `.env.example` allow catalog browsing. They do **not** supply the private server configuration needed for account creation, username/phone sign-in, orders, or admin actions. Lovable Cloud manages its private credentials and does not export them in this ZIP. Accounts and orders live in the connected backend, not in this source archive.

For a fully functional local server, connect your own compatible backend and provide its server-only environment variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to that same backend's public settings. Apply the included database migrations in order. Existing accounts do not automatically transfer to a different backend.

Never put a private key in a `VITE_` variable, commit it, or share your `.env` file. If username sign-in fails locally, check the server configuration rather than creating another account; try the registered email where available. Test that backend access is configured before relying on signup.

## Paystack

For real payments, set your own `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` in the server environment. Without them, the existing test-payment mode remains available. Verified payment handling is included; real transactions still require your keys and a public HTTPS deployment reachable by Paystack. Paystack cannot deliver webhooks directly to localhost. Set the webhook address to your public app origin followed by `/api/public/paystack-webhook`.

## Tests

```sh
npx vitest run
```

The included account tests cover saved school/department/level values, username normalization, phone normalization and clearing the department when changing schools.
