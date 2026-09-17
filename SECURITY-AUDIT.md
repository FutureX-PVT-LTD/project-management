# FutureX Security Audit and Deployment Verification

> Superseded for current release status by `CODEBASE-AUDIT-2026-09-16.md`. Historical findings below are retained as evidence; statements about the deployment workflow must not be treated as current without comparing `.github/workflows/main.yml`.

## Current Pre-Launch Review: 2026-09-10

**Release recommendation: NOT READY. The application is ready for continued staging security testing, but the production launch gate is not complete.**

This section supersedes the September 9 snapshot below. The latest request contains 85 security, privacy and functional requirements. Confirmed local boundary failures were fixed and the HTTP/PostgreSQL suite was expanded. No production deployment, production password use, live employee attack testing, production backup restore or four-browser verification was performed. The only newly supplied app URL was `http://localhost:3000/login`, not a production origin. Browser automation was rejected by the tool's usage-limit approval check; it was not bypassed.

### Executive Summary and Role Model

- Existing `OWNER` is the Super Admin; no duplicate role was added. OWNER alone reads the full System Audit Log and deletes projects.
- Existing ADMIN management scope remains workspace-wide. There is no manager-specific product ACL in this application. That policy must be explicitly accepted before launch; if Admins should manage only designated products, this remains an authorization design gap.
- Execution now requires the actual assignee AND explicit project membership, for MEMBER, ADMIN and OWNER alike. Managers cannot modify someone else's progress, hours or blocker fields through the task update endpoint. Existing review checks reject self-review. No manager is automatically added as an execution member; management UI now permits explicitly selecting one.
- TEAM_MEMBER project discovery and task reads are backend-scoped. Shared project membership does not authorize all employees' tasks. Team listing no longer returns other employees' workload metrics or email. Reassigned-task daily updates, personal activity and private attachments are restricted.
- Additional Work uses a separate model, not Task. Creation stamps the authenticated creator, `MEMBER_ADDITIONAL_WORK`, and `countsTowardProductProgress=false`. Only its creator can edit permitted fields while still a project member. There is no deletion, reassignment or official-scope conversion endpoint. Admin/Owner can read logs under the existing management scope, not edit another creator's work.

### Current Findings

| ID | Severity | Evidence / disposition |
| --- | --- | --- |
| P01 | HIGH | `audit.controller.ts` allowed ADMIN to read global authentication/security audit. Now OWNER-only, with separate own-login-history and own-session metadata routes. HTTP role and ID-tampering tests pass. |
| P02 | HIGH | `teams.service.ts` exposed each teammate's workload counts/hours and email to members. Added a query-level minimal directory response for members; test checks the response JSON. |
| P03 | HIGH | `tasks.service.ts` returned prior assignee daily updates/activity and attachment metadata on reassigned tasks. Added identity filters and matching download checks; HTTP tests exclude private IDs and reject download. Project manager updates/health notes and foreign milestone task counts are also withheld/scoped. |
| P04 | HIGH | Deployment workflow used unverified `ssh-keyscan`, interpolated secrets into scripts, allowed all dependency builds, rewrote environment/workspace settings, used `prisma db push` and ignored failing health checks. Replaced with verified-known-hosts input, restricted workflow permissions, serialized deployments, frozen dependency install, reviewed migrations and failing upstream checks. Not run on a VPS. |
| P05 | MEDIUM | Assignee workflow was role-gated to TEAM_MEMBER, preventing assigned Admin/Owner work. Now assignment/membership-based; tests cover task creation, start, daily progress, review submission, self-review rejection, other-review approval and preserved 20% progress. |
| P06 | MEDIUM | Additional Work, own login-history UI and year selection were absent. Implemented with restrictive DTOs, separate storage, immutable provenance, audit entries, bounded reads, and no product-progress mutation. |
| P07 | MEDIUM | Calendar local-midnight cells were converted to UTC date keys, shifting dates in Asia/Colombo. Calendar keys now preserve the calendar date; inclusive date ranges include the final day. Backend rejects invalid, reversed or >100-day ranges. |
| P08 | MEDIUM | Task activity helper silently swallowed audit failures and did not append System Audit Log entries. It now records both; daily progress and logout/session-revocation events append audit rows inside their transactions. Comprehensive all-operation transactional auditing remains unfinished. |
| P09 | HIGH, OPEN | `deepmerge-ts@7.1.5` through Prisma configuration remains affected by recursive-object stack exhaustion. The patched release is major 8. Plain JSON cannot form the recursive graph; no request handler calling this dependency was found. This is a reachability assessment, not a vulnerability waiver. An approved compatible Prisma/tooling update or documented risk decision is required. |
| P10 | MEDIUM, OPEN | Two `file-type` advisories and one `@nestjs/core` advisory remain. No forced Nest major upgrade or incompatible file-type override was applied. See dependency review. |
| P11 | HIGH release-control gap, OPEN | Actual HTTPS/Nginx/firewall/PM2 environment, production migration baseline, backup and restore, and browser isolation are unverified. Local results cannot close this gate. |
| P12 | MEDIUM, OPEN | Auth bootstrap/notification code changed concurrently during this review. Those edits were preserved. Browser login redirect behavior and account-switch rendering have not been verified; no exact production redirect-loop root cause is claimed. |
| P13 | LOW | Existing frontend lint warnings remain. New screens are typechecked and compile, but mobile/desktop visual QA is still pending. |
| P14 | MEDIUM | Owner security visibility was incomplete. Added an Owner-only Audit Log navigation item, recent system activity and quiet sign-in/session counts on the Owner dashboard, plus an Owner-only user security page with server-side single/all-session revocation. Role boundaries, response-field minimization and revocation attribution pass HTTP tests. |
| P15 | MEDIUM | Audit immutability was previously installed with runtime startup DDL that swallowed failures. Removed startup DDL and made the reviewed migration authoritative. The isolated test harness now applies that migration and verifies both UPDATE and DELETE are rejected by PostgreSQL. Production migration application remains a server action. |

