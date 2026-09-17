# FutureX Role Architecture Migration

Date: 2026-09-16

## Result

The role model is now separated into System Role, Functional Role, Product Membership, Project Role, checklist eligibility and exact Task Assignee. The migration is additive and does not reset the database, change existing IDs, delete Tasks or alter Audit Log rows.

Checklist assignment is phase-based operationally. `ProjectPhaseAssignment` stores the optional default assignee and `ProjectPhaseMember` stores additional members; `Task.assigneeId` remains the authoritative owner. These records reference the existing Product Team and do not create a second Development or Marketing team.

Local post-migration verification:

- Functional Roles: 10
- User to Functional Role links: 2
- Product Member to Project Role links: 11
- Checklist eligible-role links: 104
- Active checklist templates without an eligible role: 0
- Historical assignment rows at migration time: 0 (new changes are recorded from this release onward)

## Standard Catalog

`PROJECT_MANAGER`, `LEAD_DEVELOPER`, `DEVELOPER`, `UI_UX_DESIGNER`, `THREE_D_ARTIST`, `QA_ENGINEER`, `MARKETING_MANAGER`, `MARKETING_EXECUTIVE`, `MARKETING_DESIGNER`, `CONTENT_CREATOR`.

## Checklist Mapping

| Legacy responsibility | Primary role | Other eligible roles |
| --- | --- | --- |
| PROJECT MANAGEMENT / PROJECT_MANAGER | PROJECT_MANAGER | - |
| PM_DESIGNER | PROJECT_MANAGER | UI_UX_DESIGNER |
| LEAD_DEVELOPER | LEAD_DEVELOPER | - |
| DEVELOPER | DEVELOPER | - |
| DESIGNER | UI_UX_DESIGNER | - |
| DESIGNER_ARTIST | UI_UX_DESIGNER | THREE_D_ARTIST |
| QA_PM | QA_ENGINEER | PROJECT_MANAGER |
| MARKETING_PM | MARKETING_MANAGER | PROJECT_MANAGER |
| PM_MARKETING | PROJECT_MANAGER | MARKETING_MANAGER, MARKETING_EXECUTIVE |
| PM_DEVELOPER | PROJECT_MANAGER | DEVELOPER |
| DEVELOPER_PM | DEVELOPER | PROJECT_MANAGER |
| MARKETING_ASSISTANT | MARKETING_EXECUTIVE | - |
| WEB_MARKETING | MARKETING_EXECUTIVE | - |
| MARKETING_TEAM | CONTENT_CREATOR | MARKETING_EXECUTIVE |
| MARKETING_LEAD | MARKETING_MANAGER | - |
| MARKETING_DESIGNER | MARKETING_DESIGNER | - |

`WEB_MARKETING` and `MARKETING_TEAM` are the least certain legacy labels. They are explicitly documented here rather than silently presented as source truth and should be confirmed by the Product owner.

## Existing User Migration

Existing legacy role links were copied. Existing Product managers were made explicit Product members and received Project Manager capability. No role was inferred from free-text Job Title because doing so could grant an incorrect workflow capability. Owners must review remaining users in User Directory and assign their Functional Roles, then confirm Project Roles in each Product Team.

## Deployment Safety

Migrations `202609160001` through `202609160004` are ordered and contain no reset, truncate, Task deletion or Audit Log mutation. Migration `202609160004` adds only phase-assignment tables, indexes and foreign keys. This local database has a known Prisma migration-history baseline mismatch from earlier `db push` usage, so production must be backed up and baselined before `prisma migrate deploy`; do not blindly apply or mark migrations as complete.
