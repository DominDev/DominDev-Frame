# Agent context

## Project overview

Frame is a private family photo selection application for five invited users. Each person independently rates, favorites and comments on session photos. An administrator reviews the combined results and chooses photos for editing.

Production: https://domindev.github.io/DominDev-Frame/

## Architecture

- `src/components/` contains interface components grouped by product area.
- `src/hooks/` coordinates authentication, application data, routing and responsive state.
- `src/lib/` contains Firebase access helpers and testable domain utilities.
- `src/config/` contains public client configuration and non-secret user metadata.
- `scripts/` contains administration, photo preparation, deployment and test utilities.
- Firebase Authentication provides invited email and password accounts.
- Cloud Firestore stores ratings, favorites, comments and photo metadata.
- Firebase Storage hosts photos.
- GitHub Pages hosts the Vite build under `/DominDev-Frame/`.

## Local workflow

- Install dependencies: `npm ci`
- Start development server: `npm run dev`
- Type check: `npm run typecheck`
- Run tests: `npm test`
- Audit production dependencies: `npm audit --omit=dev --audit-level=moderate`
- Build: `npm run build`

## Engineering rules

- Preserve the simple workflow for nontechnical and older family users.
- Treat mobile and desktop as equal product surfaces. Test narrow screens and portrait photos.
- Preserve existing ratings, favorites and comments when changing data or UI behavior.
- Do not add public registration or expose private favorite choices to other regular users.
- Never commit photos, credentials, passwords, service account files or private user data.
- Keep the GitHub Pages base path compatible with `/DominDev-Frame/`.
- Use ASCII hyphens in prose. The repository test suite rejects en dashes and em dashes.
- Follow the existing React, TypeScript and CSS Module structure unless a change has a clear benefit.
- Do not modify production Firebase data as part of local testing unless the task explicitly requires it.

## Obsidian project memory

This project has an additional persistent memory source in Obsidian:

- `.obsidian-memory/README.md` - stable project overview
- `.obsidian-memory/STATUS.md` - current status, next action, blockers and open questions
- `.obsidian-memory/progress.md` - dated project diary
- `.obsidian-memory/decisions.md` - decisions and reasoning
- `D:/ProgramData/DominDev/Obsidian/Vault-DominDev/Global/AI-Rules.md` - global memory rules

Before larger project work, read these files for context.

- Agent instructions and source code remain authoritative. Obsidian memory is additional context.
- Do not delete, rename or reorganize `.obsidian-memory` without explicit approval.
- Append progress entries instead of rewriting history.
- Keep credentials and personal account details out of memory.
- At the end of meaningful work, update `STATUS.md`, append `progress.md` and record durable decisions in `decisions.md` when relevant.

<!-- GitNexus: managed project-context block -->
## GitNexus code graph

This repository is indexed in GitNexus as `DominDev-Frame`.

Before broad code exploration, debugging, refactoring or impact analysis:

- Read `gitnexus://repo/DominDev-Frame/context` to check repository context and index freshness.
- Use GitNexus query for concepts and execution flows.
- Use symbol context and upstream impact before changing shared code.
- Use change detection before finalizing changes that may affect existing flows.
- If the index is stale, run `gitnexus analyze "D:\ProgramData\DominDev\DominDev-Frame" --name DominDev-Frame --index-only`.

GitNexus is a navigation and impact-analysis layer. Read the relevant source files before editing.
<!-- /GitNexus -->