No new critical application finding was established in the tested scenarios. This does not establish the absence of critical issues elsewhere.

### Architecture, Authentication and Sessions

The browser uses the existing centralized API client and HttpOnly `access_token` / `refresh_token` cookies. All login, profile, refresh and logout fetches include credentials. The default/public API base is `/api/v1`; Next rewrites to the internal API. The deployment build now explicitly selects `http://127.0.0.1:5040` for that internal rewrite and retains public same-origin `/api/v1`. No localStorage/sessionStorage auth scheme or Next middleware cookie-name check was found.

PostgreSQL Session is authoritative, not an in-memory session map. Access JWT validation checks session ID, user ID, revocation, expiry, idle timeout and active/nondeleted user. Refresh validates the stored hash and atomically rotates it. Login issues a fresh session ID. Password/role/status changes revoke sessions. Passwords use Argon2; reset/session credentials are not stored as plaintext. Current cookie helpers require HttpOnly, Path=/, lax/strict SameSite, and Secure in production. No Domain attribute is set. Production CORS requires configured HTTPS origins; mutations require the custom header and exact origin validation. Backend trust proxy remains loopback-only when configured.

These properties were reviewed in source and selected behavior was exercised over HTTP. Actual production cookie storage/transmission, HTTPS termination, time skew, consistent process secrets, instance count and restarts were not inspected. The repository PM2 ecosystem describes one backend entry, but does not prove the running instance count. Do not weaken cookie/CORS/CSRF/guards to diagnose localhost.

### Authorization Matrix and Tested Boundaries

| Surface | MEMBER-A / MEMBER-B | ADMIN | OWNER | Evidence |
| --- | --- | --- | --- | --- |
| Task read/update | Own assigned work + membership | Workspace management; own execution only | Workspace management; own execution only | Foreign IDs and foreign progress attempts rejected |
| Daily updates/activity | Own permitted history | Management read; own updates | Management read; own updates | Reassignment history test, spoofed userId rejection |
| Additional Work | Own create/read/edit; no delete | Management read, own create/edit | Management read, own create/edit | Foreign read/edit, projectId/creator/source/progress tampering and DELETE tested |
| Projects/checklist | Member product and assigned checklist | Existing workspace management | Workspace management/delete | Unrelated product lookup denied; generation/bulk workflow not fully retested |
| Private task file | Authorized task + own uploader identity | Authorized management | Authorized management | Foreign task and previous-assignee download denied |
| Project-only shared file | Explicitly shared project file under membership | Management | Management | This remains shared product context, not a private employee attachment |
| Search | Backend-scoped task/product results | Management scope | Management scope | Unrelated confidential title absent |
| Calendar | Own assigned tasks in requested range | Management scope | Management scope | Foreign due-date task excluded; invalid/wide ranges denied |
| Notifications | Own rows and mark-read only | Own | Own | Foreign mark-read leaves DB row unchanged |
| Global audit/security history | Denied | Denied | Allowed | 403 for members/Admin; Owner dashboard summary and filtered log return 200 |
| User security/session revocation | Denied | Denied | Allowed | Owner-only detail response excludes credential hashes; revocation audit actor comes from authenticated session |
| Personal login/session metadata | Own | Own | Own | Injected foreign actor/user ID cannot change result scope; hashes absent |
| Reports and management actions | Denied | Existing workspace management | Allowed | Direct report/create/review/user-management requests tested |

