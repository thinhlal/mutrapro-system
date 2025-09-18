# feedback-service

Scope: collect customer feedback and (MVP) store activity logs.

- Owned tables: feedback, activity_logs (optionally move to audit-log service later)
- API base: /feedback
- Emits: feedback.created; audit.logged (usually a sink)
- Consumes: project.completed (request for feedback), system events for logging
- Depends on: user-service, project-service
