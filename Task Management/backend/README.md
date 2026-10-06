# Task Management — MERN Backend

An Express and MongoDB API for a private task-management app. Every task is owned by the authenticated user; the included `UserRole` model keeps the app ready for future team/admin work.

## Features

- JWT sign-up/sign-in (`/api/auth`)
- Private task CRUD (`/api/tasks`)
- Filters for status, priority, category, and due-date range
- Drag-and-drop persistence through task `position` and `PATCH /api/tasks/reorder`
- Request validation, centralized errors, and secure password hashing

## Run locally

1. Copy `.env.example` to `.env` and set `JWT_SECRET`.
2. Start a local MongoDB server.
3. Install dependencies: `npm install`.
4. Start development server: `npm run dev`.

The health endpoint is available at `GET /health`. The API runs on `http://localhost:5000` by default.

## API summary

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/signin` | Sign in and receive a JWT |
| GET | `/api/auth/me` | Read the current account |
| GET | `/api/tasks` | List the caller's tasks and apply filters |
| POST | `/api/tasks` | Create a task |
| GET/PATCH/DELETE | `/api/tasks/:id` | Read, update, or remove one private task |
| PATCH | `/api/tasks/reorder` | Save drag-and-drop positions |

Send `Authorization: Bearer <token>` to every protected route.

## Architecture

```text
React client → Express routes → auth middleware → controllers → Mongoose models → MongoDB
                                      │
                                      └→ validation + error middleware
```

The frontend can use this API from the planned `/auth` and `/dashboard` routes. Team sharing, notifications, and file storage remain intentionally outside this MVP's implemented scope.
