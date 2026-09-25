# Contributing to YayChatbot

## Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Copy environment variables: `cp .env.example .env`
4. Start development: `pnpm dev`

## Monorepo Structure

| Path               | Description                              |
| ------------------ | ---------------------------------------- |
| `apps/dashboard`   | Next.js 14 dashboard (App Router)        |
| `apps/api`         | NestJS 10 REST API                       |
| `apps/widget`      | Embeddable chat widget (vanilla TS)      |
| `packages/shared`  | Shared TypeScript types & Zod schemas    |
| `packages/ui`      | Shared React component library           |
| `packages/config`  | ESLint, Prettier & TypeScript configs    |

## Commands

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `pnpm dev`         | Start all apps in development mode       |
| `pnpm build`       | Build all apps and packages              |
| `pnpm lint`        | Lint all apps and packages               |
| `pnpm type-check`  | Type-check all apps and packages         |
| `pnpm format`      | Format all files with Prettier           |

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). Commits are enforced via `commitlint`.

```
feat(dashboard): add chatbot creation form
fix(api): handle missing conversation gracefully
chore(config): update eslint rules
```

## Branch Strategy

- `main` — production
- `develop` — staging / integration
- `feat/*`, `fix/*`, `chore/*` — feature branches off `develop`

## Pull Requests

- All PRs target `develop` unless it's a hotfix
- CI must pass (lint, type-check, build)
- At least one approval required
