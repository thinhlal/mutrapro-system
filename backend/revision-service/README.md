# revision-service

Scope: manage revision workflow and deliverable packages.

- Owned tables: revision_requests, deliverable_packages, package_files
- API base: /revisions (e.g. /packages)
- Emits: revision.requested|approved|completed; package.prepared|delivered
- Consumes: file.uploaded (link deliverables), project.started/completed
- Depends on: file-service, project-service
