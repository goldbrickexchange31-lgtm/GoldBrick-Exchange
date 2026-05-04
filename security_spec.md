# Security Specification: GoldBrick Exchange

## Data Invariants
1. A **User** cannot have a balance less than 0.
2. A **User** cannot change their own `role`, `balance`, or `status`.
3. An **Investment** must be tied to a valid user and the amount must be deducted from the user's balance.
4. A **Transaction** of type `withdrawal` must result in a balance reduction (managed by admin approval).
5. **AdminConfig** and **Plans** can only be modified by accounts with `role == 'admin'`.
6. **Chat Messages** can only be read/written by the owner of the chat or an admin.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Balance Hijack**: User attempts to `update` their own `balance` field.
2. **Privilege Escalation**: User attempts to `update` their `role` to 'admin'.
3. **Negative Balance**: User attempts to `create` an investment that exceeds their `balance`.
4. **Shadow Deposit**: User attempts to `create` a transaction with `status: 'approved'`.
5. **ID Poisoning**: User attempts to create a document with a 2MB string as ID.
6. **Cross-User Snooping**: User A attempts to `get` User B's private `Transaction` document.
7. **Phantom Message**: User attempts to send a chat message as if they were 'Admin'.
8. **Config Sabotage**: Unauthenticated user attempts to `update` `/config/general`.
9. **Referral Loop**: User attempts to set themselves as their own referrer during registration.
10. **Terminal State Bypass**: User attempts to `update` a `rejected` transaction back to `pending`.
11. **Timestamp Spoofing**: User attempts to `create` an investment with a `createdAt` date in the future.
12. **Shadow Field Injection**: User attempts to `update` user profile with a hidden `isAdmin: true` field.

## Security Rule Logic
The rules will implement:
- Strict schema validation via `isValid[Entity]` helpers.
- `affectedKeys().hasOnly()` to restrict updates to specific fields.
- Identity checks using `request.auth.uid`.
- Admin validation using `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`.