Read minimization does not rely on React filtering. New DTOs reject unknown creator, performer, assignee, source, status and official-progress fields. Only selected safe user fields are returned in member directory responses. Existing task comments/review outcomes remain task-shared context; a dedicated confidential manager-note classification/redaction policy has not been implemented. Minimal prerequisite labels/status are retained for task readiness. Parent/dependent task labels need an additional property-level policy review.

### Measured Verification

- `backend`: `npm run test:security` passed **43/43** real HTTP integration tests using OWNER, ADMIN, MEMBER-A and MEMBER-B cookie jars and a new isolated local PostgreSQL schema. The harness creates random test credentials and removes only its generated schema; no live employee passwords are used. It also applies the audit immutability migration inside that disposable schema. Expected denial responses in test console logs are intentional.
- ID/payload attacks include foreign task/project/file/comment/notification/work-log IDs, arbitrary assignee/creator/role/progress/source fields, invalid date ranges and oversized audit limits. Positive checks accompany representative negative boundaries. This is not yet an attack replay for every endpoint in the 85-point request.
- `backend`: existing unit tests **15/15** pass; 42 integration cases are intentionally skipped by the ordinary unit command and run separately through `test:security`. Production build passes.
- `frontend`: production build passes and routes include Additional Work, Login History, calendar and audit. Typecheck passes. Existing lint warnings remain; no lint-suppression setting was added.
- `frontend`: `npm run test:calendar` passes **15 assertions** across Asia/Colombo, America/Los_Angeles and UTC, including December/January navigation and inclusive range endpoints.
- Workflow YAML parsed and all four shell steps passed `bash -n`. Remote commands were not executed. Shell syntax is not a deployment simulation.
- Bundle scan inspected **53 generated JS files** against configured local backend secret values (minimum 12 characters): **0 value matches**. This does not cover unknown production secrets or prove all bundle contents are safe.
- Git-history pattern scan checked **22 reachable commits** for private-key blocks, AWS access-key IDs and classic GitHub PAT patterns: **0 candidate files**. This is not an entropy-based or comprehensive secret scan; other credential formats and inaccessible refs remain outside coverage.
- Source scan found no active frontend localStorage/sessionStorage auth or `unstable_cache` use. The fixed layout script still uses `dangerouslySetInnerHTML`; user-authored descriptions are rendered as React text. An old WebSocket gateway file exists but is not registered in AppModule; no live real-time authorization claim is made.
- Browser four-profile testing, screenshots, actual Network/Cookie inspection, logout/account-switch visual cache testing, mobile calendar layout and production end-to-end flows were **not run** because browser tool access was rejected. Existing local ports 3000/4000 are listening; this is not proof of browser functionality.

### Database, Migration and Additional Work

`202609100001_additional_work/migration.sql` adds only the separate AdditionalWork table, indexes, foreign keys and constraints. The SQL forbids official-product-progress inclusion and noncanonical source values. It does not change Task or product rollup calculations. `202609100002_audit_log_immutability/migration.sql` adds the PostgreSQL trigger that rejects updates and deletes on AuditLog. The reviewed Additional Work SQL was applied directly to the existing **local** database after checking loopback hostname and table absence; a table query then succeeded. Existing records were not reset or deleted. The audit trigger was verified in disposable integration schemas; its production application is not verified. Test schemas use `db push` for tables followed by the explicit trigger migration, not as a production deployment strategy.

Production must run reviewed migrations after a verified backup and migration-baseline review. Prior environments created with `db push` may not have valid migration history; do not mark migrations applied without checking schema equivalence. Local direct SQL application does not establish a production migration baseline. Windows Prisma generation hit a locked engine DLL; generated client types and integration queries worked with the installed engine, but a clean `prisma generate` after stopping the backend is still required.

