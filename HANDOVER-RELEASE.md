# Release Follow-Up - 2026-09-30

This follow-up supersedes the unresolved Marketing/dependency/local migration items in HANDOVER-AUDIT-2026-09-30.md. It is not evidence that the new code has been deployed.

## Delivered

- Marketing operational owners and checklist/phase assignees must be active Product members with an active Marketing Head (`MARKETING_MANAGER`), Executive or Coordinator project role. Admin/Owner accounts manage assignments and cannot be selected as operational owners. Job titles do not grant permissions. The shared policy now covers the alternate generic task PATCH route as well.
- Existing incompatible assignments are preserved for explicit administrator reassignment, not silently transferred or deleted. Marketing roles do not grant administrative assignment permissions.
- Upgraded the Nest runtime and test packages to 11.2.7, companion packages to compatible v11 versions, and Express to v5. Patched the new Swagger js-yaml dependency. Production dependency audit reports no known vulnerabilities at the time of verification.
- WebSockets no longer accept credentials in URLs. Every delivery revalidates JWT expiry, session revocation/idle expiry and account state; current role is reread before filtering messages. Passive sockets do not extend sessions.
- Reconstructed the missing initial migration from the historical schema at `748bc49^:backend/prisma/schema.prisma`; did not rewrite existing applied migrations. Added a separate migration for five missing indexes and the JobRole updatedAt default drift.
- Deployment now uses pnpm 10.33.2 consistently and refuses to deploy into an existing database without a recorded, verified baseline. Nest v11 requires Node 20 or newer.

## Evidence

- Backend unit suite: 58 passed; backend build passed after the final WebSocket changes.
- Real HTTP/PostgreSQL security suite: 53 tests passed, including password-login acceptance for all three Marketing roles, denied non-Marketing assignments, denied administrator progress edits, and visibility of saved progress to Admin and Owner.
- Frontend production build passed; existing lint warnings remain.
- `node backend/scripts/verify-recovery.cjs` (run from backend): clean migration replay passed, migrated schema exactly matches Prisma, pg_dump/pg_restore passed, restored task state/relations and immutable audit trigger verified.
- Recovery testing created and removed only random disposable local databases. No production data was copied, restored or changed. This does not test production upload backup/storage.
- Public production checks: HTTPS returns 200 with valid TLS; HTTP redirects to HTTPS; unauthenticated `/api/v1/auth/me` returns 401 with HSTS/no-store; `/api/docs` returns 404. No production login was attempted, so authenticated live cookie flags are not verified.
- An existing empty local directory `202609300001_repair_ineligible_marketing_assignments` has no migration.sql. It is untracked and was not deleted or filled with invented repair SQL. The recovery verifier excludes empty local migration directories. Do not deploy this directory.

## Existing Production Database: Mandatory Baseline Procedure

The new initial migration is for clean installations. An existing database must NOT run its CREATE TABLE statements. The deployment preflight intentionally stops this situation.

1. Arrange a maintenance window and take database plus uploaded-file backups. Preserve an encrypted off-host copy. Restore both into an isolated staging environment first.
2. Inspect the restored `_prisma_migrations` ledger and actual tables/indexes/constraints/triggers. Run `prisma migrate status` and a schema diff. Do not infer migration state solely from the current application working.
3. If the original baseline structures are already present, a deployment operator may mark ONLY `202609010000_initial_baseline` applied after comparison. Other missing migration ledger entries need individual schema/data-effect verification; never mark the entire history applied in bulk.
4. Apply remaining migrations to the restored copy, verify schema parity, audit immutability, role mappings and representative existing assignments. The latest parity migration changes a default and adds indexes, not user/task data.
5. Repeat the reviewed process on production after the backup checkpoint, then run the deployment preflight and migrate deploy. Never use db push, reset or seed as a production migration workaround.

## Still Needs Server/Staging Access

- Production DB schema/ledger and baseline reconciliation, production backup schedule and restore of uploaded files.
- Authenticated live Secure/HttpOnly/SameSite cookies, exact CORS origins, reverse-proxy configuration and secret/environment checks without exposing secret values.
- Full browser acceptance with separate real staging users, including project draft activation, assignment/reassignment, task completion and cross-session refresh. The new role acceptance evidence is real local HTTP, not a full production browser test.
- Controlled rollout and rollback verification. No SSH session, deployment, production password reset or production migration was performed in this task.

Do not push to main for unattended production rollout before the baseline procedure is reviewed: this repository deploys main automatically.
