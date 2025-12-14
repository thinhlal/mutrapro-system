# MuTraPro System - Table Descriptions & Relationships

## Table Descriptions

| No | Table | Description | Service |
|---|---|---|---|
| 01 | users_auth | User authentication information (email, password, role, OAuth) | Identity Service |
| 02 | users | User profile information | Identity Service |
| 03 | email_verifications | Email verification requests | Identity Service |
| 04 | service_requests | Customer service requests (transcription, arrangement, recording) | Request Service |
| 05 | request_notation_instruments | Links service requests with notation instruments | Request Service |
| 06 | notation_instruments | Virtual instruments catalog | Request Service |
| 07 | pricing_matrix | Service pricing configuration | Request Service |
| 08 | contracts | Contract management and tracking | Project Service |
| 09 | contract_milestones | Work milestones for contracts | Project Service |
| 10 | contract_installments | Payment installments for contracts | Project Service |
| 11 | contract_sign_sessions | Electronic signature sessions for contracts | Project Service |
| 12 | task_assignments | Task assignments to specialists | Project Service |
| 13 | revision_requests | Customer revision requests | Project Service |
| 14 | file_submissions | File submission packages from specialists | Project Service |
| 15 | files | File management and storage | Project Service |
| 16 | studios | Studio recording facilities | Project Service |
| 17 | studio_bookings | Studio booking sessions | Project Service |
| 18 | booking_artists | Artists assigned to booking sessions | Project Service |
| 19 | booking_participants | Participants in booking sessions | Project Service |
| 20 | booking_required_equipment | Equipment required for booking sessions | Project Service |
| 21 | equipment | Equipment catalog | Project Service |
| 22 | skill_equipment_mapping | Maps skills to required equipment | Project Service |
| 23 | wallets | User wallet accounts | Billing Service |
| 24 | wallet_transactions | Wallet transaction ledger | Billing Service |
| 25 | payment_orders | Payment orders for wallet top-up | Billing Service |
| 26 | specialists | Specialist profiles and information | Specialist Service |
| 27 | skills | Skills catalog | Specialist Service |
| 28 | specialist_skills | Links specialists with their skills | Specialist Service |
| 29 | artist_demos | Recording artist demo portfolios | Specialist Service |
| 30 | notifications | System notifications for users | Notification Service |
| 31 | chat_rooms | Chat rooms for communication | Chat Service |
| 32 | chat_participants | Participants in chat rooms | Chat Service |
| 33 | chat_messages | Messages in chat rooms | Chat Service |
| 34 | outbox_events | Event publishing queue (Outbox Pattern) | All Services |
| 35 | consumed_events | Event consumption tracking (Idempotency) | All Services |

---

## Database Table Relationships

### JPA Relationships (Same Service - Has FK Constraint)

#### IDENTITY SERVICE (identity_db)
- **1:1** - `users_auth` ↔ `users` (same user_id, no FK constraint)

#### REQUEST SERVICE (request_db)
- **1:N** - `service_requests` → `request_notation_instruments`
- **1:N** - `notation_instruments` → `request_notation_instruments`
- **N:M** - `service_requests` ↔ `notation_instruments` (via `request_notation_instruments`)

#### PROJECT SERVICE (project_db)
- **1:N** - `contracts` → `contract_milestones`
- **1:N** - `contracts` → `contract_installments`
- **1:N** - `contracts` → `contract_sign_sessions`
- **1:N** - `contracts` → `task_assignments`
- **1:N** - `contracts` → `revision_requests`
- **1:N** - `contract_milestones` → `task_assignments`
- **1:N** - `task_assignments` → `file_submissions`
- **1:N** - `studios` → `studio_bookings`
- **1:N** - `studio_bookings` → `booking_artists`
- **1:N** - `studio_bookings` → `booking_participants`
- **1:N** - `studio_bookings` → `booking_required_equipment`
- **1:N** - `equipment` → `skill_equipment_mapping`
- **1:N** - `equipment` → `booking_required_equipment`
- **N:M** - `skills` ↔ `equipment` (via `skill_equipment_mapping`)

#### BILLING SERVICE (billing_db)
- **1:N** - `wallets` → `wallet_transactions`
- **1:N** - `wallets` → `payment_orders`
- **1:1** - `wallet_transactions` → `wallet_transactions` (refund relationship, unique)

