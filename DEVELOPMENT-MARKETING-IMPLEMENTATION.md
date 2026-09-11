# Development and Marketing Workstreams - Implementation Report

Date: 2026-09-11

## Delivered

- Added parallel `DEVELOPMENT` and `MARKETING` workstreams without creating a second task engine.
- Reworked Product creation into Details, Team, Workstreams and Review steps. Product keys remain server-generated.
- Added Product setup with bulk responsibility/phase assignment and per-item overrides.
- Added a Marketing workspace with overview, infrastructure checklist, channel registry, Content Bank, buzz calendar, readiness gates and launch sign-off.
- Added one-time, idempotent Marketing initialization for existing Products.
- Added 38 Marketing checklist slots, 16 channels, 10 content slots, 7 launch-relative buzz windows, 4 gates and 8 sign-off rows.
- Added launch-date reschedule preview and confirmation. Completed buzz windows retain their original dates.
- Added workstream labels to My Work and Additional Work.
- Kept Development progress separate from Marketing readiness; Marketing tasks do not silently change Development completion.
- Restricted Product deletion to Owner, management actions to Admin/Owner, and Marketing records to Product/record ownership.
- Added Marketing assignment notifications and audit events without storing channel passwords or tokens.

## Readiness Rules

- Gates cannot be approved before their underlying checklist, channel, content or buzz requirements are satisfied.
- Sign-off becomes `READY` only when both Marketing and PM checks are verified, or both are explicitly not applicable.
- Product launch must not be treated as ready while Marketing source rows remain unconfirmed.
- Workstream initialization is idempotent. A failed new-Product setup removes the just-created Product and its cascading workstream records so users do not see a partial Product.

## Marketing Checklist Source

The supplied workbook screenshots were used to replace the temporary `Needs source confirmation` rows with the `MI-01` through `MI-38` operational checklist. Existing Marketing tasks are updated in place, preserving their assignees, status and history.

Marketing checklist items use status and evidence instead of Development-style daily percentage reporting. Assigned employees start an item, record an evidence URL or operational note, and submit it as ready for review. Only Admin/Owner approval completes the item.

## Database Rollout

The additive migration is:

`backend/prisma/migrations/202609110001_marketing_workstream/migration.sql`

`backend/prisma/migrations/202609110002_marketing_checklist_status/migration.sql`

The local development database was updated and Prisma Client was regenerated. Historical migration metadata in this repository is not aligned with the existing database, so production migration history must be baselined and reviewed before running `prisma migrate deploy`. Do not use a destructive reset on production.

## Verification

- Prisma schema validation: passed.
- Backend production build: passed.
- Backend unit tests: 15 passed.
- Security integration tests: 44 passed, including idempotency, gate enforcement, rescheduling, sign-off state merging, project isolation and record ownership.
- Frontend TypeScript check: passed.
- Frontend production build: passed; all 24 pages generated.

The backend lint script could not run because the repository does not install an `eslint` executable. The Next.js build completed with existing non-blocking lint warnings, primarily `no-explicit-any` and unused imports.
