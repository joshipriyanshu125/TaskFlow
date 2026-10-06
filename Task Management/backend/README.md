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

The root endpoint (`GET /`) returns API information and points to the health check at `GET /health`. The API runs on `http://localhost:5000` by default.

## Email delivery on Render

Render may block outbound SMTP connections, which causes Gmail SMTP sends to time out. Configure the Resend HTTPS API instead:

1. Create a Resend API key and verify the sending domain you want to use.
2. In the Render backend environment, set `RESEND_API_KEY` and `EMAIL_FROM` (for example, `TaskFlow <no-reply@your-verified-domain.com>`).
3. Redeploy the backend. The Resend API is preferred whenever `RESEND_API_KEY` is set; SMTP remains available as a fallback for local development.

Never commit API keys or add them to source code.

## Frontend deployment settings

For the current Vercel deployment, set the Render backend environment variable `CLIENT_ORIGIN` to `https://taskflow-frontend-two-ecru.vercel.app`. This URL is used for password-reset and workspace-invitation links. The same origin is allowed by the backend CORS policy by default in production. If Render still has `CLIENT_ORIGIN` set to localhost, production ignores that local value and uses the Vercel origin instead.

If the frontend has additional production domains or Vercel preview domains, add their exact origins as a comma-separated `CORS_ORIGINS` value in Render. Paths are normalized away; for example: `https://app.example.com,https://preview.example.com`.

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