#### SPECIALIST SERVICE (specialist_db)
- **1:N** - `specialists` → `specialist_skills`
- **1:N** - `specialists` → `artist_demos`
- **1:N** - `skills` → `specialist_skills`
- **1:N** - `skills` → `artist_demos` (optional)
- **N:M** - `specialists` ↔ `skills` (via `specialist_skills`)

#### CHAT SERVICE (chat_db)
- **1:N** - `chat_rooms` → `chat_participants`
- **1:N** - `chat_rooms` → `chat_messages`

---

### Cross-Service Soft References (No FK - String ID Only)

#### REQUEST SERVICE → IDENTITY SERVICE
- **N:1** - `users_auth` → `service_requests` (customer)
- **N:1** - `users_auth` → `service_requests` (manager, optional)
- **N:1** - `users_auth` → `email_verifications`

#### PROJECT SERVICE → IDENTITY SERVICE
- **N:1** - `users_auth` → `contracts` (customer)
- **N:1** - `users_auth` → `contracts` (manager)
- **N:1** - `users_auth` → `studio_bookings`
- **N:1** - `users_auth` → `revision_requests` (customer)
- **N:1** - `users_auth` → `revision_requests` (manager, optional)
- **N:1** - `users_auth` → `task_assignments` (via specialist_id → user_id, indirect)

#### PROJECT SERVICE → REQUEST SERVICE
- **1:1** - `service_requests` → `contracts`
- **1:1** - `service_requests` → `studio_bookings` (optional)

#### PROJECT SERVICE → SPECIALIST SERVICE
- **N:1** - `specialists` → `task_assignments`
- **N:1** - `specialists` → `revision_requests` (optional)
- **N:1** - `specialists` → `booking_artists`
- **N:M** - `skills` ↔ `equipment` (via `skill_equipment_mapping`)

#### BILLING SERVICE → IDENTITY SERVICE
- **1:1** - `users_auth` → `wallets` (unique constraint)

#### BILLING SERVICE → PROJECT SERVICE
- **N:1** - `contracts` → `wallet_transactions` (optional)
- **N:1** - `contract_milestones` → `wallet_transactions` (optional)
- **N:1** - `studio_bookings` → `wallet_transactions` (optional)
- **N:1** - `file_submissions` → `wallet_transactions` (optional)
- **1:1** - `wallet_transactions` → `revision_requests` (paid_wallet_tx_id, optional)

#### SPECIALIST SERVICE → IDENTITY SERVICE
- **1:1** - `users_auth` → `specialists` (unique constraint)

#### CHAT SERVICE → IDENTITY SERVICE
- **N:1** - `users_auth` → `chat_participants`
- **N:1** - `users_auth` → `chat_messages`

#### NOTIFICATION SERVICE → IDENTITY SERVICE
- **N:1** - `users_auth` → `notifications`

#### PROJECT SERVICE → PROJECT SERVICE (Internal)
- **1:1** - `contracts` → `files` (file_id - Contract PDF, optional)
- **1:N** - `service_requests` → `files` (request_id, optional)
- **1:N** - `task_assignments` → `files` (assignment_id, optional)
- **1:N** - `file_submissions` → `files` (submission_id, optional)
- **1:N** - `studio_bookings` → `files` (booking_id, optional)
- **1:1** - `revision_requests` → `file_submissions` (original_submission_id, soft ref)
- **1:1** - `revision_requests` → `file_submissions` (revised_submission_id, soft ref)
- **1:N** - `revision_requests` → `file_submissions` (via revision_request_id, optional)
- **1:N** - `contract_milestones` → `contract_installments` (milestone_id, optional)
- **1:N** - `booking_participants` → `booking_required_equipment` (participant_id, optional)

---

## Summary

- **Total Tables**: 35 tables
- **JPA Relationships**: 40 relationships (same service, has FK)
- **Cross-Service Soft References**: 25 relationships (different services, no FK)
- **Total Relationships**: 65 relationships

### Service Distribution
- **Identity Service**: 3 tables
- **Request Service**: 4 tables
- **Project Service**: 17 tables
- **Billing Service**: 3 tables
- **Specialist Service**: 4 tables
- **Notification Service**: 1 table
- **Chat Service**: 3 tables
- **Shared Patterns**: 2 tables (outbox_events, consumed_events)
