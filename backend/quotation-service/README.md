# quotation-service

Scope: manage service_requests, quotations (versioned), pricing_matrix, payment_milestones.

- Owned tables: service_requests, quotations, pricing_matrix, payment_milestones
- API base: /quotations (e.g. /requests, /quotes, /pricing)
- Emits: request.created|updated; quotation.created|revised|approved|rejected|expired; milestones.generated
- Consumes: (optional) user.created; specialist.updated
- Depends on: user-service (customers, coordinators)

Note: ensure single active quotation per request via partial unique index (per ERD).
