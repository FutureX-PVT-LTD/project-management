# FutureX Handover Audit - 2026-09-30

Follow-up: see [HANDOVER-RELEASE.md](HANDOVER-RELEASE.md) for subsequent fixes and verification. The Marketing/dependency/local migration findings below describe the initial audit and have since been addressed; production-specific acceptance remains pending.

## Release assessment

Local build, automated security, and selected browser checks passed after the fixes below. This is a local release review, not an unconditional production security certification. Production configuration, backups, migration state, and complete end-user acceptance have not been verified. Review the remaining items before handing the system to users.

## Fixes delivered in this audit

1. **Marketing assignment requests incorrectly rejected (functional blocker).** Nest DTO instances include unset properties with `undefined` values. The service counted their keys as progress edits and rejected legitimate owner-only requests. Channel, Content Bank and Buzz checks now inspect defined values. Real HTTP tests verify assignment succeeds, member self-assignment is forbidden, and admin progress edits/mixed payloads are rejected.
2. **Owner deactivation protection bypass (account integrity).** The dedicated deactivate endpoint rejected Owner accounts, but the generic user PATCH accepted `isActive: false` from an Owner. Both paths now enforce the same protection. An integration regression confirms the account stays active.
3. **Restricted page controls exposed through direct navigation (UI permission mismatch).** The frontend hid menu links but could render management pages when a member entered their URL. AuthContext now blocks rendering and redirects unauthorized access to management and Owner-only pages. API authorization remains the actual security boundary.
4. **Login rate-limit route variants (security).** Case variants and trailing slashes now share the login/refresh rate-limit bucket instead of falling into the looser general API bucket. Regression test covers 21 attempts across three URL variants.
5. **Incorrect deletion audit counts (audit accuracy).** A destructured transaction result omitted backup-channel assignments, shifting Content/Buzz/Signoff counts. The mapping and total now include all five Marketing assignment categories.
6. **Seed credential independence (configuration).** Owner/Admin seed passwords now must differ, in addition to the existing minimum length and environment-variable requirements. No seed was executed against user data.
7. **Dependency remediation.** Updated Multer to 2.4.0, deepmerge-ts to 8.0.0, and file-type to 21.3.2 through the existing workspace override mechanism. The committed lockfile records the resolved versions. Backend build and real HTTP security tests passed with these dependencies.
8. **Browser check repair.** Added the missing Playwright dev dependency, corrected two stale selectors, and extended the existing fixture-based browser check with seven denied-route scenarios.

Existing Marketing role-first dropdown changes were already in the working tree and were preserved. This audit did not implement a shared role-owned task model; tasks still have individual assignee IDs.

## Verification evidence

| Check | Result | Scope/limitation |
| --- | --- | --- |
| Backend Jest suite | 58 passed | 14 unit suites; database integration suite is intentionally separate |
| `node backend/scripts/security-test.cjs` from backend | 50 passed | Real HTTP, guards, services, isolated local PostgreSQL schema; run again after dependency changes |
| Backend `npx nest build` | Passed | Used existing generated Prisma client; no schema changes required |
| Frontend `npm run build` | Passed | Production compilation/type checks; existing lint warnings remain |
| Calendar script | 15 assertions passed | Timezone/year-boundary helper checks |
| Greeting and board scripts | Passed | Helper/sorting/categorization checks, not full browser workflow coverage |
| User-isolation script | Passed | Read-only existing-data check; not a replacement for HTTP security tests |
| Playwright phase assignment script | Passed | Mock API fixtures, Admin/Owner assignment payloads, desktop/mobile overflow and runtime checks |
| Playwright restricted navigation | 7 passed | Member: users, submissions, setup, new project, reports; Admin: audit, user-security page |
| `pnpm audit --prod` | 0 critical, 0 high, 1 moderate | Remaining NestJS advisory described below |
| `git diff --check` | Passed | No whitespace errors |

Security integration tests cover authentication, foreign project/task IDs, user-management restrictions, password hash redaction, cookie settings, CSRF, notifications, calendar isolation, attachments, task progress authorization, review concurrency, draft activation, token rotation/replay, logout, expired/revoked/disabled sessions, password changes, audit immutability and Marketing ownership.

