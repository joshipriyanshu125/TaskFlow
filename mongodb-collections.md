# MongoDB Collections

## Database: `Task_management`

This database stores the task-management application's users, teams, tasks, and activity data. Each document uses MongoDB's `_id` as its primary identifier; related records use `ObjectId` references such as `userId`, `teamId`, and `taskId`.

## Collections

| Collection | Purpose | Main fields |
|---|---|---|
| `users` | User accounts and profile details. | `_id`, `name`, `email`, `passwordHash`, `avatarUrl`, `createdAt`, `updatedAt` |
| `teams` | Team/workspace details. | `_id`, `name`, `description`, `createdBy`, `createdAt`, `updatedAt` |
| `teamMembers` | Connects users to teams and stores their role. | `_id`, `teamId`, `userId`, `role`, `joinedAt` |
| `tasks` | Tasks assigned to a team or user. | `_id`, `teamId`, `title`, `description`, `status`, `priority`, `assigneeId`, `createdBy`, `dueDate`, `createdAt`, `updatedAt` |
| `comments` | Comments posted on a task. | `_id`, `taskId`, `userId`, `message`, `createdAt`, `updatedAt` |
| `notifications` | In-app notifications for users. | `_id`, `userId`, `type`, `message`, `taskId`, `isRead`, `createdAt` |
| `activityLogs` | Record of important user actions. | `_id`, `userId`, `teamId`, `taskId`, `action`, `details`, `createdAt` |

## Collection Relationships

```text
users ──< teamMembers >── teams ──< tasks ──< comments
                                  │
                                  └──< activityLogs

users ──< notifications
users ──< comments
users ──< activityLogs
```

## Suggested Indexes

- `users.email`: unique index to prevent duplicate accounts.
- `teamMembers`: compound unique index on `{ teamId, userId }`.
- `tasks`: indexes on `{ teamId, status }` and `{ assigneeId, dueDate }`.
- `comments.taskId`: index to load task discussions quickly.
- `notifications`: index on `{ userId, isRead, createdAt }`.
- `activityLogs`: index on `{ teamId, createdAt }`.
