# TaskFlow — Modern & Minimalist Task Management Application

A full-stack, editorial, calm, and minimalist task management web application inspired by clean Swiss-style design and typography. Built with **React (Vite)** on the frontend and **Express + MongoDB (Mongoose)** on the backend.

---

## 🎨 UI/UX Design System

- **Warm Minimalist Color Palette:** Soft warm cream canvas (`#FAF7F2`), subtle ambient radial glow, warm terracotta/burnt orange accent buttons (`#C25508`), and off-white cards with fine borders and soft shadows.
- **Editorial Typography:** High-contrast serif headlines (*Playfair Display* & *Instrument Serif*) paired with modern geometric sans (*Plus Jakarta Sans* & *Inter*).
- **Hero & Landing Showcase:**
  - "✨ Free for individuals. Ready for teams." pill badge
  - "Organize your work, *beautifully.*" editorial headline
  - 4 Feature cards: **CRUD tasks**, **Smart filtering**, **Deadlines**, **Drag & drop**
  - **"Built for focus."** interactive live demo with interactive toggle items
- **Authentication Modals:**
  - Pixel-perfect "Create your account" and "Sign in" cards with 1-Click Demo Login.
- **Dynamic Task Dashboard:**
  - **List View:** Clean task rows with circular check toggles, priority chips (`urgent`, `high`, `medium`, `low`), category badges, due date badges, subtask counters, and drag-and-drop handles.
  - **Kanban Board:** 4 columns (*To Do*, *In Progress*, *In Review*, *Completed*) with real-time drag-and-drop position and status synchronization.
  - **Deadlines View:** Chronological breakdown (*Overdue*, *Today*, *Upcoming Next 7 Days*, *Later*).
  - **Analytics & Insights:** Live completion rates, priority distribution meters, and category charts.
  - **Slide-Over Task Drawer:** Subtasks checklist with progress bars, live discussion comments, and activity audit log.

---

## 🚀 How to Run the Application

### 1. Start the Backend API (Port 5000)

```bash
cd "Week2/Task Management/backend"
npm install
npm run dev
```

*The backend runs on `http://localhost:5000` with MongoDB and includes health checks at `http://localhost:5000/health`.*

### 2. Start the Frontend Application (Port 5173)

```bash
cd "Week2/Task Management/frontend"
npm install
npm run dev
```

*Open your browser and navigate to `http://localhost:5173/`.*

---

## 🔌 API & Connectivity Overview

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/signup` | `POST` | Register a new account & receive JWT session |
| `/api/auth/signin` | `POST` | Sign in & receive access and refresh tokens |
| `/api/auth/me` | `GET` | Fetch authenticated user profile |
| `/api/tasks` | `GET` | List tasks with multi-field search, status, priority, and date filters |
| `/api/tasks` | `POST` | Create a new task |
| `/api/tasks/:id` | `PATCH` | Update task title, description, priority, category, status, due date |
| `/api/tasks/:id` | `DELETE` | Delete a task and cascade subtasks/comments/activity |
| `/api/tasks/reorder` | `PATCH` | Persist drag-and-drop order updates |
| `/api/tasks/:id/subtasks` | `POST` / `PATCH` / `DELETE` | Manage task checklist subtasks |
| `/api/tasks/:id/comments` | `GET` / `POST` | Task discussion comments thread |
| `/api/tasks/:id/activities`| `GET` | Task audit activity history |
| `/api/workspaces` | `GET` / `POST` | Manage collaborative workspaces |
| `/api/workspaces/:id/members` | `GET` / `POST` | Workspace member invitations |
| `/api/analytics/overview` | `GET` | Task performance and productivity statistics |
