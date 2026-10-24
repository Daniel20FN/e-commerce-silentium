# AGENTS.md

## Project Overview

- Stack: Next.js 16 App Router, React 19, TypeScript, MUI 7, Prisma, Jotai, Notistack.
- Package manager: `npm` (`package-lock.json` is present).
- Path alias: use `@/*` for imports from `src/*`.
- Language/product context: UI text and dictionaries are Spanish-first.
- There is no existing repo-level `AGENTS.md`; this file is the canonical agent guide.

## External Agent Rules

- Checked for Cursor rules in `.cursor/rules/` and `.cursorrules`: none found.
- Checked for Copilot rules in `.github/copilot-instructions.md`: none found.
- If any of those files are added later, merge their instructions into this file instead of creating conflicting guidance.

## Skill Reference

- Load `documentation` when adding or improving comments, docblocks, module notes, or maintainability-oriented code documentation.
- Load `typescript` before writing non-trivial TypeScript so strict typing, exported signatures, and safer generic patterns stay aligned.
- Load `react-19` when editing React components; this repo uses React 19 and should follow current component patterns.
- Load `nextjs-15` when working on App Router files, routing, layouts, server/client boundaries, or data fetching patterns.
- Load `zod-4` when creating or updating validation schemas.
- Load `playwright` when adding E2E coverage; at the moment there is no E2E setup, so use it only together with a real test bootstrap.
- Load `vercel-react-best-practices` when refactoring React/Next.js for rendering, bundle size, or performance concerns.
- Load `web-design-guidelines` when reviewing accessibility, UX quality, UI consistency, or design-system compliance.
- Load `github-pr` or `branch-pr` when preparing a Pull Request through `gh`; use them for PR quality, body structure, and branch workflow.
- Load `judgment-day` only when the user explicitly asks for adversarial or dual review.

## Design System Guidance

- Impeccable/Taste local design state lives in ignored `.impeccable/` and `.taste-skill/`; shipping landing images belong in `public/images/landing/` with their provenance. Keep generated atmosphere distinct from real catalog product photographs. The approved immersive landing uses a scoped theme shell, semantic server content and small client islands; do not rasterize its copy or controls.

- Read `DESIGN.md` before making UI, layout, or UX changes.
- Treat `DESIGN.md` as the source of truth for visual hierarchy, layout rhythm, storefront vs admin behavior, and component intent.
- If `AGENTS.md` and `DESIGN.md` ever seem to conflict, follow `AGENTS.md` for engineering and workflow constraints, and `DESIGN.md` for visual and UX direction.
- Storefront UX is mobile-first: design and validate `xs` layouts before desktop because the public shopping experience is expected to be used primarily on mobile.
- Public brand/help/contact information stays on the landing via stable anchors (`#nosotros`, `#ayuda`, `#contacto` and FAQ fragments). Do not create separate informational pages or dead navigation links. `/nosotros` and `/contacto` redirect to the landing sections; catalog/product/cart routes remain transactional. Keep the landing server-first, native disclosures and narrowly projected navigation dictionaries; no heavy interaction dependencies or unconfirmed commercial/legal claims.
- Admin UX must remain fully usable on mobile, but desktop/tablet may be optimized for dense operational workflows.

## Workspace Safety

- The repo may be dirty; do not revert unrelated user changes.
- At the time of analysis, `prisma/schema.prisma` was already modified in the worktree.
- Never commit `.env`, `.env.development`, or secrets unless the user explicitly asks.
- Prefer small, surgical edits that preserve the current structure and naming patterns.

