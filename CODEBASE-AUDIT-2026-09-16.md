# FutureX Codebase Audit - 2026-09-16

## Release Position

Not production-approved yet. The role/team/assignment architecture and tested authorization boundaries are substantially improved, but production infrastructure, migration baseline, dependency advisories and browser acceptance on the real HTTPS deployment remain open.

## Implemented in This Refactor

- Functional Roles are normalized and cannot grant System permissions.
- Users can have multiple searchable Functional Roles; only Owner manages the global catalog.
- Product Team is the single membership source. Development and Marketing no longer maintain separate team lists.
- Each Product member receives Project Roles selected only from their active Functional Roles.
- Development and Marketing use one phase-based Assignment Workspace backed by the authoritative Product Team.
- Functional Roles remain available for user capability and Product Team management, but are not shown or required in checklist assignment.
- A single match is preselected in the UI but not persisted until Apply.
- Missing capability shows Add Team Member with a Functional Role filter.
- Assignment work can be filtered by phase, assignee, status and unassigned state without loading the company directory.
- Phase defaults affect unassigned items only unless active reassignment is explicitly selected. Individual overrides remain authoritative.
- Optional additional phase members are stored without redistributing existing work.
- IN_PROGRESS reassignment requires confirmation and preserves progress/status/updates. IN_REVIEW and DONE reassignment are blocked.
- Assignment history records old assignee, new assignee, actor, timestamp and reason.
- Removing a member with active work and removing a Project Role required by active work are blocked.
- Product Team management shows each member's active assignment count and exposes only their active Functional Roles for Project Role selection.
- Product Type cannot change after checklist generation. Product details remain editable.
- Admin and Owner render the same shared assignment UI; Admin mutations are restricted to Products they manage.

## Verified

- Prisma schema validation passed.
- Prisma Client generation passed after stopping the verified local backend lock.
- Backend production build passed.
- Frontend TypeScript and production build passed.
- Backend unit tests: 16 passed; security suite is intentionally separate.
- Isolated PostgreSQL HTTP security tests: 46 passed.
- Headless browser test passed for both ADMIN and OWNER, phase assignment, additional phase members, exact apply payload, runtime errors and mobile overflow.
- Local normalized data check: 10 roles, 104 eligible-role links, 0 unmapped active templates.

## Remaining Findings

1. HIGH: `.github/workflows/main.yml` still learns the SSH host key at deployment time with `ssh-keyscan`. Use a protected, independently verified `VPS_KNOWN_HOSTS` secret. The earlier audit statement saying this was fixed no longer matches the checked-in workflow.
2. HIGH release control: production migration history is not verified. The populated local database previously used schema push and repository migrations are not a trustworthy production baseline without comparison and backup.
3. MEDIUM: password-reset tokens are generated and stored securely, but no reset-email delivery provider was found. The UI message can say instructions were generated even though delivery is not implemented.
4. MEDIUM: remaining dependency advisories documented in `SECURITY-AUDIT.md` were not re-resolved in this refactor. Re-run an approved package audit before release.
5. MEDIUM: upload signature checks are not malware scanning or archive inspection.
6. MEDIUM: Reassign & Remove is currently a safe two-step workflow: reassignment is required first, then removal. A single combined transactional wizard is not yet implemented.
7. LOW: repository-wide frontend lint debt remains, mainly `any`, unused imports and hook-dependency warnings. Production compilation succeeds, but the warnings should be reduced before enforcing lint as a release gate.
8. LOW: optional Development Lead / Marketing Lead metadata is not implemented in the new UI. This does not affect task ownership or eligibility.

## Manual Data Review Required

Only evidence-backed legacy links and existing Product-manager relationships were migrated. Users without reliable role data must be classified manually; Job Title was deliberately not treated as authorization or assignment capability. The two uncertain checklist mappings, `WEB_MARKETING` and `MARKETING_TEAM`, should also be confirmed.
