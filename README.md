# FutureX Project Management Portal

Enterprise-grade, internal project management, task tracking, and game delivery portal for FutureX teams (Colombo Rider, HiddenMe, FutureX Web Platform).

---

## 📁 Project Structure

```text
futurex-project-management/
│
├── frontend/                     # Next.js 15 App Router Frontend Application
│   ├── src/
│   │   ├── app/                  # Application Routes (Dashboard, Projects, Tasks, Team, Reports, Admin, etc.)
│   │   ├── components/           # UI Atoms & Layout Components (AppShell, Modals, StatusPills)
│   │   ├── features/             # Role Dashboards, Task SlideOver, Projects, Workload
│   │   ├── services/             # Centralized API Service (services/api/api-client.ts)
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/                # TypeScript Domain Models & Contracts
│   │   └── styles/               # FutureX Green Palette Design Tokens
│   ├── public/
│   ├── .env.local
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                      # NestJS 10 REST API, WebSocket Gateway & PostgreSQL Service
│   ├── src/
│   │   ├── auth/                 # Argon2 Auth, JWT, HTTP-Only Cookie Session
│   │   ├── users/                # User Directory & Role Management
│   │   ├── teams/                # Team Directory & Workload Capacity Gauges
│   │   ├── projects/             # Projects, Progress Rollup & Auto Health Evaluation
│   │   ├── milestones/           # Milestones Progression
│   │   ├── tasks/                # Tasks, Subtasks, Review Workflow & Human IDs (CR-101)
│   │   ├── dependencies/         # DFS Cycle Detection & Finish-to-Start Automation
│   │   ├── comments/             # Task Discussions & Activity Mentions
│   │   ├── files/                # File Attachments & Upload Handling
│   │   ├── notifications/        # In-App Notification Center & Read Tracking
│   │   ├── reports/              # Executive Studio & PM Delivery Analytics
│   │   ├── audit/                # Immutable Security Audit Logs
│   │   ├── search/               # Global Command-K Search
│   │   ├── health/               # System & DB Health Endpoint
│   │   ├── common/               # JWT Guards, RBAC, Filters, Interceptors
│   │   └── types/                # Relational Entity Types & Shared Enums
│   ├── prisma/
│   │   ├── schema.prisma         # Normalized Relational PostgreSQL Schema
│   │   └── seed.ts               # FutureX Accounts & Colombo Rider Dependency Chain Seeder
│   ├── test/                     # Unit & Integration Tests (Jest)
│   ├── .env
│   ├── package.json
│   ├── nest-cli.json
│   └── tsconfig.json
│
├── docker-compose.yml            # PostgreSQL 16 & Redis 7 Container Config
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm run db:push
npm run db:seed
npm run dev
```

* Backend API: `http://localhost:4000/api/v1`
* Swagger OpenAPI Documentation: `http://localhost:4000/api/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

* Frontend Web Application: `http://localhost:3000`

---

## 🔑 Demo Credentials

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Studio Owner** | Deshan Silva | `owner@futurex.com` | `Owner123!@#` |
| **Admin** | Dilshan Perera | `admin@futurex.com` | `Admin123!@#` |
| **Project Manager** | Kasun Mendis | `pm.kasun@futurex.com` | `Manager123!@#` |
| **3D Artist** | Amal Perera | `artist.amal@futurex.com` | `Artist123!@#` |
| **Game Developer** | Nimal Fernando | `dev.nimal@futurex.com` | `Dev123!@#` |
| **QA Lead** | Kavindi Jayawardena | `qa.kavindi@futurex.com` | `Qa123!@#` |
| **UI/UX Designer** | Shehan Silva | `designer.shehan@futurex.com` | `Designer123!@#` |

---

## ⚙️ Core Engine Features

1. **Finish-to-Start Dependency Automation Engine**:
   * Predecessor tasks enforce downstream `BLOCKED` status in the backend.
   * Cycle detection algorithms prevent circular dependency loops.
   * When all prerequisite tasks become `DONE`, downstream tasks automatically transition to `READY` and assignees receive real-time notifications.
2. **Weighted Project Progress & Automated Health**:
   * Progress calculated dynamically based on estimated effort hours.
   * Automated health evaluation (`ON_TRACK`, `AT_RISK`, `OFF_TRACK`) based on delivery deadlines, blocked tasks, and milestone elapsed time.
3. **Role-Aware Dashboards**:
   * **Studio Owner**: Studio-wide project portfolio, at-risk flags, milestone delivery charts.
   * **Project Manager**: Managed projects, *Needs Attention* feed, team workload meters, review & approval queue.
   * **Team Members**: Focused personal *Priority Work* queue with instant readiness indicators.