## Install And Run

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Production build: `npm run build`
- Start production server after a build: `npm run start`
- Generate Prisma client: `npm run prisma:generate`
- Open Prisma Studio with development env: `npm run prisma:studio`
- Run development migration: `npm run prisma:migrate:dev:development`
- Run production migration deploy: `npm run prisma:migrate:deploy:production`
- Seed database: `npm run db:seed`
- Cart product links use server-side `APP_PUBLIC_URL=https://www.silentium-hogar.com` (canonical public HTTPS origin). Without it, WhatsApp messages include SKU/public photos but omit product URLs, never localhost. See `docs/cart-whatsapp.md`; no WhatsApp API credentials are needed.
- User invitations require a trusted public HTTPS origin (`APP_PUBLIC_URL` or Vercel's `VERCEL_PROJECT_PRODUCTION_URL`) and an exact Supabase redirect allowlist entry for `/auth/invitacion`. Only active verified superadmins invite; roles activate only after recipient-owned password setup/consent. The default Supabase mailer does not deliver to arbitrary addresses: show its restriction, never add operators to the infrastructure team as a workaround. Apply the private invitation-table migration before publishing. See `docs/admin-invitations.md`.

## Lint, Format, And Validation

- Lint whole repo: `npm run lint`
- Lint a single file: `npx eslint src/app/page.tsx`
- Lint a folder: `npx eslint src/components`
- Auto-fix lint issues when safe: `npx eslint src/components/navbar.tsx --fix`
- Format a single file: `npx prettier --write src/app/page.tsx`
- Check formatting without writing: `npx prettier --check .`
- Type-check by piggybacking on Next build: `npm run build`
- Important: there is no standalone `typecheck` script right now.

## Tests

- Self-service account lives at `/account`, with owned endpoints under `/api/account`. Sensitive actions recheck the current password through an isolated non-persistent Auth client. Privilege changes and account removals share `lockUserAccess`; identity synchronization and self-deletion coordinate with the per-user `lockUserIdentity` plus row locks. Preserve these locks and the last active verified superadmin guard. Deleted-account technical references use `@deleted.invalid` and must never be reactivated or synced from stale tokens. See `docs/my-account.md`. Do not run destructive account/password browser checks against real users: dev/prod currently share the database.

- Jest is configured through `jest.config.ts` with `next/jest` and `jest.setup.ts`.
- Run the full test suite with `npm run test`.
- Run a single test file with `npm run test:file -- src/path/to/file.test.ts`.
- React Testing Library and `@testing-library/jest-dom` are available for component tests.
- Do not claim tests were run unless you actually executed the relevant Jest command.
- Optional catalog media PostgreSQL integration checks: set `CATALOG_MEDIA_INTEGRATION=1` and run `npm run test:file -- src/domains/admin/media/services/catalog_media_service.integration.test.ts`. They require `DATABASE_URL` explicitly in `.env.development`, create isolated QA metadata only (no Storage uploads), and soft-delete fixtures afterward. Normal test runs skip these network-dependent checks.
- Optional public storefront PostgreSQL integration checks: set `STOREFRONT_INTEGRATION=1` and run `npm run test:file -- src/domains/storefront/services/catalog_service.integration.test.ts`. They require `DATABASE_URL` explicitly in `.env.development`, create isolated category/product/variant/image metadata only, and soft-delete fixtures afterward. Normal runs skip these checks.
- Optional read-only catalog filtering PostgreSQL checks: set `STOREFRONT_INTEGRATION=1` and run `npm run test:file -- src/domains/storefront/services/catalog_filter_query.integration.test.ts`. Requires explicit `.env.development` `DATABASE_URL`; reads the existing public development catalog without creating or changing fixtures, stock or Storage. Verifies displayed-price parity, filtering before pagination, sorting, accents and literal search. See `docs/storefront-filters.md`.
- Optional private costs PostgreSQL integration checks: set `CATALOG_COSTS_INTEGRATION=1` and run `npm run test:file -- src/domains/admin/costs/services/cost_service.integration.test.ts`. They require `DATABASE_URL` explicitly in `.env.development`, create isolated draft products/variants/costs and soft-delete fixtures afterward. They verify per-unit calculations, recovery, composite ownership constraints, concurrent revision conflicts and anonymous SQL denial; no Storage operations. Run Prisma generation/build only after Jest exits on Windows to avoid locking the Prisma engine DLL.
- Optional cart PostgreSQL integration checks: set `CART_INTEGRATION=1` and run `npm run test:file -- src/domains/cart/services/cart_service.integration.test.ts`. Requires explicit `.env.development` `DATABASE_URL`; creates isolated QA catalog/image/cost metadata, soft-retires fixtures, and never uploads Storage files or consumes stock. Verifies current prices, stock changes, public eligibility/image fallback and cost privacy. Stop Jest/Next before Prisma generation/build on Windows.

- Optional publication PostgreSQL checks: set `PUBLICATION_INTEGRATION=1` and run `npm run test:file -- src/domains/admin/products/services/publication_service.integration.test.ts`. Requires explicit `.env.development` `DATABASE_URL`; creates isolated QA categories/product/variant/cost metadata and soft-retires fixtures afterward. No Storage uploads or real order/stock consumption. Verifies preview projection/privacy, public eligibility parity (ancestors, alternate categories, stock, inactive variants), stale revisions and archived activation denial. Stop Jest/Next before Prisma generation/build on Windows.

- Optional quick catalog operations PostgreSQL checks: set `CATALOG_OPERATIONS_INTEGRATION=1` and run `npm run test:file -- src/domains/admin/products/services/catalog_operations.integration.test.ts`. Requires explicit `.env.development` `DATABASE_URL` and the quick-operations migration; creates isolated QA catalog/image metadata and costs, then soft-retires fixtures. No Storage uploads/deletes or changes to real product stock. Verifies independent copies, idempotency, cost remapping, shared-image metadata isolation, atomic price rollback and private operation-table SQL denial. Stop Jest/Next before Prisma generation/build on Windows.

- Optional inventory PostgreSQL checks: set `INVENTORY_INTEGRATION=1` and run `npm run test:file -- src/domains/admin/inventory/services/inventory_service.integration.test.ts`. Requires explicit `.env.development` `DATABASE_URL` and inventory migration. Creates isolated QA products/variants and soft-retires them. Stock UPDATE requires an explicit transaction-local inventory context; fixtures use `updateQaStock`, never unlogged writes. Ledger/operations are immutable; do not physically delete historical fixtures. No Storage operations or real stock changes. Stop Next/Jest before Prisma generation/build on Windows.

### Manual order integration checks

- Set `ORDERS_INTEGRATION=1` and run `npm run test:file -- src/domains/admin/orders/services/order_service.integration.test.ts` for optional PostgreSQL order checks. Requires explicit `.env.development` `DATABASE_URL` and both inventory/order migrations. Creates isolated QA catalog, order and immutable ledger data; soft-retires catalog fixtures, never physically deletes history, uploads Storage files or sends WhatsApp messages. Never run against production. Stop Next/Jest before Prisma generation/build on Windows. See `docs/admin-orders.md`.

### Operative admin home integration checks

- Set `OPERATIONS_INTEGRATION=1` and run `npm run test:file -- src/domains/admin/home/services/operational_service.integration.test.ts` for optional PostgreSQL priority-queue checks. Requires explicit `.env.development` `DATABASE_URL` and inventory/order migrations; never production. Creates isolated QA catalog/orders/ledger, soft-retires catalog and closes/cancels its own orders, retaining immutable history. No Storage, WhatsApp or real stock writes. Stop Next/Jest before Prisma generation/build on Windows. See `docs/admin-home.md`. Business timestamps use approved `America/Bogota`; current queues cover all dates, not a daily sales cutoff.

## Git Hooks

- Husky is enabled via the `prepare` script.
- Pre-commit behavior is defined in `.husky/pre-commit`.
- The hook formats modified `*.ts` and `*.tsx` files with Prettier.
- If staged changes include `prisma/migrations/`, the hook runs `npm run build`.
- Because of that hook, migration changes can make commits slower and can fail on build issues.

## Commit Guidelines

- Use Conventional Commits for every commit message.
- Prefer formats like `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `test: ...`, `chore: ...`, and `perf: ...`.
- Keep the subject line concise, imperative, and focused on the reason for the change.
- Group related changes into a single coherent commit; do not mix unrelated refactors with feature work.
- Before committing, review the diff and avoid staging unrelated user changes.
- Do not commit `.env`, `.env.development`, credentials, generated secrets, or other sensitive files.
- Do not create empty commits unless the user explicitly asks for one.
- Do not use `git commit --amend` unless the user explicitly requests it or a commit hook modified files from the commit you just created.
- Do not rewrite history with destructive commands such as force-push, hard reset, or checkout-based reverts unless the user explicitly asks.
- If a hook fails, fix the issue and create a new commit rather than bypassing the hook.
- Do not add `Co-Authored-By` lines or AI attribution to commit messages.
- When possible, commit only after the most relevant validation for the change has passed.

## Architecture Snapshot

- App entry lives in `src/app/` using the Next.js App Router.
- Shared UI components live in `src/components/`.
- Domain-specific UI is grouped under `src/domains/`.
- Prefer domain-first organization inside `src/domains/`: `src/domains/[feature-or-domain]/components`, `services`, `types`, `hooks`, and `states` at the same level as needed.
- Keep code colocated by domain instead of creating cross-domain feature files unless something is truly shared.
- Cross-cutting React context/providers live in `src/app/providers.tsx`, `src/context/`, `src/styles/`, and `src/dictionary/context/`.
- Utility helpers live in `src/utils/`.
- Shared types live in `src/types/`.
- Prisma schema and migration assets live in `prisma/`.

## Domain Structure

- Organize new feature code under `src/domains/[domain-name]/`.
- Inside each domain, prefer sibling folders like `components/`, `services/`, `types/`, `hooks/`, and `states/`.
- Keep API-specific typing close to the domain in `src/domains/[domain-name]/types/`.
- Promote code to shared folders only when it is reused across domains or is clearly cross-cutting.
- Avoid mixing unrelated domain logic into `src/components/`; that folder should stay for generic reusable UI.

## Import Rules

- Use `@/` alias imports for code under `src/`; examples in the repo include `@/components/footer` and `@/dictionary/services/get-dictionary`.
- Use relative imports for nearby siblings in the same feature folder; this is common in `src/domains/home/components/*`.
- Keep imports organized automatically; Prettier uses `prettier-plugin-organize-imports`.
- Prefer `import type` for type-only imports when possible.
- Put framework/library imports together and local imports together; let the organizer handle final ordering.
- Avoid deep relative paths that cross major boundaries when `@/` is available.

## Formatting Rules

- Prettier is authoritative for formatting.
- Use double quotes, semicolons, and trailing commas as produced by Prettier.
- Keep JSX props multiline when lines get long; follow the existing MUI-heavy style.
- Do not hand-format imports; save the file and let the organize-imports plugin handle them.
- `.vscode/settings.json` enables `editor.formatOnSave`; assume contributors expect formatted files.
- Prisma files use the Prisma formatter in editors.

## TypeScript Rules

- `tsconfig.json` has `strict: true`; keep new code fully typed.
- Use strong typing by default; do not use `as`, `any`, or `unknown` unless it is strictly necessary and the last reasonable option.
- If an escape hatch is unavoidable, isolate it to the smallest possible boundary and explain why.
- Prefer explicit parameter and return types on exported utilities and non-trivial functions.
- Use narrow union types for constrained values; example: `ThemeMode = "light" | "dark"`.
- Reuse existing shared types from `src/types/` before inventing new ones.
- Use `Readonly<{ children: React.ReactNode }>` or explicit prop objects when it improves clarity.
- JSON imports are allowed (`resolveJsonModule: true`), and the dictionary service relies on that.

## API Conventions

- All API calls must go through `apiService` or `useCancellableApi`; do not call remote APIs ad hoc from components.
- Define each API around `apiResponse` so response typing is consistent from declaration through consumption.
- API parameter types must live in `api_params.ts` inside the domain `types/` folder, for example `src/domains/[domain-name]/types/api_params.ts`.
- Declare API params and response types once, then reuse those same exported types in the API definition and in every consumer using `apiService` or `useCancellableApi`.
- Keep API contracts domain-local unless multiple domains genuinely share them.
- Components should consume typed service/hooks results, not rebuild request or response shapes inline.

## Naming Conventions

- React component names: `PascalCase` (`Navbar`, `HomePage`, `FeaturedProductsSection`).
- Hooks: `camelCase` with `use` prefix (`useThemeMode`, `use_is_mobile.ts` file still exports hook-style APIs).
- Utility functions: `camelCase` (`getClientCookie`, `documentsToFirebaseUrl`).
- Type aliases and interfaces: `PascalCase` (`ThemeContextProps`, `RangeDateNullable`).
- Enum members and literal values follow domain meaning, not arbitrary abbreviations.
- Most file names in `src/` use lowercase snake_case (`home_page.tsx`, `cookies_helper.ts`). Keep that pattern unless Next.js requires special filenames like `page.tsx` or `layout.tsx`.
- Folder names are lowercase and domain-oriented (`components`, `domains`, `dictionary`, `styles`).

## React And Next.js Conventions

- Use server components by default in `src/app/`; add `"use client"` only when hooks, browser APIs, or client-only providers are needed.
- Keep provider composition centralized in `src/app/providers.tsx`.
- Default exports are acceptable for framework entry points (`page.tsx`, `layout.tsx`) and for existing APIs that already use them.
- Prefer named exports for reusable components and helpers elsewhere.
- Keep dictionary-driven text flowing through props where the feature already expects a `dictionary` object.
- Do not leave literal UI text inside components, hooks, services, or pages; all user-facing copy must live in the dictionary layer and be consumed from there.
- When adding a new label, message, CTA, placeholder, or title, add it to the dictionary first and then wire it into the feature.
- Respect App Router structure instead of reintroducing Pages Router patterns.

## Text And Dictionary Rules

- Never hardcode user-facing text in the codebase; use dictionary entries instead.
- Treat buttons, headings, menu items, empty states, toasts, validation messages, helper text, and modal copy as translatable content.
- Extend `src/dictionary/es.json` and related dictionary types/services when new copy is needed.
- Pass dictionary slices through props or typed helpers instead of importing ad hoc strings across unrelated layers.
- If a fallback is necessary, keep it inside the dictionary service, not inline in UI components.

## MUI And Styling Conventions

- Keep `AppRouterCacheProvider` around the root providers in `src/app/layout.tsx`; it collects Emotion styles in the document head during App Router streaming and avoids hydration mismatches from style tags in the body.
- The UI layer is MUI-first; prefer `@mui/material` primitives and `sx` props over ad hoc CSS.
- Reuse theme values from `src/styles/mui_theme.ts` and context from `src/styles/theme_context.tsx`.
- When styling interactive states, follow existing patterns using `alpha(...)`, palette tokens, and `sx` nesting.
- Keep responsive behavior inline with MUI breakpoint objects (`{ xs: ..., md: ... }`) as seen in the navbar.
- Avoid mixing unrelated styling approaches unless there is already a local precedent.

## Error Handling And Async Work

- Guard browser-only code with environment checks such as `typeof document === "undefined"` or `typeof window !== "undefined"`.
- Throw explicit errors for invalid hook/provider usage; `useThemeMode` is the local example.
- In async helpers, prefer returning typed results instead of swallowing errors silently.
- If a catch block must stay, log with context and preserve failure semantics when the caller needs to react.
- Avoid unhandled promises; the older ESLint config explicitly enforced `no-floating-promises` and `require-await` behavior.

## Data And Prisma Conventions

- Prisma uses `prisma/schema.prisma` with PostgreSQL and `DATABASE_URL` / `DIRECT_URL` env vars.
- Run `npm run prisma:generate` after schema changes.
- Keep migrations under `prisma/migrations/` and expect the pre-commit hook to trigger a build when they change.
- `prisma/prisma_db.ts` currently only hosts the `PrismaJson` global namespace declaration; preserve that unless you intentionally rework Prisma client bootstrapping.

## What Agents Should Verify Before Finishing

- Did you keep imports organized and formatting clean?
- Did you avoid changing unrelated user edits?
- Did you run at least the most relevant validation command for your change?
- If you touched Prisma schema or migrations, did you regenerate Prisma client and account for the pre-commit build?
- If you added a new command, config file, or workflow, did you update this `AGENTS.md`?

## Known Gaps

- No dedicated `typecheck` script exists yet.
- Lint config is split between `eslint.config.mjs` and an older `.eslintrc.json`; prefer the flat config as the active modern setup, but do not delete the legacy file unless the user asks.

## Source Asset Safety

- Keep PDF briefs binary in `.gitattributes` (`*.pdf binary`); with Windows `core.autocrlf=true`, text classification can corrupt source PDFs. Do not format or normalize source binary files.

### Admin analysis checks

- `/admin/analisis` uses MUI X Charts Community, loaded only on that route. Preserve shared first-confirmation cohort and Colombia calendar semantics; inventory/aging are current snapshots, not period-filtered. See `docs/admin-analysis.md`.
- Optional `ANALYSIS_INTEGRATION=1` with `npm run test:file -- src/domains/admin/analysis/services/analysis_service.integration.test.ts` requires explicit development DATABASE_URL. Uses isolated QA orders/catalog, cancels/soft-retires fixtures and verifies preexisting stock unchanged; never production, Storage uploads or WhatsApp messages. Stop Next/Jest before Prisma/build on Windows.
