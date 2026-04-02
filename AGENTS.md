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

- Jest is configured through `jest.config.ts` with `next/jest` and `jest.setup.ts`.
- Run the full test suite with `npm run test`.
- Run a single test file with `npm run test:file -- src/path/to/file.test.ts`.
- React Testing Library and `@testing-library/jest-dom` are available for component tests.
- Do not claim tests were run unless you actually executed the relevant Jest command.

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
