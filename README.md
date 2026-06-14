# take-off-web

Frontend for **Take Off Club** — Tunis · Padel & Pilates.

Built with Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript (strict).

## Quickstart

```bash
# 1. Install dependencies (pnpm required — https://pnpm.io)
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — at minimum set NEXT_PUBLIC_API_URL

# 3. Start the dev server
pnpm dev
# → http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Next.js development server with HMR |
| `pnpm build` | Production build (standalone output) |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint flat config |
| `pnpm typecheck` | TypeScript strict check (no emit) |
| `pnpm test:e2e` | Playwright e2e suite |
| `pnpm format` | Prettier — formats all files |

## Project structure

```
app/                 Next.js App Router pages and API routes
components/          Reusable UI — primitives, layout, domain
design-system/       Tokens, globals.css, font config
lib/                 API client, auth helpers, formatters, Sentry, Zustand cart
tests/               Playwright e2e specs
prototype/           Frozen .dc.html design-canvas files — living spec, NOT built
.github/workflows/   CI, e2e, codegen, CodeQL pipelines
```

## Reference documents

Both documents live at the workspace root (one level up from this repo):

- `../ARCHITECTURE.md` — route map, design tokens, auth flow, API contracts, domain model
- `../INFRASTRUCTURE.md` — CI/CD workflows, environments, VPS setup, secrets, observability

## Prototype

The `prototype/` directory contains frozen `.dc.html` design-canvas files that capture
the intended look and feel for each page. They are the living spec — consult them when
implementing real page content. They are excluded from Next.js builds and TypeScript
compilation (see `tsconfig.json` and `next.config.ts`).

## API

The `lib/api/client.ts` file is a placeholder that throws "not implemented" on every
call. It will be replaced by a generated TypeScript client once `take-off-api` exposes
its OpenAPI spec (see `.github/workflows/codegen.yml`).

## Notes

- Phone: `+216 27 314 100` — the primary booking channel; displayed prominently on Padel and Pilates pages.
- Currency: all monetary values are stored and passed as **millimes** (1 TND = 1000 millimes). Use `lib/format/money.ts` for display.
- Timezone: all dates are displayed in `Africa/Tunis`. Use `lib/format/date.ts`.
