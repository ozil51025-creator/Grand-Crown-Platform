# Grand Crown Platform

Grand Crown is a responsive member and administrator platform for fixed earning plans, referral tracking, manual mobile-money payment review, and withdrawal management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/grand-crown run dev` — run the customer/admin web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/grand-crown/src/App.tsx` — customer and administrator UI
- `artifacts/grand-crown/src/index.css` — Grand Crown visual theme
- `artifacts/api-server/src/routes/grand-crown.ts` — authenticated customer/admin API
- `artifacts/api-server/data.json` — seeded local/test data store
- `lib/api-spec/openapi.yaml` — API contract and codegen source of truth

## Architecture decisions

- The customer and admin surfaces are separate routes in one web artifact: `/` and `/admin`.
- Manual payment submissions remain pending until an administrator explicitly approves them.
- Sessions are HttpOnly cookies; local/test data is stored atomically in JSON so the uploaded package works without external service setup.

## Product

- Customers can register, sign in, claim daily rewards, view plans, submit payment references, track purchases, invite referrals, and request withdrawals.
- Administrators can review deposits and withdrawals, manage products, inspect transactions/activity, and update settings.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The web build requires the workflow-provided `PORT` and `BASE_PATH`; use the managed workflow or set both when running a standalone build.
- The local admin test login is `admin` / `change-me-now`; set `ADMIN_USER` and `ADMIN_PASS` before any real deployment.
- JSON storage is appropriate for local/testing only; move to a persistent database with backups before real-money production use.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
