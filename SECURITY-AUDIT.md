# FutureX Security Audit and Deployment Verification

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