Current local `npx prisma migrate status` found all five repository migrations unrecorded, including the Additional Work and AuditLog immutability migrations. This confirms a baseline mismatch; running `migrate deploy` blindly against this populated schema was intentionally avoided. Compare each migration with the live schema, back up first, then establish the migration baseline using Prisma's documented process before deployment.

### Dependency Review

Full-workspace `pnpm audit` initially reported 0 critical, 5 high, 5 moderate, 3 low. Bounded overrides patched glob 10, tmp 0.2.7, picomatch 4, js-yaml 3, webpack 5 and ajv 8, retaining the existing framework major versions and lockfile. Dependencies were installed without lifecycle scripts during this review. Latest audit: **0 critical, 1 high, 3 moderate, 0 low**. No `audit fix --force` was used.

Remaining references: [Deepmerge recursive graph advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [Nest core advisory](https://github.com/advisories/GHSA-36xv-jgw5-4q75), [file-type ASF parser](https://github.com/advisories/GHSA-5v7r-6r5c-r473), [file-type ZIP parser](https://github.com/advisories/GHSA-j47w-4g3g-c36v). `pnpm why deepmerge-ts --recursive` traced the high finding through `@prisma/config@6.19.3`. The API upload handler currently performs its own restricted basic-signature checks, not these file-type parsers. File scanning remains incomplete; do not treat signature checking as malware detection.

### Remaining Launch Work and Production Verification

1. Resolve or formally review the remaining dependency findings. Re-run compatibility, negative auth and full workflow tests after any major framework/tooling upgrade.
2. Obtain the real staging/production HTTPS URL and sanitized Nginx/PM2 configuration. Verify external HTTP->HTTPS redirect, secure cookie metadata and transmission, `/auth/me`, refresh, logout, CSRF, exact CORS origin and proxy protocol. Do not include cookie values, passwords or signing secrets in evidence.
3. Verify DB/Redis/app ports are private, the app DB role is not a superuser, proxy trust is limited, and the runtime actually uses the ecosystem config and stable secrets. Confirm VPS_KNOWN_HOSTS independently, provision the protected GitHub production environment, and set HTTPS/CORS/cookie variables on the host. The workflow no longer manufactures insecure environment defaults.
4. Implement and verify backup operations: proposed minimum is encrypted daily DB backups plus uploads, 30-day retention in restricted off-host storage, separate restore credentials, and a monthly restore drill. These are **proposed requirements, not configured or tested facts**. Restore into a disposable database, verify row counts/constraints and file downloads, and record recovery time and recovery point before launch.
5. Complete all-endpoint ID/property attack replay, same-project A/B search and dependency-label tests, concurrent membership removal/reassignment tests, and four isolated browser sessions with cache/account-switch observations. Several legacy query keys lack identity components; protected cache clearing exists but race-free visual isolation is unproven.
6. Review exact allowed shared product fields and confidential notes. Project progress/health and prerequisite labels remain shared context. Dedicated manager-private comment/review notes and narrowly scoped Admin product ACLs need an explicit business policy.
7. Finish event-by-event System Audit Log coverage and durable transactional logging for all mutations, including dependencies, checklist bulk assignment, membership removal, password/status changes and stage gates. No application API edits/deletes audit rows, but DB-level append-only permissions/retention are not verified. Search/date/actor/entity/outcome filters and own-login history are implemented; absent historical events cannot be reconstructed.
8. Finish pagination across legacy unbounded lists, load/rate-limit tests, upload malware/archive handling, and nonce-based CSP work with browser compatibility checks. HSTS must be verified on the real TLS endpoint. Password-reset email delivery remains unverified/incomplete.
9. Run normal functional acceptance for project create/edit/team, checklist generation and phase assignment, dependency unlock, admin execution, Additional Work, daily progress, review, stage gates, dashboards, calendar, notifications, audit/history/search and expiry. Automated tests cover portions only; stage-gate semantics and complete browser workflows are not signed off.
10. Stop/restart the local backend, run clean Prisma generation, then visually test the new Audit Log, Owner dashboard security summary and User Security screens at the existing local frontend. No deployment or commit was performed by this review. Concurrent user-authored auth/cookie changes were preserved.

**Bottom line: NOT READY.** The tested backend boundaries now pass the expanded local suite, but unresolved dependency advisories, unverified production controls and blocked browser/profile testing prevent production approval. Do not use this report as production security certification.

---

## Historical Snapshot: September 9

Date: 2026-09-09. Status: **hardening implemented and locally tested; production gate NOT passed**.

This is an evidence-based review against relevant OWASP ASVS 5.0 areas, not an ASVS certification or a claim that every vulnerability has been found. The reported production login shows Bad Gateway. The production URL, PM2 logs, Nginx configuration, database migration state and host/network controls have not been inspected. Do not treat the local test results as production sign-off.

## Executive Summary

The initial review found authentication revocation gaps, public private-file downloads, cross-user discovery and response leaks, and an Admin-to-Owner password-reset privilege escalation. Changes address these paths and add a real HTTP/PostgreSQL regression suite. Existing roles and the JWT/cookie architecture are retained.

On the deployment follow-up, the repository contained a duplicate YAML build-approval key following a merge, an unreliable health check, and a frontend build that inferred the user's home directory as its workspace root. These are fixed. The local database was also missing the new Session.lastSeenAt column; the supplied session migration was applied locally. None of these establishes the exact cause of the production 502 without server evidence.

Current evidence: 26 security integration tests pass, 9 existing unit tests pass, backend production build passes, frontend Next.js 15.5.25 production build passes with existing lint warnings. Dependency audit still reports 1 high and 3 moderate advisories. Production release approval remains blocked pending the items below.

## Architecture and Threat Model

- Browser: React 19, Next.js App Router. AuthContext stores the current profile in memory; React Query stores API results. Credentials are HttpOnly cookies, not localStorage/sessionStorage. API requests use credentials: include. Authenticated data is fetched from the API; statically generated routes are application shells, not private user snapshots.
- Gateway: intended TLS Nginx -> Next.js on 127.0.0.1:3040 and/or API on 127.0.0.1:5040. Local development defaults to Next.js 3000 and API 4000. API rewrite destination is fixed at frontend BUILD time as well as configured at runtime.
- API: NestJS 10, global JwtAuthGuard and RolesGuard, validated DTOs, Prisma 6/PostgreSQL. Exceptions are filtered. The unconsumed unauthenticated WebSocket gateway was removed from AppModule registration; there were no broadcast callers or frontend subscribers.
- Storage: private local uploads outside frontend public assets, DB attachment metadata, authenticated download route. No remote URL ingestion was found in request handlers. No user-controlled command execution was found in application request paths.
- Deployment: GitHub Actions -> SSH/rsync -> PM2. Root pnpm workspace/lockfile is authoritative. Legacy per-package lockfiles are not the deployment source of truth.
- Assets: credentials, session/reset secrets, employee profiles, project concepts and launch information, checklist/tasks/dependencies, private comments, daily updates, reviews, attachments, audit history, DB and deployment secrets.
- Attackers: unauthenticated internet clients, malicious/compromised members, compromised Admin accounts, malicious browser origins/extensions, and dependency/deployment compromise.
- Boundaries: browser -> Next/API; API -> DB/private filesystem; Nginx -> private upstreams; CI secrets -> production host. Client-supplied IDs and roles are never authoritative.

## Roles and Access Control

OWNER is Super Admin and may delete projects. ADMIN manages projects, assignments and reviews across the workspace, matching the existing business model. TEAM_MEMBER can discover only member projects and access assigned task details. Execution requires the assigned member and an allowed workflow state. Shared project membership alone does not authorize another employee's full task details.

Minimal dependency labels/status and aggregate project information support existing workflow visibility; full foreign task contents, progress history and attachments remain restricted. Task-specific comments and uploads require task access. Project-level files are shared with permitted project members. Review/self-approval restrictions and backend object checks are separate from frontend visibility.

## Findings and Fixes

| ID / Severity | Evidence and attack scenario | Impact | Remediation / state / verification |
| --- | --- | --- | --- |
| S01 Critical | users.service resetPassword previously lacked target OWNER protection; an Admin could set the Owner's password | Super Admin takeover | Actor role passed from session, Owner target check, validated password DTO, no fallback password. Fixed; HTTP test rejects Admin -> Owner reset. |
| S02 Critical dependency | Next.js was pinned to 15.1.7; registry audit included critical RSC/RCE advisories | Potential remote server compromise, advisory-specific preconditions | Upgraded to 15.5.25. Frontend build passes; current root production audit has no critical findings. Rotate historical exposed credentials if the vulnerable version was internet-facing; no exploitation claim is made. |
| S03 High | JwtStrategy formerly checked user but no revocable session; logout/password reset left access tokens usable until expiry | Stolen credentials survive logout | Access JWT includes session ID, validates non-revoked DB session/idle/absolute expiry and current active user. Fixed; logout/password-change/role-change/disabled/deleted/expiry tests pass. |
| S04 High | Refresh used a revoked-session grace condition, deterministic JWTs and rounded-up lifetimes | Replay and lifetime extension | Random JWT IDs, hashed refresh value, atomic compare-and-swap rotation on one session, replay revokes that session, fixed absolute expiry. Tests pass. |
| S05 High | FilesController download was Public; project list/upload lacked object checks | Private attachment disclosure and unauthorized writes | Authenticated project/task checks, randomized keys, rooted path checks, symlink rejection and download disposition. Foreign read/upload tests pass. |
| S06 High | Search queries ignored the actor; analytics lacked a role restriction; member task visibility inherited whole project access | Cross-user/product discovery and reporting leaks | Query-scoped search/tasks, restricted analytics, restricted detailed user profiles, scoped project daily updates and tasks. Real HTTP A/B tests pass. |
| S07 High | Teams and project membership returned raw user relations | Password hashes and reset/security fields exposed | Explicit public user selects; response inspection tests pass. Previously exposed hashes/reset state require operational review. |
| S08 High | Comment creation checked existence but not caller relationship; subtask planning exception permitted reassignment | Unauthorized content and task changes | Comment object checks/DTOs; planning updates denied for all member tasks; assignee-only execution. Tests pass. |
| S09 High | Known initial/default passwords and production-acceptable sample signing secrets | Predictable privileged credentials | Required seed passwords, removed user/reset fallback passwords, randomized development signing fallback, production rejection of sample/missing secrets. Existing accounts/secrets are not automatically rotated. |
| S10 Medium | Cookie authentication had SameSite but no explicit mutation-origin check | CSRF, including login and multipart | Mandatory X-Requested-With: FutureX and exact origin validation; CORS allowlist. Frontend sends header on mutations/refresh/uploads. Negative origin/header tests pass. |
| S11 Medium | Review and task-state reads/writes not atomic | Double approval and concurrent transition inconsistencies | Serializable task/review transactions; daily update compare-and-swap; checklist generation claim. Concurrent review test permits one result and returns 400/409 for the other. Not every bulk/dependency race is tested. |
| S12 Medium | Task updates accepted cross-project related IDs | Corrupt or cross-product relationships | Validate assignee/collaborator membership, milestone/project relationship and bounded acyclic parent hierarchy. Cross-project planning test passes. |
| S13 Medium | Uploads trusted name and MIME and were served inline | Active content execution, overwrites | Extension/basic signature allowlist, 25MB cap, UUID names, exclusive creation, attachment disposition and sandbox CSP. Malicious type/signature tests pass. See remaining file-scanning limits. |
| S14 Medium | Raw query URLs/error messages entered request logs; weak production configuration | Credential/log disclosure and insecure deployment | Route-template logs, generic server errors, strict production cookies/origins/secrets; limited proxy trust and loopback bind. Runtime server settings remain unverified. |
| S15 Medium | Compose exposed DB/Redis on every interface; deployment learned SSH host key on connection and rsync risked uploads | Network exposure, MITM, persistent data loss | Loopback port publishing, explicit DB password, pinned SSH known-hosts secret, preserve uploads/env/build artifacts, least-privilege workflow. Committed configuration only; no firewall/SSH changes performed. |
| S16 Medium availability | Health returned 200 even after database failure; duplicate workspace YAML key; tracing outside repo | Failed deploys reported as healthy, Windows build failure | Health checks DB/session schema and returns 503; YAML fixed; explicit tracing root; deployment preflight and read-only diagnostic script. Build verified; production 502 still unconfirmed. |
| S17 Low | Missing frontend defensive headers and possible public sourcemaps | Additional browser exposure | Frame/object/base/form CSP, nosniff, restrictive referrer/permissions policy, disable X-Powered-By/public production sourcemaps. Full nonce script CSP remains open. |

## Session Review

Access tokens are short-lived HS256 JWTs (15 minutes) in access_token cookies. Refresh tokens are independently signed JWTs with random jti, stored as SHA-256 hashes in Session. SHA-256 is used for high-entropy refresh credentials; passwords continue to use Argon2.

Every authenticated request checks session identity, revoked state, absolute expiry, 60-minute inactivity, and current active/nondeleted user. It updates lastSeenAt. Normal session absolute lifetime is 12 hours. The existing remember-me choice has a 30-day absolute refresh lifetime but still observes the same 60-minute inactivity policy; this is not an unlimited persistent login credential. Access and refresh rotate without extending absolute lifetime. Replay invalidates the same session. Multi-tab refresh uses Web Locks where supported; BroadcastChannel clears other tabs after auth changes. Browser-level multi-tab behavior still needs manual production validation.

Logout revokes all sessions for the account, not only the current browser. Password change verifies the old password, atomically updates the hash and revokes sessions; user signs in again. Token reset is one-time and atomically revokes sessions. User role/status updates revoke sessions. Token validation reads current role so stale role claims are not trusted.

Production cookies require Secure, HttpOnly, Path=/ and SameSite=lax or strict; no Domain attribute. Cookie names remain unchanged to preserve client integration, not __Host-prefixed. Production refuses HTTP origins/insecure cookie mode and missing/sample JWT secrets. Development may use HTTP on loopback. Restart preserves sessions when configured signing secrets remain unchanged; random development fallback secrets invalidate prior tokens on restart. Existing pre-hardening credentials require login again.

## Backend and Frontend Review

ValidationPipe rejects unknown properties and implicit coercion is disabled. Previously interface-only comments/teams/dependency payloads have runtime DTOs. User activation/reset are DTO-validated. API JSON is capped at 256KB, audit pagination at 100, upload at 25MB, search at 200 input characters and small result counts. Some large application lists remain unpaginated; load testing and pagination are open.

Application request handlers use Prisma parameterized queries. The only new unsafe-raw SQL is isolated test-schema cleanup: a locally generated, strict-regex UUID schema identifier, never request input. The test harness refuses non-loopback DB hosts and removes only its own schema. Health uses constant SELECT 1. No shell execution using request data was found.

User-generated UI text uses React rendering. Existing layout inline scripts are fixed extension-error/hydration helpers, not user HTML; these remain a maintainability and observability concern. CSP currently restricts framing, objects, base URL and form targets but does not provide nonce-based script protection. Return-path validation rejects network paths, backslashes and control characters. Password changes clear local form state and redirect for reauthentication.

Rate limiting is bounded in-process: 20 login/reset attempts per 15 minutes by IP and normalized account hash, 120 refresh requests/minute/IP and 1200 general API requests/minute/IP. It is single-instance protection, resets at restart, and needs shared store/proxy limits for horizontal deployment or large shared NATs. No MFA or breached-password service is implemented. Existing minimum new password length is 8, maximum 128; stronger non-MFA passphrase policy and forced temporary-password replacement remain open.

## Dependency Review

Root pnpm production audit initially reported 4 critical, 27 high, 29 moderate and 5 low findings from its then-stale lockfile. After updating Next.js and explicit compatible dependency resolutions, current root audit reports **0 critical, 1 high, 3 moderate, 0 low**. These are advisory counts, not proven exploit counts.

Remaining packages: deepmerge-ts (high, through Prisma tooling), file-type (two moderate), @nestjs/core (moderate). Assess exact reachability and upgrade those dependency lines with compatibility tests; do not force a framework/Prisma major upgrade solely to silence counts. No evidence in this audit demonstrates exploitation or renders these advisories harmless. Production gate remains open until resolved or formally assessed/accepted.

## Tests Performed

- 26 real HTTP/security integration cases against Nest's actual guards, services and a fresh isolated local PostgreSQL schema: unauthenticated access, generic bad login, HttpOnly/Secure cookie settings, A/B object isolation, shared-project task isolation, search/list leakage, member management denial, Admin -> Owner protection, spoofed daily updates, private uploads/download denial, duplicate reviews with partial progress, invalid transitions, CSRF, response field minimization, refresh replay/logout, idle/absolute expiry, disabled/deleted users, password/role revocation, cross-project planning, upload signatures and Owner-only deletion.
- 9 existing unit tests pass separately; integration tests intentionally skip in ordinary unit runs and run via npm run test:security.
- Backend typecheck and production build pass. Frontend production build passes on Next.js 15.5.25; existing any/unused import lint warnings remain.
- Local HTTP smoke checks: API /api/v1/health on 4000, frontend /login on 3000, and frontend-to-API /api/v1/health on 3000 all returned 200 after the local session migration. This is not a live-production check.
- 51 generated browser JS files scanned for DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET and SMTP_PASSWORD markers: no hits. This is a targeted marker scan, not proof of zero embedded secrets.
- 19 Git commits scanned for common private-key/AWS/GitHub-token patterns; no matches. Tracked env files are the example and generated Next.js typing file; no .env history in the checked paths. A comprehensive entropy/history scan such as Gitleaks is still required. Historical default credentials must be treated as public.
- No production penetration testing, credential rotation, deployment, SSH/firewall modification, public DB port scan, backup restore or production browser login was performed.

## Production 502 Diagnosis

Run bash deploy/diagnose.sh on the server. It prints no environment secret values. Also inspect PM2 backend logs locally; redact secrets before sharing.

1. Backend 5040 unreachable: inspect PM2 crash logs, NODE_ENV/COOKIE_SECURE/HTTPS origins/signing secrets, dist/main.js and listen address. Failing security configuration deliberately prevents startup.
2. Backend health 503: check database connectivity and Session.lastSeenAt migration. Do not replace authentication/session validation with a bypass.
3. Backend health 200 but frontend /api/v1/health fails: frontend was built with a wrong API_URL or proxy target. Set API_URL=http://127.0.0.1:5040 during frontend build and NEXT_PUBLIC_API_URL=/api/v1, then rebuild/restart.
4. Both local upstreams work but external request fails: inspect Nginx proxy_pass, TLS listener and error logs. HTTP ports/hosts are not sufficient for production Secure cookies.
5. 401/403 rather than 502: check credentials/session expiry or exact Origin/header/SameSite configuration; this is a different failure class.

For established db-push installations, first inventory/baseline applied migrations using Prisma's documented migration process. This repository's historical migrations are incremental, not a complete empty-database baseline. Do not run reset or replay CREATE TABLE migrations blindly against existing production data. Back up before applying migration 202609090001_session_idle. Check production configuration and session schema using node backend/scripts/check-production.cjs before restarting PM2. Rebuild frontend against the correct API upstream. Existing sessions will require reauthentication after rollout.

## Remaining Operational Actions and Release Gate

- Obtain production URL and PM2/Nginx diagnostics; reproduce and resolve the reported 502. Verify the deployed Git revision, rather than assuming the latest source is running.
- Configure TLS and HTTP-to-HTTPS redirect; then HSTS on the TLS host without unverified includeSubDomains/preload. Test actual Set-Cookie, cache/CORS/security headers and login/refresh/navigation/logout/password-change/multiple tabs in the deployed browser.
- Rotate seed/default passwords and sample JWT/DB credentials wherever used, revoke sessions, and review historical access if exposed versions or leaked password hashes were reachable.
- Resolve remaining dependency advisories, perform full history/entropy secret scan and investigate any real findings before rotation/history remediation.
- Verify Nginx upstreams, PM2 production environment, loopback bind/firewall, PostgreSQL/Redis exposure and DB app-role least privilege. No production network settings were inferred as secure from repository examples.
- Supply verified VPS_KNOWN_HOSTS and production environment protection rules in GitHub; verify package-manager version and frozen lockfile install on the host. Existing CI is not an atomic release-directory deployment; improve rollback/build isolation before claiming zero-downtime safety.
- Establish tested encrypted backups and a restore drill. Verify DB TLS for cross-host connections and access controls on uploads/audit logs. SSH configuration changes require operational approval; verify keys before disabling password/root login.
- Add MFA/reauthentication for privileged actions and forced temporary-password change. Forgot-password currently generates a token but does not deliver an email; complete a trusted recovery delivery flow.
- Add malware scanning/quarantine and stronger archive/Office content validation. Current magic checks are basic; archives are not extracted server-side. Prevent orphan files if a DB write fails after disk write. Test authorized downloads after access-token expiry.
- Finish pagination, shared/distributed rate limiting, logging retention/redaction review and full nonce CSP. Audit all dependency/bulk-assignment races and revocation races under load; the suite is focused, not exhaustive.

The final security gate remains **NOT PASSED** until live deployment and remaining risks are verified. Working login alone is not security completion.

## References

- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Next.js August 2026 Security Release](https://nextjs.org/blog/august-2026-security-release)
