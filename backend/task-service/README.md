# task-service

Scope: manage task_assignments (deadline-based, simplified).

- Owned tables: task_assignments
- API base: /tasks
- Emits: task.assigned|accepted|in_progress|completed|overdue
- Consumes: project.created (to initialize tasks), specialist.updated (optional)
- Depends on: project-service, specialist-service (ids reference)
