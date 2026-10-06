# Backend Architecture & System Design

## Architecture Overview

The backend application is structured as a **modular monolith** built on Node.js and Express. It organizes domain responsibilities into cleanly decoupled modules (Routes, Models, Services, and Workers), enabling simplicity and rapid iteration with clear boundaries for microservice extraction when scale demands.

```text
                           ┌──────────────────────┐
                           │ Web / Mobile Clients │
                           └──────────┬───────────┘
                                      │ HTTPS / REST (JSON)
                           ┌──────────▼───────────┐
                           │ Rate Limiter & Sanitize
                           └──────────┬───────────┘
                                      │
 ┌────────────────────────────────────▼────────────────────────────────────────┐
 │                      Express REST API — Modular Monolith                    │
 │                                                                             │
 │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
 │ │    Auth     │ │    Users    │ │ Workspaces  │ │    Teams    │ │ Admin   │ │
 │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
 │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
 │ │  Projects   │ │    Tasks    │ │   Labels    │ │ Notifications│ │ Search │ │
 │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
 │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────────────────┐ │
 │ │  Analytics  │ │ File Upload │ │               Event Bus                 │ │
 │ └─────────────┘ └─────────────┘ └─────────────────────────────────────────┘ │
 └───────┬────────────────────────────┬─────────────────────────────┬──────────┘
         │ Mongoose ODM               │ Key-Value Caching           │ File API
 ┌───────▼──────────────┐     ┌───────▼──────────────┐      ┌───────▼──────────┐
 │ MongoDB Database     │     │ Redis Cache Engine   │      │ Storage Layer    │
 │ (Document Store)     │     │ (w/ In-Memory Fallback)│    │ (Static/Uploads) │
 └───────┬──────────────┘     └──────────────────────┘      └──────────────────┘
         │
 ┌───────▼──────────────────────────┐
 │ Background Scheduler (Cron)      │
 ├──────────────────────────────────┤
 │ - Due date reminders (every 15m) │
 │ - Recurring task engine (daily)  │
 └───────┬──────────────────┬───────┘
         │                  │
 ┌───────▼──────┐   ┌───────▼──────┐
 │ Email (SMTP) │   │ Push (VAPID) │
 └──────────────┘   └──────────────┘
```

## Module Responsibilities

| Module | Responsibility | Key Models & Services |
|---|---|---|
| **Auth** | Registration, login, password hashing (bcrypt), JWT tokens, session lifecycle & invalidation | `User`, `Session`, `UserRole`, `token.js` |
| **Users** | Profile CRUD, preferences (theme, notification settings), avatar, push subscriptions | `User` |
| **Workspaces** | Workspace CRUD, slug generation, multi-tenant workspace membership, cascade deletion | `Workspace`, `WorkspaceMember` |
| **Teams** | Team creation within workspaces, member management, lead assignments | `Team` |
| **Projects** | Project metadata, team scoping, auto-keying, archiving/restoring, cascade cleanup | `Project` |
| **Tasks & Subtasks** | Task CRUD, position reordering, subtasks, priorities, recurrence, assignees | `Task`, `Subtask` |
| **Comments & Activity** | Threaded comments, immutable audit log of actions per task | `Comment`, `Activity` |
| **Labels** | Hex-coded labeling scoped by workspace or project | `Label` |
| **Notifications** | In-app notification inbox, unread counts, mark all read | `Notification` |
| **Search** | Indexed regex and text search across tasks and projects | `Task`, `Project` |
| **Analytics** | Real-time task statistics, completion rates, cached with Redis TTL | `analytics.js`, `redis.js` |
| **Admin** | System health, tenant metrics, paginated user management, role upgrades/deactivations | `admin.js` |
| **Events** | Internal pub/sub event bus coordinating automatic notifications and push dispatches | `events.js` |

## Infrastructure & Supporting Services

- **MongoDB (Persistence):** Primary database storing all domain entities with secondary indexes on foreign keys and search terms.
- **Redis (Cache Layer):** Connected for distributed caching (e.g. analytics dashboard) with seamless in-memory fallback for offline/local environments.
- **Background Scheduler:** In-process scheduler running recurring cron intervals for due date threshold alerts and recurring task generation.
- **Email Service:** Nodemailer SMTP integration for welcome greetings and secure password reset tokens.
- **Push Notifications:** Web-Push (VAPID) protocol support dispatching instant alerts on task assignments and updates.
- **Security:** In-memory + Redis rate limiting, NoSQL query injection sanitization, MIME-type file upload filtering, and JWT session revocation.

