# Customers Section — Design

**Date:** 2026-08-07
**Status:** Approved

## Problem

The app only records money (`transactions`: work/expense + amount). A repair shop also needs to record *who* the customer is and *what job* was taken in: name, work done, IMEI, phone, CNIC, and a photo. This record must never show or store payment.

## Decisions

| Question | Decision |
|---|---|
| Relationship to transactions | Fully separate. New table, new section, no link, no amount. |
| Photo storage | Compress in browser, upload to a **private** Supabase Storage bucket; local blob cached in IndexedDB so it works offline and uploads when back online. |
| Photos per customer | Exactly one. |
| Fields beyond the six requested | Date, Status (pending/delivered), Notes, Address. |
| Required fields | `customer_name` and `work_name` only. Everything else optional. |
| Navigation | Customers is the **first** nav item (sidebar + mobile). The mobile `+` FAB is context-aware: on `/customers` it adds a customer, elsewhere it adds a money entry. |
| List controls | One search box matching name / phone / IMEI / CNIC. No status filter, no date filter, no CSV. |

## Data model

New table `customers` (migration `003_customers.sql`). No amount/currency column exists by design.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | **Always generated client-side** (`crypto.randomUUID()`), online and offline. See "Why client-side ids". |
| `store_id` | uuid FK → stores | cascade delete |
| `work_name` | text NOT NULL | the job taken in |
| `customer_name` | text NOT NULL | |
| `imei` | text NOT NULL DEFAULT '' | optional in UI |
| `phone` | text NOT NULL DEFAULT '' | optional in UI |
| `cnic` | text NOT NULL DEFAULT '' | optional in UI |
| `address` | text NOT NULL DEFAULT '' | optional in UI |
| `notes` | text NOT NULL DEFAULT '' | optional in UI |
| `photo_path` | text NULL | storage object path; null until an upload succeeds |
| `status` | text NOT NULL | `CHECK (status IN ('pending','delivered'))`, default `'pending'` |
| `date` | date NOT NULL | default `CURRENT_DATE` |
| `created_at` | timestamptz | default `now()` |
| `created_by` | uuid FK → auth.users | |

Indexes: `(store_id)`, `(store_id, date)`.

RLS mirrors `transactions`: store members may select/insert/update/delete rows of their stores; insert additionally requires `auth.uid() = created_by`.

### Why client-side ids

Transactions let the server mint the id and remap `local_*` ids after sync. Customers can't do that cheaply, because the photo's storage path embeds the customer id. Generating the uuid on the client makes the path (`{store_id}/{customer_id}.jpg`) stable from the moment of creation, online or offline, and removes the whole local-id remapping branch. Insert always sends an explicit `id`.

## Photo pipeline

Bucket `customer-photos`, **private** (photos and CNIC are PII — no public URLs). Object path: `{store_id}/{customer_id}.jpg`.

Storage RLS: a user may read/write an object only when the first path segment is a store they are a member of.

1. User picks a file (camera or gallery).
2. Browser compresses it: longest edge ≤ 1000px, JPEG quality 0.8 (~100–200 KB).
3. The blob is written to IndexedDB store `photoBlobs` keyed by customer id, with `uploaded: false`.
4. If online, it uploads immediately (`upsert: true`) and the row is saved with `photo_path`; the local blob is marked `uploaded: true` and kept as an offline display cache.
5. If offline, the row is saved without `photo_path` and queued. The sync worker uploads the blob first, then writes `photo_path` on the row.

Display resolution order: local blob (object URL) → signed URL from storage (1 h, cached by React Query) → initials placeholder.

Delete: remove the row, then best-effort delete the storage object and the local blob. A failed object delete is logged and ignored (orphan file, no user-visible failure).

## Offline layer

`offline-db.ts` goes from `DB_VERSION` 1 → 2. The existing `upgrade` handler already guards every `createObjectStore` with a `contains()` check, so v1 data survives untouched. Two new stores:

- `customers` — key `id`, indexes `by-store`, `by-date`, `by-sync-status`.
- `photoBlobs` — key `customerId`, value `{ customerId, storeId, blob, uploaded }`.

`sync-service.ts` currently hardcodes the `transactions` table. It gets a small table-adapter indirection: `SyncQueueItem.table` becomes `'transactions' | 'customers'`, and create/update/delete look up the adapter (which local store to read/write, which Supabase table to hit). Customers additionally run the photo-upload step before create/update. Last-write-wins conflict resolution stays as-is.

## UI

- `src/pages/customers.tsx` — heading, search box, list, add button (desktop) / FAB (mobile).
- `src/components/customers/customer-list.tsx` — one row per customer: photo thumbnail (or initials), customer name, work name, status badge, date; tapping expands to show IMEI, phone, CNIC, address, notes and the full photo. Row menu: Edit, Mark delivered/pending, Delete. Sync-status icon reused from the transaction list.
- `src/components/customers/customer-form.tsx` — react-hook-form + zod, same shape as `transaction-form.tsx`.
- `src/components/customers/customer-photo-input.tsx` — file picker → compress → preview → remove.
- `src/components/customers/customer-dialog.tsx`, `empty-state.tsx`.
- `src/hooks/use-customers.ts` — mirrors `use-transactions.ts` (online-first with offline fallback, mutations that queue when offline).
- `DateInput` is currently a private helper inside `transaction-filters.tsx`. It moves to `src/components/ui/date-input.tsx` so both the filter bar and the customer form use one copy.
- Nav: `Customers` (Users icon) first, then Dashboard, then Settings, in both `sidebar.tsx` and `mobile-nav.tsx`. `app-shell.tsx` picks the dialog for the `+` FAB from `useLocation().pathname`.

No amount, currency, or totals anywhere in this section.

## Error handling

- Photo upload failure does not block saving the customer: the row saves, the blob stays local with `uploaded: false`, and the next sync retries.
- Sync retries up to the existing `MAX_RETRY_COUNT` (5); after that the row is marked `syncStatus: 'error'` and shows the existing error badge.
- Storage object delete failures are swallowed (logged only).
- Search runs against locally held rows, so it works offline.

## Testing

The repo has no test infrastructure (no vitest, no `test` script), and adding one is out of scope for this feature. Verification is:

1. `npm run build` (runs `tsc -b`) — must pass.
2. `npm run lint` — must pass.
3. Manual QA: add a customer online; add one offline and confirm it syncs with its photo when back online; search by IMEI and phone; edit; toggle status; delete; confirm no payment field appears anywhere in the section.

## Out of scope

Linking customers to transactions, multiple photos, customer CSV export, status/date filters, invoice or receipt printing.