The integration runner creates random `futurex_security_test_*` schemas and removes only its own schema on completion. Test servers used ephemeral ports; the browser-only frontend on 3107 was stopped. No production deployment or live-account reset was performed.

## Passwords and secrets

- Auth passwords are verified with Argon2. Temporary credentials are generated randomly, expire, and require a password change.
- JWT signing secrets come from environment variables. Production refuses missing/weak placeholder secrets; development fallbacks are random, not hardcoded shared values.
- No operational hardcoded password was identified in the inspected auth/seed/deployment code. Targeted tracked-file scans found no private-key, AWS-key, GitHub-token, or common hardcoded-password pattern matches. This is not an exhaustive historical secret scan.
- Actual `.env`, backend `.env`, and frontend `.env.local` files are not tracked; `.env.example` is tracked. Secret values were not included in this report. Live secret strength, historical exposure, and deployed access permissions remain unverified.
- Temporary passwords are intentionally returned once to the authorized administrator; they must not be recorded in logs or shared screenshots.

## Remaining items before final handover

### Marketing role consistency

`ProjectsService.assignChecklistItem`, phase assignment, and Marketing operational `eligible()` checks accept active Product membership. The Marketing workspace filters options by Marketing roles; operational work updates require an active Marketing role. An Admin can therefore create an assignment through another path that the recipient cannot execute in Marketing operations. This does not give a normal user Admin privileges, but can strand work or reproduce a role mismatch. Decide and enforce one consistent policy across project setup, task assignment, and operational assignment. Existing tests explicitly allow any active Product member in several assignment paths, so this audit has not silently reversed that policy.

The role-first dropdown still resolves to a person. When a role has multiple members, the current implementation asks for a member. Confirm this matches the intended handover workflow rather than assuming tasks are owned by a role collectively.

### Remaining dependency advisory

`@nestjs/core` 10.4.22 remains flagged by [GHSA-36xv-jgw5-4q75](https://github.com/advisories/GHSA-36xv-jgw5-4q75). The upstream patch is 11.1.18 or later and requires a coordinated framework upgrade. The advisory concerns attacker-influenced SSE event type/id fields. No `@Sse`, `EventSource`, or `SseStream` usage was found in application source, so no reachable application path was identified in this review. The advisory is still present and has not been suppressed. Resolve through a tested NestJS upgrade or document release-owner risk acceptance.

### WebSocket lifecycle

The gateway validates origin/JWT/session at connection time, but does not revalidate idle/revoked sessions before sending later messages and still accepts a token query parameter. No application broadcast callers were found outside the gateway itself. Before enabling live event delivery, remove URL token authentication and enforce expiry/revocation throughout the connection lifetime.

### Production verification still required

- Verify production HTTPS, secure cookies, exact CORS origin, independent secrets, API docs disabled, and reverse-proxy settings. Confirm the frontend API rewrite is built for the production backend address.
- Verify database migrations, including audit immutability, on the deployment target. Local integration tests use schema push plus the audit trigger, not a complete migration-history replay.
- Demonstrate database and uploaded-file backup restoration and ensure persistent upload storage survives deployment.
- Run real-account staging acceptance for Member, Admin, Super Admin, Marketing Head, Executive and Coordinator: create/activate product, assign/reassign, start/update/complete work, refresh the overview, and verify the same results from another session.
- Confirm Marketing operational updates are visible in the administrator's browser without relying on assumptions about WebSocket delivery. Current browser fixtures do not test cross-session live refresh.
- Existing lint warnings (including `any`, unused imports and hook warnings) remain. They do not fail the build but have not been exhaustively eliminated.
- Do not run legacy `backend/verify_role_security.ts` against live data: it modifies existing users' task state. Prefer the isolated security runner.

## Suggested decision

Ready for controlled staging acceptance. Do not describe this as fully signed off for production until Marketing assignment policy is consistent, the remaining dependency risk is resolved/accepted, and production deployment/restore checks have evidence.
