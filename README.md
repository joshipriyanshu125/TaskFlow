# Week 3: Production Deployment & Full-Stack Engineering

## Intern Career Path — Web Development

**Portal ID:** ICP-2AA73905-2026  
**Repository:** ICP-2AA73905-2026-REPO  
**Internship Week:** Week 3  
**Project:** TaskFlow

---

## Overview

Week 3 focuses on transforming the TaskFlow project from a development-stage application into a fully deployed, production-ready full-stack platform.

TaskFlow is a **real-time collaborative task management platform** designed to help individuals and teams organize projects, manage tasks, collaborate with team members, track deadlines, and receive real-time notifications.

The project follows a modern full-stack architecture using **React, Node.js, Express, MongoDB, Redis, Socket.IO, and cloud deployment services**.

This week focuses on production deployment, distributed real-time communication, authentication, security, testing, and cloud infrastructure.

---

## About TaskFlow

TaskFlow is a **real-time, full-stack collaborative task management application**.

The platform provides users with tools to:

- Create and manage workspaces
- Create and organize projects
- Create, update, and delete tasks
- Assign tasks to team members
- Manage task priorities and deadlines
- Use drag-and-drop task management
- View tasks through a monthly calendar
- Create and manage subtasks
- Upload file attachments
- Receive real-time updates
- Receive Web Push notifications
- Receive email notifications
- Collaborate with multiple users in real time

The application uses a distributed architecture where **Redis and Socket.IO** provide real-time communication between connected clients and backend services.

---

## Technology Stack

| **Layer** | **Technology** |
|-----------|----------------|
| **Frontend** | React 18, Vite |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas |
| **Caching / Messaging** | Redis Cloud / Upstash |
| **Real-Time Communication** | Socket.IO, Redis Pub/Sub |
| **Authentication** | JWT, Refresh Tokens, Bcrypt |
| **File Uploads** | Multer |
| **Notifications** | Web Push, VAPID, Nodemailer |
| **Testing** | Node.js Built-in Test Runner |
| **Frontend Deployment** | Vercel |
| **Backend Deployment** | Render |
| **Version Control** | Git, GitHub |

---

## Week 3 Focus Areas & Documentation Modules

| **Focus Area** | **Documentation Module** | **Key Concepts & Deliverables** |
|----------------|--------------------------|---------------------------------|
| **Focus Area 1** | Production Cloud Deployment | Vercel frontend deployment, Render backend deployment, MongoDB Atlas, Redis Cloud / Upstash, environment configuration, CORS, SPA routing. |
| **Focus Area 2** | Real-Time Distributed Architecture | Redis Pub/Sub, ioredis, Socket.IO rooms, project/workspace/user channels, event-driven communication, Redis fallback handling. |
| **Focus Area 3** | Security & Authentication | Access tokens, rotating refresh tokens, Bcrypt hashing, session revocation, rate limiting, XSS sanitization, production CORS configuration. |
| **Focus Area 4** | Collaboration & Platform Features | Multi-tenant workspaces, team assignments, subtasks, file attachments, drag-and-drop task management, calendar views and priority filtering. |
| **Focus Area 5** | Notification System | Web Push notifications, VAPID authentication, Nodemailer SMTP integration and notification delivery. |
| **Focus Area 6** | Testing & Quality Assurance | Automated authentication tests, protected route testing, validation testing, production build verification and zero build warnings. |

---

## Production Deployment

TaskFlow has been successfully deployed using a distributed cloud architecture.

### Frontend

**Technology:** React 18 + Vite  
**Platform:** Vercel

The frontend is deployed globally through Vercel with SPA rewrite routing for seamless navigation.

🌐 **Live Frontend:**

https://taskflow-frontend-blond.vercel.app/

---

### Backend

**Technology:** Node.js + Express.js  
**Platform:** Render

The backend provides REST APIs, authentication, task management, workspace management, notifications, file uploads and real-time communication.

⚙️ **Live Backend API:**

https://taskflow-odak.onrender.com/

---

### Database

**MongoDB Atlas**

MongoDB Atlas is used as the primary production database for storing:

- Users
- Workspaces
- Projects
- Tasks
- Subtasks
- Notifications
- Sessions
- Other application data

---

### Real-Time Infrastructure

**Redis Cloud / Upstash**

Redis is used for:

- Pub/Sub messaging
- Real-time event distribution
- Distributed communication
- Caching
- Communication between backend processes

Socket.IO provides real-time communication between the backend and connected clients.

---

## Key Production Features

### Task Management

- Drag-and-drop task management
- Task creation and editing
- Task assignment
- Priority management
- Deadline tracking
- Subtask checklists
- Monthly calendar view

### Collaboration

- Multi-tenant workspace architecture
- Team member management
- Project-based collaboration
- Real-time task updates
- Socket.IO room-based communication

### Notifications

- Real-time Web Push notifications
- VAPID authentication
- Email notifications using Nodemailer
- Notification event handling

### File Management

- File attachments
- Multer-based upload handling
- Task-level file association

---

## Security Implementation

TaskFlow implements multiple layers of application security:

- JWT-based authentication
- Access and rotating refresh tokens
- Bcrypt password hashing
- Server-side session revocation
- Rate limiting
- XSS input sanitization
- CORS configuration
- Protected API routes
- Production environment variables

---

## Testing & Quality Assurance

The production application was validated through automated testing.

### Test Results

- **14/14 automated tests passing**
- Authentication testing completed
- Protected route testing completed
- Input validation testing completed
- Production build verification completed
- Vite production build completed with zero build warnings

---

## Live Application & Resources

### 🌐 Live Frontend

https://taskflow-frontend-blond.vercel.app/

### ⚙️ Backend API

https://taskflow-odak.onrender.com/

### 📦 GitHub Repository

https://github.com/joshipriyanshu125/TaskFlow.git

### 🆔 Internship Portal

**ICP-2AA73905-2026**

---

## Week 3 Milestones

1. **Production Deployment:** Successfully deployed the React frontend and Node.js backend to cloud infrastructure.

2. **Database Infrastructure:** Configured MongoDB Atlas as the production database.

3. **Redis Infrastructure:** Integrated Redis Cloud / Upstash for caching and real-time messaging.

4. **Real-Time Architecture:** Implemented Redis Pub/Sub and Socket.IO room-based communication.

5. **Security:** Implemented JWT authentication, refresh token rotation, Bcrypt hashing, rate limiting and XSS protection.

6. **Collaboration:** Implemented multi-tenant workspaces, team assignments, subtasks and real-time collaboration.

7. **Notifications:** Implemented Web Push and email notification systems.

8. **Testing:** Achieved a 14/14 automated test pass rate.

9. **Production Verification:** Verified the production build with zero Vite build warnings.

10. **Documentation:** Completed production deployment and technical documentation.

---

## Final Outcome

By the end of Week 3, TaskFlow was transformed into a **production-ready, cloud-deployed, real-time collaborative task management platform**.

The project demonstrates practical experience with:

- Full-stack MERN development
- REST API development
- Real-time distributed systems
- Redis Pub/Sub
- Socket.IO
- Cloud deployment
- Database management
- Authentication and authorization
- Application security
- File uploads
- Push and email notifications
- Automated testing
- Production infrastructure

The application is now **live and accessible through the deployed frontend and backend services**.
