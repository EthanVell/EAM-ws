# Firestore Security Specification · EAM 设备报修

## 1. Data Invariants
1. **Factory Boundary**: All operational documents (`equipment`, `repairOrders`, `inspections`, `spareParts`, `lifecycleLogs`, `users`) belong to `factoryId == 'bencao-main'`. List queries are strictly constrained to verified users querying `factoryId == 'bencao-main'`.
2. **Zero Self-Escalation (RBAC)**: New users creating `/users/{uid}` are strictly restricted to `role == 'operator'` (except the verified bootstrapped administrator `wylvyx@gmail.com`). Only a `supervisor` may modify another user's `role`.
3. **PII Isolation**: User email addresses are stored exclusively in `/users/{uid}/private/contact`, readable only by the document owner or a verified `supervisor`.
4. **Equipment Reference Integrity**: Repair orders and inspection records must reference an existing `/equipment/{equipmentId}` document on creation (`exists(...)`).
5. **Terminal State Locking**: A `repairOrders` document in `status == 'closed'` and an `equipment` document in `lifecycleStage == 'scrapped'` cannot be mutated by non-supervisors.
6. **Immutable Audit Trails**: `inspections` and `lifecycleLogs` are append-only (`update` and `delete` denied for all clients).
7. **Server-Time Enforcement**: Every `createdAt` on create and `updatedAt` on update must equal `request.time`.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read `/equipment` without `request.auth` -> DENIED.
2. **Unverified Email Write**: Authenticated user with `email_verified == false` creating a repair order -> DENIED.
3. **Self-Role Escalation on Registration**: New user sets `role: "supervisor"` in `/users/{uid}` -> DENIED.
4. **Self-Role Escalation on Update**: Existing `operator` updates their own `/users/{uid}` changing `role` to `"technician"` -> DENIED.
5. **PII Cross-Read**: `operator` tries to `get` `/users/{otherUid}/private/contact` -> DENIED.
6. **ID Poisoning**: Creating `/equipment/<1500-char-id>` or invalid characters `$#@` -> DENIED by `isValidId()`.
7. **Shadow Field Injection**: Updating a repair order with an extra ghost key `isApprovedByFDA: true` -> DENIED by `hasOnly()` & `isValidRepairOrder()`.
8. **Identity Spoofing on Repair Order**: `operator` A submits repair order with `reporterUid: operatorB_uid` -> DENIED.
9. **Orphaned Repair Order**: Creating a repair order with non-existent `equipmentId: "fake-999"` -> DENIED by `exists()`.
10. **State Shortcutting**: `operator` directly updates a `pending` repair order to `closed` skipping `in_progress`/`verifying` -> DENIED.
11. **Terminal State Tampering**: `technician` attempts to reopen a `closed` repair order -> DENIED.
12. **Client Timestamp Forgery**: Creating a lifecycle log with a backdated `createdAt` instead of `request.time` -> DENIED.
